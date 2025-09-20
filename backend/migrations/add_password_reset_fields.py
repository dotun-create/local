#!/usr/bin/env python3
"""
Migration to add password reset fields to users table
"""

import sys
import os

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app import create_app, db
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def upgrade():
    """Add password reset fields to users table"""
    app = create_app()
    
    with app.app_context():
        try:
            # Check if columns already exist
            result = db.session.execute(text("PRAGMA table_info(users)"))
            columns = [row[1] for row in result.fetchall()]
            
            changes_made = False
            
            # Add reset_token column if it doesn't exist
            if 'reset_token' not in columns:
                logger.info("Adding reset_token column to users table")
                db.session.execute(text("ALTER TABLE users ADD COLUMN reset_token VARCHAR(64)"))
                changes_made = True
            else:
                logger.info("reset_token column already exists")
            
            # Add reset_token_expires column if it doesn't exist
            if 'reset_token_expires' not in columns:
                logger.info("Adding reset_token_expires column to users table")
                db.session.execute(text("ALTER TABLE users ADD COLUMN reset_token_expires DATETIME"))
                changes_made = True
            else:
                logger.info("reset_token_expires column already exists")
            
            if changes_made:
                db.session.commit()
                logger.info("✅ Password reset fields migration completed successfully!")
            else:
                logger.info("✅ All password reset fields already exist. No changes needed.")
                
        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ Migration failed: {str(e)}")
            raise

def downgrade():
    """Remove password reset fields from users table"""
    app = create_app()
    
    with app.app_context():
        try:
            # Note: SQLite doesn't support DROP COLUMN directly
            # In a production environment with PostgreSQL/MySQL, you would use:
            # db.session.execute(text("ALTER TABLE users DROP COLUMN reset_token"))
            # db.session.execute(text("ALTER TABLE users DROP COLUMN reset_token_expires"))
            
            logger.info("⚠️ Downgrade not implemented for SQLite (DROP COLUMN not supported)")
            logger.info("To remove columns, you would need to recreate the table")
                
        except Exception as e:
            db.session.rollback()
            logger.error(f"❌ Downgrade failed: {str(e)}")
            raise

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Password reset fields migration')
    parser.add_argument('--downgrade', action='store_true', help='Downgrade the migration')
    
    args = parser.parse_args()
    
    if args.downgrade:
        downgrade()
    else:
        upgrade()