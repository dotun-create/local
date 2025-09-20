"""Add indexes for availability and sessions optimization

Revision ID: add_availability_indexes
Revises:
Create Date: 2024-09-16 18:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_availability_indexes'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    """Add indexes for performance optimization"""

    # Availability table indexes
    try:
        op.create_index('idx_availability_tutor_id', 'availability', ['tutor_id'])
    except Exception:
        pass  # Index might already exist

    try:
        op.create_index('idx_availability_course_id', 'availability', ['course_id'])
    except Exception:
        pass

    try:
        op.create_index('idx_availability_day_of_week', 'availability', ['day_of_week'])
    except Exception:
        pass

    try:
        op.create_index('idx_availability_specific_date', 'availability', ['specific_date'])
    except Exception:
        pass

    try:
        op.create_index('idx_availability_start_time', 'availability', ['start_time'])
    except Exception:
        pass

    try:
        op.create_index('idx_availability_tutor_course', 'availability', ['tutor_id', 'course_id'])
    except Exception:
        pass

    try:
        op.create_index('idx_availability_tutor_day', 'availability', ['tutor_id', 'day_of_week'])
    except Exception:
        pass

    # Sessions table indexes
    try:
        op.create_index('idx_sessions_tutor_id', 'sessions', ['tutor_id'])
    except Exception:
        pass

    try:
        op.create_index('idx_sessions_course_id', 'sessions', ['course_id'])
    except Exception:
        pass

    try:
        op.create_index('idx_sessions_status', 'sessions', ['status'])
    except Exception:
        pass

    try:
        op.create_index('idx_sessions_scheduled_date', 'sessions', ['scheduled_date'])
    except Exception:
        pass

    try:
        op.create_index('idx_sessions_tutor_status', 'sessions', ['tutor_id', 'status'])
    except Exception:
        pass

    try:
        op.create_index('idx_sessions_course_status', 'sessions', ['course_id', 'status'])
    except Exception:
        pass

def downgrade():
    """Remove the indexes"""

    # Remove availability indexes
    try:
        op.drop_index('idx_availability_tutor_id', table_name='availability')
    except Exception:
        pass

    try:
        op.drop_index('idx_availability_course_id', table_name='availability')
    except Exception:
        pass

    try:
        op.drop_index('idx_availability_day_of_week', table_name='availability')
    except Exception:
        pass

    try:
        op.drop_index('idx_availability_specific_date', table_name='availability')
    except Exception:
        pass

    try:
        op.drop_index('idx_availability_start_time', table_name='availability')
    except Exception:
        pass

    try:
        op.drop_index('idx_availability_tutor_course', table_name='availability')
    except Exception:
        pass

    try:
        op.drop_index('idx_availability_tutor_day', table_name='availability')
    except Exception:
        pass

    # Remove sessions indexes
    try:
        op.drop_index('idx_sessions_tutor_id', table_name='sessions')
    except Exception:
        pass

    try:
        op.drop_index('idx_sessions_course_id', table_name='sessions')
    except Exception:
        pass

    try:
        op.drop_index('idx_sessions_status', table_name='sessions')
    except Exception:
        pass

    try:
        op.drop_index('idx_sessions_scheduled_date', table_name='sessions')
    except Exception:
        pass

    try:
        op.drop_index('idx_sessions_tutor_status', table_name='sessions')
    except Exception:
        pass

    try:
        op.drop_index('idx_sessions_course_status', table_name='sessions')
    except Exception:
        pass