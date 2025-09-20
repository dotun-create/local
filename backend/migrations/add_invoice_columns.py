#!/usr/bin/env python3
"""
Migration to add missing columns to invoices table
This script adds the invoice_number and other missing columns to match the Invoice model
"""

import sqlite3
import os
from datetime import datetime

def run_migration():
    # Get database path
    db_path = os.path.join(os.path.dirname(__file__), '..', 'course_card_app.db')
    
    print(f"Running migration on database: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("Adding missing columns to invoices table...")
        
        # Check if invoices table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='invoices'
        """)
        
        if not cursor.fetchone():
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
                    items TEXT, -- JSON stored as TEXT in SQLite
                    line_items TEXT, -- JSON stored as TEXT in SQLite
                    pdf_path VARCHAR(255),
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (guardian_id) REFERENCES users (id),
                    FOREIGN KEY (student_id) REFERENCES users (id),
                    FOREIGN KEY (course_id) REFERENCES courses (id),
                    FOREIGN KEY (payment_id) REFERENCES payments (id)
                )
            """)
            print("✓ Invoices table created successfully")
        else:
            # Table exists, check and add missing columns
            cursor.execute("PRAGMA table_info(invoices)")
            existing_columns = [col[1] for col in cursor.fetchall()]
            
            required_columns = [
                ('invoice_number', 'VARCHAR(50) UNIQUE NOT NULL'),
                ('subtotal', 'FLOAT NOT NULL DEFAULT 0.0'),
                ('tax_amount', 'FLOAT DEFAULT 0.0'),
                ('tax_rate', 'FLOAT DEFAULT 0.0'),
                ('currency', 'VARCHAR(3) DEFAULT "GBP"'),
                ('payment_method', 'VARCHAR(50)'),
                ('payment_date', 'DATETIME'),
                ('due_date', 'DATETIME'),
                ('items', 'TEXT'),
                ('line_items', 'TEXT'),
                ('pdf_path', 'VARCHAR(255)'),
                ('notes', 'TEXT')
            ]
            
            for column_name, column_def in required_columns:
                if column_name not in existing_columns:
                    print(f"Adding column: {column_name}")
                    cursor.execute(f"ALTER TABLE invoices ADD COLUMN {column_name} {column_def}")
                    print(f"✓ Added {column_name} column")
            
            # Update invoice_number for existing records if it's NULL
            if 'invoice_number' not in existing_columns:
                print("Updating existing invoices with invoice numbers...")
                cursor.execute("""
                    UPDATE invoices 
                    SET invoice_number = 'INV-' || date(created_at, 'localtime') || '-' || 
                        printf('%04d', (SELECT COUNT(*) FROM invoices i2 WHERE date(i2.created_at, 'localtime') <= date(invoices.created_at, 'localtime')))
                    WHERE invoice_number IS NULL OR invoice_number = ''
                """)
                print("✓ Updated existing invoice numbers")
        
        # Commit changes
        conn.commit()
        print("✓ Migration completed successfully")
        
    except sqlite3.Error as e:
        print(f"✗ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    run_migration()