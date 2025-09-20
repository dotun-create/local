#!/usr/bin/env python3
"""
Migration script to add currency fields to relevant tables
Run this script to add currency support across the application
"""

import os
import sys
from datetime import datetime

# Add the backend directory to Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(backend_dir))

from app import create_app, db
from app.models import *

def get_currency_from_country(country):
    """Map country names to currency codes"""
    country_currency_map = {
        'UK': 'GBP',
        'United Kingdom': 'GBP', 
        'England': 'GBP',
        'Scotland': 'GBP',
        'Wales': 'GBP',
        'Northern Ireland': 'GBP',
        'US': 'USD',
        'USA': 'USD',
        'United States': 'USD',
        'America': 'USD',
        'Nigeria': 'NGN',
        'Canada': 'CAD',
        'Canadian': 'CAD'
    }
    
    if not country:
        return 'GBP'  # Default currency
    
    # Try exact match first
    if country in country_currency_map:
        return country_currency_map[country]
    
    # Try case-insensitive match
    country_lower = country.lower()
    for key, value in country_currency_map.items():
        if key.lower() == country_lower:
            return value
    
    # Try partial match
    for key, value in country_currency_map.items():
        if key.lower() in country_lower or country_lower in key.lower():
            return value
    
    return 'GBP'  # Default currency

def run_migration():
    """Execute the currency fields migration"""
    print("Starting currency fields migration...")
    
    try:
        # Add currency column to sessions table if it doesn't exist
        print("Adding currency field to sessions table...")
        try:
            from sqlalchemy import text
            db.session.execute(text("ALTER TABLE sessions ADD COLUMN currency VARCHAR(3) DEFAULT 'GBP'"))
        except Exception as e:
            if "already exists" in str(e) or "duplicate column name" in str(e):
                print("Currency column already exists in sessions table")
            else:
                print(f"Error adding currency to sessions: {e}")

        # Add currency column to invoices table if it doesn't exist (already exists based on model)
        print("Checking currency field in invoices table...")
        try:
            db.session.execute(text("SELECT currency FROM invoices LIMIT 1"))
            print("Currency column already exists in invoices table")
        except Exception as e:
            print("Adding currency field to invoices table...")
            db.session.execute(text("ALTER TABLE invoices ADD COLUMN currency VARCHAR(3) DEFAULT 'GBP'"))

        # Add currency column to payments table if it doesn't exist (already exists based on model)
        print("Checking currency field in payments table...")
        try:
            db.session.execute(text("SELECT currency FROM payments LIMIT 1"))
            print("Currency column already exists in payments table")
        except Exception as e:
            print("Adding currency field to payments table...")
            db.session.execute(text("ALTER TABLE payments ADD COLUMN currency VARCHAR(3) DEFAULT 'GBP'"))

        # Add currency column to tutor_earnings table if it doesn't exist (already exists based on model)
        print("Checking currency field in tutor_earnings table...")
        try:
            db.session.execute(text("SELECT currency FROM tutor_earnings LIMIT 1"))
            print("Currency column already exists in tutor_earnings table")
        except Exception as e:
            print("Adding currency field to tutor_earnings table...")
            db.session.execute(text("ALTER TABLE tutor_earnings ADD COLUMN currency VARCHAR(3) DEFAULT 'GBP'"))

        # Add currency column to pricing_plans table if it doesn't exist (already exists based on model)
        print("Checking currency field in pricing_plans table...")
        try:
            db.session.execute(text("SELECT currency FROM pricing_plans LIMIT 1"))
            print("Currency column already exists in pricing_plans table")
        except Exception as e:
            print("Adding currency field to pricing_plans table...")
            db.session.execute(text("ALTER TABLE pricing_plans ADD COLUMN currency VARCHAR(3) DEFAULT 'GBP'"))

        db.session.commit()
        
        # Update existing course records to set currency based on country
        print("Updating existing course currencies based on country...")
        courses = Course.query.all()
        for course in courses:
            if not course.currency or course.currency == 'GBP':
                new_currency = get_currency_from_country(course.country)
                course.currency = new_currency
                print(f"Updated course '{course.title}' (country: {course.country}) to currency: {new_currency}")
        
        # Update existing session records to match their course currency
        print("Updating existing session currencies based on course...")
        sessions = Session.query.all()
        for session in sessions:
            if session.course:
                session_currency = get_currency_from_country(session.course.country)
                # Update session currency if column exists
                try:
                    db.session.execute(
                        text("UPDATE sessions SET currency = :currency WHERE id = :session_id"),
                        {'currency': session_currency, 'session_id': session.id}
                    )
                    print(f"Updated session '{session.title}' to currency: {session_currency}")
                except Exception as e:
                    print(f"Warning: Could not update session currency: {e}")
        
        # Update existing invoice records to match their course currency
        print("Updating existing invoice currencies based on course...")
        invoices = Invoice.query.all()
        for invoice in invoices:
            if invoice.course:
                invoice_currency = get_currency_from_country(invoice.course.country)
                invoice.currency = invoice_currency
                print(f"Updated invoice '{invoice.invoice_number}' to currency: {invoice_currency}")
        
        # Update existing payment records to match their invoice currency
        print("Updating existing payment currencies based on invoice...")
        payments = Payment.query.all()
        for payment in payments:
            if payment.invoice_id:
                invoice = Invoice.query.get(payment.invoice_id)
                if invoice:
                    payment.currency = invoice.currency
                    print(f"Updated payment '{payment.id}' to currency: {payment.currency}")
        
        # Update existing tutor earnings to match their session currency
        print("Updating existing tutor earnings currencies based on session...")
        earnings = TutorEarning.query.all()
        for earning in earnings:
            if earning.session_id:
                session = Session.query.get(earning.session_id)
                if session and session.course:
                    earning_currency = get_currency_from_country(session.course.country)
                    earning.currency = earning_currency
                    print(f"Updated tutor earning '{earning.id}' to currency: {earning_currency}")
        
        # Update existing pricing plans based on usage patterns (keep GBP as default for now)
        print("Updating existing pricing plan currencies...")
        pricing_plans = PricingPlan.query.all()
        for plan in pricing_plans:
            if not plan.currency:
                plan.currency = 'GBP'  # Default to GBP for existing plans
                print(f"Updated pricing plan '{plan.name}' to currency: {plan.currency}")
        
        db.session.commit()
        print("Migration completed successfully!")
        
        # Print summary of currency distribution
        print("\nCurrency distribution summary:")
        course_currencies = db.session.execute(
            text("SELECT currency, COUNT(*) FROM courses GROUP BY currency")
        ).fetchall()
        for currency, count in course_currencies:
            print(f"Courses with {currency}: {count}")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        db.session.rollback()
        sys.exit(1)

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        run_migration()