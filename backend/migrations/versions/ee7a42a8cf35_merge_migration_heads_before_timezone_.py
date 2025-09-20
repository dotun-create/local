"""Merge migration heads before timezone implementation

Revision ID: ee7a42a8cf35
Revises: ae45f89c12d3, add_availability_indexes, ea557514914b
Create Date: 2025-09-17 08:54:55.222828

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ee7a42a8cf35'
down_revision = ('ae45f89c12d3', 'add_availability_indexes', 'ea557514914b')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
