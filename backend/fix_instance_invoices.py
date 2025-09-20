#!/usr/bin/env python3
"""
Fix invoices table in instance/orms.db by adding missing columns
"""

import sqlite3
import os

def fix_invoices_table():
    # Use the instance database path
    db_path = os.path.join(os.path.dirname(__file__), 'instance', 'orms.db')
    
    print(f"Fixing invoices table in database: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check current columns
        cursor.execute("PRAGMA table_info(invoices)")
        existing_columns = [col[1] for col in cursor.fetchall()]
        print(f"Existing columns: {existing_columns}")
        
        # Define required columns that are missing
        required_columns = [
            ('invoice_number', 'VARCHAR(50)'),  # Remove UNIQUE constraint for ALTER TABLE
            ('payment_id', 'VARCHAR(50)'),
            ('subtotal', 'FLOAT DEFAULT 0.0'),
            ('tax_amount', 'FLOAT DEFAULT 0.0'),
            ('tax_rate', 'FLOAT DEFAULT 0.0'),
            ('line_items', 'TEXT'),
            ('pdf_path', 'VARCHAR(255)'),
            ('notes', 'TEXT'),
            ('updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP')
        ]
        
        for column_name, column_def in required_columns:
            if column_name not in existing_columns:
                print(f"Adding column: {column_name}")
                cursor.execute(f"ALTER TABLE invoices ADD COLUMN {column_name} {column_def}")
                print(f"✓ Added {column_name} column")
        
        # Update currency column default if needed
        print("Setting default currency values...")
        cursor.execute("UPDATE invoices SET currency = 'GBP' WHERE currency IS NULL")
        
        # Update status column default if needed
        print("Setting default status values...")
        cursor.execute("UPDATE invoices SET status = 'pending' WHERE status IS NULL")
        
        # Generate invoice numbers for existing records
        print("Generating invoice numbers for existing records...")
        cursor.execute("""
            UPDATE invoices 
            SET invoice_number = 'INV-' || date('now') || '-' || 
                printf('%04d', (SELECT COUNT(*) FROM invoices i2 WHERE i2.rowid <= invoices.rowid))
            WHERE invoice_number IS NULL OR invoice_number = ''
        """)
        
        # Commit changes
        conn.commit()
        print("✓ Migration completed successfully")
        
        # Verify the changes
        cursor.execute("PRAGMA table_info(invoices)")
        columns = cursor.fetchall()
        print(f"✓ Table now has {len(columns)} columns:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]})")
        
    except sqlite3.Error as e:
        print(f"✗ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    fix_invoices_table()