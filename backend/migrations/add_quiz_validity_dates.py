"""Add validity dates to Quiz model

This migration adds valid_from and valid_until columns to the quizzes table
to support time-based visibility control.
"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime

def upgrade():
    """Add valid_from and valid_until columns to quizzes table"""
    
    # Add valid_from column with default value of current timestamp
    op.add_column('quizzes', 
        sa.Column('valid_from', sa.DateTime(), nullable=True, default=datetime.utcnow)
    )
    
    # Add valid_until column (nullable, no default)
    op.add_column('quizzes', 
        sa.Column('valid_until', sa.DateTime(), nullable=True)
    )
    
    # Update existing quizzes to have valid_from as their created_at date
    op.execute("""
        UPDATE quizzes 
        SET valid_from = created_at 
        WHERE valid_from IS NULL
    """)

def downgrade():
    """Remove valid_from and valid_until columns from quizzes table"""
    op.drop_column('quizzes', 'valid_until')
    op.drop_column('quizzes', 'valid_from')