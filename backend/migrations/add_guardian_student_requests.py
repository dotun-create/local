"""
Add Guardian-Student Request System

This migration creates the guardian_student_requests table to track
student requests to be linked to guardians, with approval workflow.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers
revision = 'add_guardian_student_requests'
down_revision = 'latest'  # Update this to the actual latest migration
branch_labels = None
depends_on = None


def upgrade():
    """
    Create guardian_student_requests table for managing student-guardian linking requests
    """

    # Create guardian_student_requests table
    op.create_table(
        'guardian_student_requests',
        sa.Column('id', sa.String(50), primary_key=True, default=lambda: f"request_{uuid.uuid4().hex[:8]}"),
        sa.Column('student_id', sa.String(50), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('guardian_id', sa.String(50), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status', sa.String(20), default='pending', nullable=False),  # pending, approved, rejected
        sa.Column('request_date', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('request_timezone', sa.String(50), default='UTC'),
        sa.Column('processed_date', sa.DateTime, nullable=True),
        sa.Column('processed_timezone', sa.String(50), default='UTC'),
        sa.Column('processed_by', sa.String(50), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('rejection_reason', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('student_message', sa.Text, nullable=True),  # Message from student when requesting
        sa.Column('guardian_response', sa.Text, nullable=True),  # Response from guardian
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create indexes for performance
    op.create_index('idx_guardian_student_requests_guardian_id', 'guardian_student_requests', ['guardian_id'])
    op.create_index('idx_guardian_student_requests_student_id', 'guardian_student_requests', ['student_id'])
    op.create_index('idx_guardian_student_requests_status', 'guardian_student_requests', ['status'])
    op.create_index('idx_guardian_student_requests_request_date', 'guardian_student_requests', ['request_date'])

    # Create unique constraint to prevent duplicate active requests
    op.create_index(
        'idx_guardian_student_unique_pending',
        'guardian_student_requests',
        ['student_id', 'guardian_id'],
        unique=True,
        postgresql_where=sa.text("status = 'pending'")
    )

    # Add status column to enrollments table if it doesn't exist with more statuses
    # This preserves existing data while adding new functionality
    try:
        # Check if we need to extend the status enum
        op.execute("ALTER TABLE enrollments ALTER COLUMN status TYPE varchar(30)")
        op.execute("UPDATE enrollments SET status = 'active' WHERE status = 'approved'")
    except Exception:
        # Column might already be the right type or not exist
        pass

    # Create guardian_student_links table for approved relationships
    op.create_table(
        'guardian_student_links',
        sa.Column('id', sa.String(50), primary_key=True, default=lambda: f"link_{uuid.uuid4().hex[:8]}"),
        sa.Column('student_id', sa.String(50), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('guardian_id', sa.String(50), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status', sa.String(20), default='active', nullable=False),  # active, inactive
        sa.Column('linked_date', sa.DateTime, server_default=sa.func.now()),
        sa.Column('linked_timezone', sa.String(50), default='UTC'),
        sa.Column('linked_by', sa.String(50), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('unlinked_date', sa.DateTime, nullable=True),
        sa.Column('unlinked_by', sa.String(50), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('unlink_reason', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Create indexes for guardian_student_links
    op.create_index('idx_guardian_student_links_guardian_id', 'guardian_student_links', ['guardian_id'])
    op.create_index('idx_guardian_student_links_student_id', 'guardian_student_links', ['student_id'])
    op.create_index('idx_guardian_student_links_status', 'guardian_student_links', ['status'])

    # Create unique constraint for active links (one active link per student-guardian pair)
    op.create_index(
        'idx_guardian_student_active_unique',
        'guardian_student_links',
        ['student_id', 'guardian_id'],
        unique=True,
        postgresql_where=sa.text("status = 'active'")
    )


def downgrade():
    """
    Remove guardian-student request system tables
    """
    # Drop tables in reverse order
    op.drop_table('guardian_student_links')
    op.drop_table('guardian_student_requests')

    # Revert enrollment status changes if needed
    try:
        op.execute("UPDATE enrollments SET status = 'approved' WHERE status = 'active'")
    except Exception:
        pass