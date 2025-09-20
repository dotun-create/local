"""
Database Migration Endpoint
Temporary endpoint to run database migrations
"""

from flask import request, jsonify
from app import db
from app.api import api_bp
from sqlalchemy import text
import os
import logging

logger = logging.getLogger(__name__)

@api_bp.route('/run-migration', methods=['POST'])
def run_migration():
    """
    Run database migration to add missing columns.
    Protected by admin secret.
    """
    try:
        # Check admin secret
        admin_secret = request.headers.get('X-Admin-Secret')
        expected_secret = os.environ.get('ADMIN_SECRET', 'admin123')
        
        if not admin_secret or admin_secret != expected_secret:
            return jsonify({'error': 'Unauthorized'}), 401
        
        logger.info("Running database migration...")
        
        # Migration queries
        migration_results = []
        
        queries = [
            ("Add temp_password_hash column", """
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS temp_password_hash VARCHAR(255) DEFAULT NULL;
            """),
            ("Add temp_password_expires_at column", """
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMP DEFAULT NULL;
            """),
            ("Add force_password_change column", """
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;
            """),
            ("Add temp_password_created_by column", """
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS temp_password_created_by VARCHAR(50) DEFAULT NULL;
            """),
        ]
        
        for description, query in queries:
            try:
                db.session.execute(text(query))
                db.session.commit()
                migration_results.append({
                    'step': description,
                    'status': 'success'
                })
                logger.info(f"✓ {description}")
            except Exception as e:
                error_msg = str(e)
                if "already exists" in error_msg.lower():
                    migration_results.append({
                        'step': description,
                        'status': 'skipped',
                        'message': 'Column already exists'
                    })
                    logger.info(f"⚠ {description} - already exists")
                else:
                    migration_results.append({
                        'step': description,
                        'status': 'error',
                        'error': error_msg
                    })
                    logger.error(f"✗ {description} - {error_msg}")
                db.session.rollback()
        
        # Try to add foreign key constraint
        try:
            db.session.execute(text("""
                ALTER TABLE users
                ADD CONSTRAINT fk_temp_password_creator 
                FOREIGN KEY (temp_password_created_by) 
                REFERENCES users(id)
                ON DELETE SET NULL;
            """))
            db.session.commit()
            migration_results.append({
                'step': 'Add foreign key constraint',
                'status': 'success'
            })
        except Exception as e:
            if "already exists" in str(e).lower():
                migration_results.append({
                    'step': 'Add foreign key constraint',
                    'status': 'skipped',
                    'message': 'Constraint already exists'
                })
            else:
                migration_results.append({
                    'step': 'Add foreign key constraint',
                    'status': 'warning',
                    'message': str(e)
                })
            db.session.rollback()
        
        # Verify columns exist
        result = db.session.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name IN ('temp_password_hash', 'temp_password_expires_at', 
                               'force_password_change', 'temp_password_created_by')
            ORDER BY column_name;
        """))
        
        columns = [{'name': row[0], 'type': row[1]} for row in result]
        
        logger.info(f"Migration completed. Found {len(columns)} columns")
        
        return jsonify({
            'success': True,
            'message': 'Migration completed',
            'migration_results': migration_results,
            'verified_columns': columns,
            'columns_count': len(columns),
            'expected_count': 4
        }), 200
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        return jsonify({
            'error': 'Migration failed',
            'details': str(e)
        }), 500