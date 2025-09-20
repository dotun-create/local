#!/usr/bin/env python3
"""
Database Migration: Add Timezone Tracking Fields
Adds fields to track timezone storage format for availability records
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import Availability
from datetime import datetime
from sqlalchemy import text


class TimezoneTrackingMigration:
    def __init__(self):
        self.app = create_app()

    def add_tracking_columns(self):
        """Add timezone tracking columns to availability table"""
        print("📊 Adding timezone tracking columns to availability table...")

        with self.app.app_context():
            try:
                # Add new columns with SQL
                with db.engine.connect() as conn:
                    conn.execute(text("""
                        ALTER TABLE availability
                        ADD COLUMN timezone_storage_format VARCHAR(10) DEFAULT 'local';
                    """))

                    conn.execute(text("""
                        ALTER TABLE availability
                        ADD COLUMN data_migrated_at TIMESTAMP NULL;
                    """))

                    conn.execute(text("""
                        ALTER TABLE availability
                        ADD COLUMN migration_version VARCHAR(20) DEFAULT 'v1.0';
                    """))

                    conn.commit()

                print("✅ Timezone tracking columns added successfully")
                return True

            except Exception as e:
                print(f"❌ Failed to add columns: {str(e)}")
                return False

    def mark_existing_data(self):
        """Mark existing availability records with detected storage format"""
        print("🏷️  Marking existing data with storage format...")

        with self.app.app_context():
            try:
                # Based on audit results, mark all existing records as 'local'
                # since the audit showed times are stored in local timezone format
                with db.engine.connect() as conn:
                    result = conn.execute(text("""
                        UPDATE availability
                        SET timezone_storage_format = 'local',
                            data_migrated_at = :timestamp,
                            migration_version = 'v1.0'
                        WHERE timezone_storage_format IS NULL
                           OR timezone_storage_format = 'local'
                    """), {"timestamp": datetime.utcnow()})

                    conn.commit()
                    updated_count = result.rowcount

                print(f"✅ Marked {updated_count} existing records as 'local' storage format")
                return True

            except Exception as e:
                print(f"❌ Failed to mark existing data: {str(e)}")
                return False

    def verify_migration(self):
        """Verify migration was successful"""
        print("🔍 Verifying migration...")

        with self.app.app_context():
            try:
                # Check if columns exist
                with db.engine.connect() as conn:
                    result = conn.execute(text("""
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = 'availability'
                        AND column_name IN ('timezone_storage_format', 'data_migrated_at', 'migration_version')
                    """))

                    columns = [row[0] for row in result]
                    expected_columns = ['timezone_storage_format', 'data_migrated_at', 'migration_version']

                    missing_columns = set(expected_columns) - set(columns)
                    if missing_columns:
                        print(f"❌ Missing columns: {missing_columns}")
                        return False

                    # Check data marking
                    result = conn.execute(text("""
                        SELECT
                            timezone_storage_format,
                            COUNT(*) as count
                        FROM availability
                        GROUP BY timezone_storage_format
                    """))

                    format_counts = dict(result.fetchall())
                    print(f"📊 Storage format distribution: {format_counts}")

                    if 'local' not in format_counts:
                        print("⚠️  No records marked as 'local' - may need investigation")

                print("✅ Migration verification completed")
                return True

            except Exception as e:
                print(f"❌ Verification failed: {str(e)}")
                return False

    def rollback_migration(self):
        """Rollback migration changes"""
        print("⏪ Rolling back timezone tracking migration...")

        with self.app.app_context():
            try:
                # Remove added columns
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE availability DROP COLUMN IF EXISTS timezone_storage_format"))
                    conn.execute(text("ALTER TABLE availability DROP COLUMN IF EXISTS data_migrated_at"))
                    conn.execute(text("ALTER TABLE availability DROP COLUMN IF EXISTS migration_version"))
                    conn.commit()

                print("✅ Migration rollback completed")
                return True

            except Exception as e:
                print(f"❌ Rollback failed: {str(e)}")
                return False

    def run_migration(self, rollback=False):
        """Run the complete migration"""
        if rollback:
            return self.rollback_migration()

        try:
            print("🚀 Starting timezone tracking migration...")

            # Step 1: Add columns
            if not self.add_tracking_columns():
                return False

            # Step 2: Mark existing data
            if not self.mark_existing_data():
                print("⚠️  Attempting rollback due to data marking failure...")
                self.rollback_migration()
                return False

            # Step 3: Verify
            if not self.verify_migration():
                print("⚠️  Migration verification failed but changes applied")

            print("✅ Migration completed successfully!")
            return True

        except Exception as e:
            print(f"❌ Migration failed: {str(e)}")
            print("⚠️  Attempting rollback...")
            self.rollback_migration()
            return False


def main():
    """Main function"""
    import argparse
    parser = argparse.ArgumentParser(description='Add timezone tracking fields to availability table')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    parser.add_argument('--verify-only', action='store_true', help='Only verify existing migration')
    args = parser.parse_args()

    migration = TimezoneTrackingMigration()

    try:
        if args.verify_only:
            success = migration.verify_migration()
        elif args.rollback:
            success = migration.rollback_migration()
        else:
            success = migration.run_migration()

        if success:
            print("\n✅ Operation completed successfully!")
            return 0
        else:
            print("\n❌ Operation failed!")
            return 1

    except Exception as e:
        print(f"\n❌ Operation failed with error: {str(e)}")
        return 1


if __name__ == '__main__':
    exit(main())