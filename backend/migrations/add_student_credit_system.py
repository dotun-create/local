#!/usr/bin/env python3
"""
Migration: Add Student Credit System
Creates tables for student credit allocations and transactions
"""

from app import create_app, db
from app.models import StudentCreditAllocation, CreditTransaction

def create_tables():
    """Create new credit system tables"""
    print("Creating student credit system tables...")
    
    # Create tables
    db.create_all()
    
    print("✅ Created student_credit_allocations table")
    print("✅ Created credit_transactions table")

def migrate():
    """Run the migration"""
    app = create_app()
    with app.app_context():
        try:
            create_tables()
            print("\n🎉 Student credit system migration completed successfully!")
            print("\nNew tables created:")
            print("- student_credit_allocations: Track credits allocated to individual students")
            print("- credit_transactions: Log all credit-related transactions")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == '__main__':
    migrate()