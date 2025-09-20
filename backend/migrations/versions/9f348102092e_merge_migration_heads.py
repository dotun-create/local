"""Merge migration heads

Revision ID: 9f348102092e
Revises: 410af0de3982, add_guardian_invitations
Create Date: 2025-09-04 16:09:53.374187

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9f348102092e'
down_revision = ('410af0de3982', 'add_guardian_invitations')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
