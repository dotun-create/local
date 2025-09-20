"""
Database migration for recurring availability features

This migration adds fields to support recurring availability:
- Recurring flags and configuration
- Parent/child relationships for recurring series
- Exception dates and specific date instances
- Editability tracking

Run this migration after updating the Availability model.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db

def upgrade():
    """Add recurring availability fields to existing availability table"""
    app = create_app()
    
    with app.app_context():
        try:
            with db.engine.connect() as conn:
                # Add recurring availability fields
                conn.execute(db.text("""
                    ALTER TABLE availability 
                    ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE
                """))
                
                conn.execute(db.text("""
                    ALTER TABLE availability 
                    ADD COLUMN recurrence_type VARCHAR(20) DEFAULT 'weekly'
                """))
                
                conn.execute(db.text("""
                    ALTER TABLE availability 
                    ADD COLUMN recurrence_days TEXT
                """))
                
                conn.execute(db.text("""
                    ALTER TABLE availability 
                    ADD COLUMN recurrence_end_date DATETIME
                """))
                
                conn.execute(db.text("""
                    ALTER TABLE availability 
                    ADD COLUMN parent_availability_id VARCHAR(50)
                """))
                
                conn.execute(db.text("""
                    ALTER TABLE availability 
                    ADD COLUMN exception_dates TEXT
                """))
                
                conn.execute(db.text("""
                    ALTER TABLE availability 
                    ADD COLUMN specific_date DATE
                """))
                
                conn.execute(db.text("""
                    ALTER TABLE availability 
                    ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                """))
                
                conn.execute(db.text("""
                    ALTER TABLE availability 
                    ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                """))
                
                # Add foreign key constraint for parent_availability_id
                try:
                    conn.execute(db.text("""
                        ALTER TABLE availability 
                        ADD CONSTRAINT fk_availability_parent 
                        FOREIGN KEY (parent_availability_id) REFERENCES availability(id)
                    """))
                except Exception as e:
                    print(f"⚠️  Foreign key constraint may already exist: {e}")
                
                # Add indexes for performance
                conn.execute(db.text("""
                    CREATE INDEX IF NOT EXISTS idx_availability_tutor_date 
                    ON availability(tutor_id, specific_date)
                """))
                
                conn.execute(db.text("""
                    CREATE INDEX IF NOT EXISTS idx_availability_recurring 
                    ON availability(is_recurring, parent_availability_id)
                """))
                
                conn.execute(db.text("""
                    CREATE INDEX IF NOT EXISTS idx_availability_day_time 
                    ON availability(day_of_week, start_time, end_time)
                """))
                
                conn.commit()
            
            print("✅ Recurring availability fields added successfully")
            print("✅ Performance indexes created")
            
        except Exception as e:
            print(f"❌ Error adding recurring availability fields: {e}")
            raise

def downgrade():
    """Remove recurring availability fields"""
    app = create_app()
    
    with app.app_context():
        try:
            with db.engine.connect() as conn:
                # Drop indexes
                conn.execute(db.text("DROP INDEX IF EXISTS idx_availability_tutor_date"))
                conn.execute(db.text("DROP INDEX IF EXISTS idx_availability_recurring"))
                conn.execute(db.text("DROP INDEX IF EXISTS idx_availability_day_time"))
                
                # Drop foreign key constraint (SQLite doesn't support dropping constraints directly)
                print("⚠️  SQLite doesn't support dropping foreign key constraints directly")
                
                # Drop columns (SQLite doesn't support dropping columns directly)
                print("⚠️  SQLite doesn't support dropping columns - recurring fields will remain")
                
                conn.commit()
                
        except Exception as e:
            print(f"❌ Error in downgrade: {e}")

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'downgrade':
        print("🔄 Running downgrade migration...")
        downgrade()
    else:
        print("🔄 Running upgrade migration...")
        upgrade()
    
    print("✅ Migration completed!")