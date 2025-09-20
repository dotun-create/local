#!/usr/bin/env python3
"""
Add auto_qualify column to course_settings table for enabling/disabling automatic tutor qualification
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from sqlalchemy import text

def add_auto_qualify_column():
    """Add auto_qualify column to course_settings table with safe default"""

    # Check if column already exists
    check_column_sql = """
    SELECT COUNT(*) as column_count
    FROM pragma_table_info('course_settings')
    WHERE name = 'auto_qualify';
    """

    # Add auto_qualify column with safe default
    add_column_sql = """
    ALTER TABLE course_settings
    ADD COLUMN auto_qualify BOOLEAN NOT NULL DEFAULT 1;
    """

    # Verify all existing records have the new field set to True (1)
    verify_records_sql = """
    UPDATE course_settings
    SET auto_qualify = 1
    WHERE auto_qualify IS NULL;
    """

    try:
        app = create_app()
        with app.app_context():
            # Check if column already exists
            result = db.session.execute(text(check_column_sql)).fetchone()

            if result[0] > 0:
                print("✅ auto_qualify column already exists in course_settings table")
                return

            print("🔧 Adding auto_qualify column to course_settings table...")

            # Add the column
            db.session.execute(text(add_column_sql))

            # Ensure all existing records have auto_qualify = True
            print("📝 Setting auto_qualify = True for all existing course settings...")
            db.session.execute(text(verify_records_sql))

            db.session.commit()

            # Verify the column was added successfully
            verify_sql = """
            SELECT COUNT(*) as total_records,
                   COUNT(CASE WHEN auto_qualify = 1 THEN 1 END) as auto_qualify_true
            FROM course_settings;
            """

            result = db.session.execute(text(verify_sql)).fetchone()
            total_records = result[0]
            auto_qualify_true = result[1]

            print(f"✅ Migration completed successfully!")
            print(f"   - Total course settings: {total_records}")
            print(f"   - Records with auto_qualify=True: {auto_qualify_true}")

            if total_records != auto_qualify_true:
                raise Exception(f"Migration validation failed: Expected {total_records} records with auto_qualify=True, got {auto_qualify_true}")

            print("✅ All existing course settings now have auto_qualify enabled by default")

    except Exception as e:
        print(f"❌ Error adding auto_qualify column: {str(e)}")
        db.session.rollback()
        raise

def rollback_auto_qualify_column():
    """Rollback: Remove auto_qualify column from course_settings table"""

    # SQLite doesn't support DROP COLUMN, so we need to recreate the table
    rollback_sql = """
    BEGIN TRANSACTION;

    -- Create backup table without auto_qualify column
    CREATE TABLE course_settings_backup AS
    SELECT id, course_id, min_score_to_tutor, auto_approve_tutors,
           manual_approval_required, allow_student_tutors,
           max_attempts_before_tutor_eligible, created_by, updated_by,
           created_at, updated_at
    FROM course_settings;

    -- Drop original table
    DROP TABLE course_settings;

    -- Recreate table without auto_qualify
    CREATE TABLE course_settings (
        id VARCHAR(50) PRIMARY KEY,
        course_id VARCHAR(50) NOT NULL,
        min_score_to_tutor REAL DEFAULT 85.0,
        auto_approve_tutors BOOLEAN DEFAULT 1,
        manual_approval_required BOOLEAN DEFAULT 0,
        allow_student_tutors BOOLEAN DEFAULT 1,
        max_attempts_before_tutor_eligible INTEGER DEFAULT 1,
        created_by VARCHAR(50),
        updated_by VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses (id),
        FOREIGN KEY (created_by) REFERENCES users (id),
        FOREIGN KEY (updated_by) REFERENCES users (id)
    );

    -- Restore data from backup
    INSERT INTO course_settings
    SELECT * FROM course_settings_backup;

    -- Drop backup table
    DROP TABLE course_settings_backup;

    COMMIT;
    """

    try:
        app = create_app()
        with app.app_context():
            print("🔄 Rolling back auto_qualify column from course_settings table...")
            db.session.execute(text(rollback_sql))
            db.session.commit()
            print("✅ Rollback completed successfully!")

    except Exception as e:
        print(f"❌ Error during rollback: {str(e)}")
        db.session.rollback()
        raise

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Manage auto_qualify column migration')
    parser.add_argument('--rollback', action='store_true', help='Rollback the migration')
    args = parser.parse_args()

    if args.rollback:
        rollback_auto_qualify_column()
    else:
        add_auto_qualify_column()