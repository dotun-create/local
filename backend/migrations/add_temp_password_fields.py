#!/usr/bin/env python3
"""
Migration script to add temporary password fields to users table
Run this to update the production database schema
"""

import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def add_temp_password_columns():
    """Add missing temporary password columns to users table"""
    
    app = create_app()
    
    with app.app_context():
        try:
            print("Adding temporary password columns to users table...")
            
            # Add columns if they don't exist
            migration_queries = [
                """
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS temp_password_hash VARCHAR(255) DEFAULT NULL;
                """,
                """
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMP DEFAULT NULL;
                """,
                """
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT FALSE;
                """,
                """
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS temp_password_created_by VARCHAR(50) DEFAULT NULL;
                """,
                """
                ALTER TABLE users
                ADD CONSTRAINT fk_temp_password_creator 
                FOREIGN KEY (temp_password_created_by) 
                REFERENCES users(id)
                ON DELETE SET NULL;
                """
            ]
            
            for query in migration_queries:
                try:
                    db.session.execute(text(query))
                    db.session.commit()
                    print(f"✓ Executed: {query[:50]}...")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        print(f"⚠ Column/constraint already exists, skipping...")
                        db.session.rollback()
                    else:
                        print(f"✗ Error: {e}")
                        db.session.rollback()
            
            # Verify columns exist
            print("\nVerifying columns...")
            result = db.session.execute(text("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'users'
                AND column_name IN ('temp_password_hash', 'temp_password_expires_at', 
                                   'force_password_change', 'temp_password_created_by')
                ORDER BY column_name;
            """))
            
            columns = result.fetchall()
            if columns:
                print("✅ Found columns:")
                for col in columns:
                    print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")
            else:
                print("❌ No temporary password columns found!")
                
            print("\n✅ Migration completed successfully!")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == "__main__":
    add_temp_password_columns()