#!/usr/bin/env python3
"""
Database migration to add original_timezone field to availability table.
This migration supports the timezone standardization effort where all times
are stored in UTC but we track the user's original timezone for reference.

Usage:
    python migrations/add_original_timezone_field.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def run_migration():
    """Add original_timezone field to availability table"""
    app = create_app()

    with app.app_context():
        try:
            print("🔧 Starting migration: Add original_timezone field to availability table")

            # Check if column already exists (SQLite compatible)
            result = db.session.execute(text("""
                PRAGMA table_info(availability)
            """))

            columns = [row[1] for row in result.fetchall()]
            if 'original_timezone' in columns:
                print("✅ Column 'original_timezone' already exists. Migration skipped.")
                return

            # Add the new column
            print("📝 Adding original_timezone column...")
            db.session.execute(text("""
                ALTER TABLE availability
                ADD COLUMN original_timezone VARCHAR(50)
            """))

            # Update existing records to copy time_zone to original_timezone for reference
            print("📝 Updating existing records...")
            result = db.session.execute(text("""
                UPDATE availability
                SET original_timezone = time_zone
                WHERE original_timezone IS NULL
            """))

            print(f"📝 Updated {result.rowcount} existing records")

            # Commit the changes
            db.session.commit()
            print("✅ Migration completed successfully!")

            # Show summary
            total_records = db.session.execute(text("SELECT COUNT(*) FROM availability")).scalar()
            print(f"📊 Total availability records: {total_records}")

        except Exception as e:
            print(f"❌ Migration failed: {str(e)}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    run_migration()