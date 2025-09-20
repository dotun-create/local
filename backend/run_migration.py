#!/usr/bin/env python
"""
Run database migration to add validity dates to Quiz model
"""

import sqlite3
import os
from datetime import datetime

def run_migration():
    """Execute the migration to add validity date columns"""
    
    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'orms.db')
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return False
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(quizzes)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'valid_from' in columns and 'valid_until' in columns:
            print("Migration already applied - columns exist")
            return True
        
        # Add valid_from column
        if 'valid_from' not in columns:
            cursor.execute("""
                ALTER TABLE quizzes 
                ADD COLUMN valid_from DATETIME
            """)
            print("Added valid_from column")
        
        # Add valid_until column  
        if 'valid_until' not in columns:
            cursor.execute("""
                ALTER TABLE quizzes 
                ADD COLUMN valid_until DATETIME
            """)
            print("Added valid_until column")
        
        # Update existing quizzes to have valid_from as their created_at date
        cursor.execute("""
            UPDATE quizzes 
            SET valid_from = created_at 
            WHERE valid_from IS NULL
        """)
        
        # Commit changes
        conn.commit()
        print("Migration completed successfully!")
        
        # Verify
        cursor.execute("PRAGMA table_info(quizzes)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"Current columns: {columns}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"Migration failed: {e}")
        if conn:
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    run_migration()