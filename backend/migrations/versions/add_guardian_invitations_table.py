"""Add guardian invitations table

Revision ID: add_guardian_invitations
Revises: 
Create Date: 2025-08-16 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_guardian_invitations'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    """Add guardian_invitations table"""
    op.create_table('guardian_invitations',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('student_id', sa.String(length=50), nullable=False),
        sa.Column('guardian_email', sa.String(length=120), nullable=False),
        sa.Column('invitation_token', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=True),
        sa.Column('invited_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('guardian_id', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['guardian_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('invitation_token')
    )
    op.create_index(op.f('ix_guardian_invitations_guardian_email'), 'guardian_invitations', ['guardian_email'], unique=False)
    op.create_index(op.f('ix_guardian_invitations_invitation_token'), 'guardian_invitations', ['invitation_token'], unique=False)

def downgrade():
    """Remove guardian_invitations table"""
    op.drop_index(op.f('ix_guardian_invitations_invitation_token'), table_name='guardian_invitations')
    op.drop_index(op.f('ix_guardian_invitations_guardian_email'), table_name='guardian_invitations')
    op.drop_table('guardian_invitations')