"""
Database migration to add payment methods and stripe customers tables
Run with: python backend/migrations/add_payment_methods_tables.py
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app import create_app, db
from app.models import StripeCustomer, PaymentMethod
from flask import Flask

def create_payment_methods_tables():
    """Create the payment methods and stripe customers tables"""
    app = create_app()
    
    with app.app_context():
        try:
            print("Creating payment methods tables...")
            
            # Create the tables
            db.create_all()
            
            print("✅ Successfully created payment methods tables:")
            print("   - stripe_customers")
            print("   - payment_methods")
            print("\nTables are ready for use!")
            
        except Exception as e:
            print(f"❌ Error creating tables: {e}")
            return False
    
    return True

if __name__ == "__main__":
    success = create_payment_methods_tables()
    if success:
        print("\n🎉 Migration completed successfully!")
    else:
        print("\n💥 Migration failed!")
        sys.exit(1)