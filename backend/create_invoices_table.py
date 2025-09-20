#!/usr/bin/env python3
"""
Create invoices table in the correct database
"""

import sqlite3
import os

def create_invoices_table():
    # Use the correct database path
    db_path = os.path.join(os.path.dirname(__file__), 'orms_troupe.db')
    
    print(f"Creating invoices table in database: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if invoices table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='invoices'
        """)
        
        if cursor.fetchone():
            print("Invoices table already exists")
            return
        
        print("Creating invoices table...")
        cursor.execute("""
            CREATE TABLE invoices (
                id VARCHAR(50) PRIMARY KEY,
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                guardian_id VARCHAR(50) NOT NULL,
                student_id VARCHAR(50),
                course_id VARCHAR(50),
                payment_id VARCHAR(50),
                amount FLOAT NOT NULL,
                subtotal FLOAT NOT NULL DEFAULT 0.0,
                tax_amount FLOAT DEFAULT 0.0,
                tax_rate FLOAT DEFAULT 0.0,
                currency VARCHAR(3) DEFAULT 'GBP',
                status VARCHAR(20) DEFAULT 'pending',
                payment_method VARCHAR(50),
                payment_date DATETIME,
                due_date DATETIME,
                items TEXT,
                line_items TEXT,
                pdf_path VARCHAR(255),
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Commit changes
        conn.commit()
        print("✓ Invoices table created successfully")
        
        # Verify the table was created
        cursor.execute("PRAGMA table_info(invoices)")
        columns = cursor.fetchall()
        print(f"✓ Table has {len(columns)} columns:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        
    except sqlite3.Error as e:
        print(f"✗ Error creating table: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    create_invoices_table()