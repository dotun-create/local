#!/usr/bin/env python3
"""
Migration: Add timezone field to Course table

This migration adds a timezone column to the courses table.
All existing courses will be set to 'UTC' by default.
"""

from app import create_app, db
from sqlalchemy import text

def run_migration():
    """Add timezone column to courses table"""
    app = create_app()
    
    with app.app_context():
        try:
            # Check if column already exists
            result = db.engine.execute(text(
                "SELECT COUNT(*) as count FROM pragma_table_info('courses') WHERE name='timezone'"
            )).fetchone()
            
            if result[0] == 0:
                # Column doesn't exist, add it
                print("Adding timezone column to courses table...")
                db.engine.execute(text(
                    "ALTER TABLE courses ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC'"
                ))
                
                # Update all existing courses to have UTC timezone
                db.engine.execute(text(
                    "UPDATE courses SET timezone = 'UTC' WHERE timezone IS NULL"
                ))
                
                print("✅ Successfully added timezone column to courses table")
                print("✅ All existing courses set to UTC timezone")
            else:
                print("⚠️ Timezone column already exists in courses table")
                
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == '__main__':
    run_migration()