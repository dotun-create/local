"""
Migrate Existing Guardian-Student Relationships

This migration converts all existing guardian-student relationships from the enrollments table
to the new guardian_student_links table with 'active' status to preserve existing data.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
import uuid

# revision identifiers
revision = 'migrate_existing_guardian_relationships'
down_revision = 'add_guardian_student_requests'
branch_labels = None
depends_on = None


def upgrade():
    """
    Migrate existing guardian-student relationships from enrollments to guardian_student_links
    """

    # Create connection for data migration
    connection = op.get_bind()

    # First, create active guardian-student links from existing enrollments
    # This preserves all current guardian-student relationships
    migration_query = text("""
        INSERT INTO guardian_student_links (
            id,
            student_id,
            guardian_id,
            status,
            linked_date,
            linked_timezone,
            linked_by,
            created_at,
            updated_at
        )
        SELECT DISTINCT
            'link_' || substr(md5(random()::text), 1, 8) as id,
            e.student_id,
            e.guardian_id,
            'active' as status,
            COALESCE(e.approved_date, e.enrolled_date, NOW()) as linked_date,
            COALESCE(e.approved_timezone, e.enrolled_timezone, 'UTC') as linked_timezone,
            e.guardian_id as linked_by,  -- Guardian is the one who originally approved
            NOW() as created_at,
            NOW() as updated_at
        FROM enrollments e
        WHERE e.guardian_id IS NOT NULL
        AND NOT EXISTS (
            -- Prevent duplicate links
            SELECT 1 FROM guardian_student_links gsl
            WHERE gsl.student_id = e.student_id
            AND gsl.guardian_id = e.guardian_id
            AND gsl.status = 'active'
        )
    """)

    try:
        result = connection.execute(migration_query)
        print(f"Successfully migrated {result.rowcount} guardian-student relationships to active links")

        # Update enrollment status to reflect the new system
        update_enrollments_query = text("""
            UPDATE enrollments
            SET status = CASE
                WHEN status = 'approved' AND guardian_id IS NOT NULL THEN 'active'
                WHEN status = 'pending' AND guardian_id IS NOT NULL THEN 'guardian_approved'
                ELSE status
            END
            WHERE guardian_id IS NOT NULL
        """)

        update_result = connection.execute(update_enrollments_query)
        print(f"Updated {update_result.rowcount} enrollment statuses")

        # Create summary report
        summary_query = text("""
            SELECT
                COUNT(*) as total_links,
                COUNT(DISTINCT student_id) as unique_students,
                COUNT(DISTINCT guardian_id) as unique_guardians
            FROM guardian_student_links
            WHERE status = 'active'
        """)

        summary = connection.execute(summary_query).fetchone()
        print(f"Migration Summary:")
        print(f"  - Total active guardian-student links: {summary[0]}")
        print(f"  - Unique students with guardians: {summary[1]}")
        print(f"  - Unique guardians: {summary[2]}")

    except Exception as e:
        print(f"Error during migration: {str(e)}")
        raise


def downgrade():
    """
    Revert guardian-student relationship migration
    """

    connection = op.get_bind()

    try:
        # Remove migrated links (keep any new ones created after migration)
        # Only remove links that match existing enrollments
        delete_query = text("""
            DELETE FROM guardian_student_links gsl
            WHERE EXISTS (
                SELECT 1 FROM enrollments e
                WHERE e.student_id = gsl.student_id
                AND e.guardian_id = gsl.guardian_id
                AND gsl.linked_date <= NOW()  -- Only remove pre-existing relationships
            )
        """)

        result = connection.execute(delete_query)
        print(f"Removed {result.rowcount} migrated guardian-student links")

        # Revert enrollment statuses
        revert_enrollments_query = text("""
            UPDATE enrollments
            SET status = CASE
                WHEN status = 'active' THEN 'approved'
                WHEN status = 'guardian_approved' THEN 'pending'
                ELSE status
            END
            WHERE guardian_id IS NOT NULL
        """)

        revert_result = connection.execute(revert_enrollments_query)
        print(f"Reverted {revert_result.rowcount} enrollment statuses")

    except Exception as e:
        print(f"Error during rollback: {str(e)}")
        raise