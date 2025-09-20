#!/usr/bin/env python3
"""
Script to add database indexes for performance optimization
"""

from app import create_app, db
import sqlalchemy as sa

def add_indexes():
    """Add performance indexes to the database"""
    app = create_app()

    with app.app_context():
        try:
            # Get the database engine
            engine = db.engine

            # Define indexes to create
            indexes = [
                # Availability table indexes
                "CREATE INDEX IF NOT EXISTS idx_availability_tutor_id ON availability(tutor_id)",
                "CREATE INDEX IF NOT EXISTS idx_availability_course_id ON availability(course_id)",
                "CREATE INDEX IF NOT EXISTS idx_availability_day_of_week ON availability(day_of_week)",
                "CREATE INDEX IF NOT EXISTS idx_availability_specific_date ON availability(specific_date)",
                "CREATE INDEX IF NOT EXISTS idx_availability_start_time ON availability(start_time)",
                "CREATE INDEX IF NOT EXISTS idx_availability_tutor_course ON availability(tutor_id, course_id)",
                "CREATE INDEX IF NOT EXISTS idx_availability_tutor_day ON availability(tutor_id, day_of_week)",

                # Sessions table indexes
                "CREATE INDEX IF NOT EXISTS idx_sessions_tutor_id ON sessions(tutor_id)",
                "CREATE INDEX IF NOT EXISTS idx_sessions_course_id ON sessions(course_id)",
                "CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status)",
                "CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_date ON sessions(scheduled_date)",
                "CREATE INDEX IF NOT EXISTS idx_sessions_tutor_status ON sessions(tutor_id, status)",
                "CREATE INDEX IF NOT EXISTS idx_sessions_course_status ON sessions(course_id, status)",

                # Users table indexes for performance
                "CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type)",
                "CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)",
                "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",

                # Enrollments table indexes
                "CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id)",
                "CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id)",
                "CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status)",
            ]

            created_count = 0
            failed_count = 0

            for index_sql in indexes:
                try:
                    with engine.connect() as conn:
                        conn.execute(sa.text(index_sql))
                        conn.commit()
                    created_count += 1
                    print(f"✓ Created index: {index_sql.split('idx_')[1].split(' ')[0] if 'idx_' in index_sql else 'unknown'}")
                except Exception as e:
                    failed_count += 1
                    print(f"✗ Failed to create index: {str(e)}")

            print(f"\nSummary:")
            print(f"✓ Successfully created: {created_count} indexes")
            print(f"✗ Failed to create: {failed_count} indexes")

            # Verify tables exist
            print(f"\nVerifying tables...")
            with engine.connect() as conn:
                result = conn.execute(sa.text("SELECT name FROM sqlite_master WHERE type='table'"))
                tables = [row[0] for row in result]
                print(f"Available tables: {', '.join(tables)}")

                if 'availability' in tables:
                    print("✓ Availability table exists")
                else:
                    print("✗ Availability table not found")

                if 'sessions' in tables:
                    print("✓ Sessions table exists")
                else:
                    print("✗ Sessions table not found")

        except Exception as e:
            print(f"Error: {str(e)}")
            return False

    return True

if __name__ == "__main__":
    print("Adding database indexes for performance optimization...")
    success = add_indexes()
    if success:
        print("Database optimization completed successfully!")
    else:
        print("Database optimization failed!")