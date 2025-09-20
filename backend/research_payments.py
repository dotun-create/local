#!/usr/bin/env python3
"""
Research existing payments and analyze data for invoice generation
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Payment, Invoice, User, Course
from sqlalchemy import func, and_

def research_payments_data():
    app = create_app()
    with app.app_context():
        print("=== PAYMENT DATA RESEARCH FOR INVOICE GENERATION ===\n")
        
        try:
            # 1. Total payments analysis
            total_payments = db.session.query(Payment).count()
            print(f"📊 Total payments in database: {total_payments}")
            
            if total_payments == 0:
                print("❌ No payments found in database")
                return
            
            # 2. Payment status breakdown
            print(f"\n🔍 Payment Status Breakdown:")
            status_counts = db.session.query(
                Payment.status, 
                func.count(Payment.id)
            ).group_by(Payment.status).all()
            
            for status, count in status_counts:
                print(f"   {status}: {count} payments")
            
            # 3. Completed payments analysis
            completed_payments = db.session.query(Payment).filter(
                Payment.status == 'completed'
            ).all()
            
            print(f"\n✅ Completed payments: {len(completed_payments)}")
            
            if len(completed_payments) == 0:
                print("❌ No completed payments found")
                return
            
            # 4. Check which completed payments already have invoices
            payments_with_invoices = 0
            payments_without_invoices = 0
            
            for payment in completed_payments:
                existing_invoice = db.session.query(Invoice).filter(
                    Invoice.payment_id == payment.id
                ).first()
                
                if existing_invoice:
                    payments_with_invoices += 1
                else:
                    payments_without_invoices += 1
            
            print(f"   📋 Already have invoices: {payments_with_invoices}")
            print(f"   ❓ Need invoices: {payments_without_invoices}")
            
            # 5. Analyze data completeness for payments without invoices
            print(f"\n🔎 Data Completeness Analysis for Payments Needing Invoices:")
            
            eligible_payments = []
            problematic_payments = []
            
            for payment in completed_payments:
                existing_invoice = db.session.query(Invoice).filter(
                    Invoice.payment_id == payment.id
                ).first()
                
                if existing_invoice:
                    continue  # Skip payments that already have invoices
                
                # Analyze data completeness
                issues = []
                
                # Check guardian_id
                if not payment.guardian_id:
                    issues.append("missing guardian_id")
                else:
                    guardian = db.session.query(User).filter(
                        User.id == payment.guardian_id,
                        User.account_type == 'guardian'
                    ).first()
                    if not guardian:
                        issues.append("invalid guardian_id or not a guardian")
                
                # Check amount
                if not payment.amount or payment.amount <= 0:
                    issues.append("invalid amount")
                
                # Check processed_at (payment_date)
                if not payment.processed_at:
                    issues.append("missing processed_at date")
                
                # Check method (payment_method)
                if not payment.method:
                    issues.append("missing payment method")
                
                # Check currency (optional - will default to GBP)
                if not payment.currency:
                    issues.append("missing currency (will default to GBP)")
                
                if issues:
                    problematic_payments.append((payment, issues))
                else:
                    eligible_payments.append(payment)
            
            print(f"   ✅ Eligible for invoice generation: {len(eligible_payments)}")
            print(f"   ❌ Problematic payments: {len(problematic_payments)}")
            
            # 6. Show sample of eligible payments
            if eligible_payments:
                print(f"\n📝 Sample Eligible Payment Data:")
                sample_payment = eligible_payments[0]
                print(f"   ID: {sample_payment.id}")
                print(f"   Guardian ID: {sample_payment.guardian_id}")
                print(f"   Amount: {sample_payment.amount} {sample_payment.currency}")
                print(f"   Method: {sample_payment.method}")
                print(f"   Status: {sample_payment.status}")
                print(f"   Processed At: {sample_payment.processed_at}")
                print(f"   Credits Earned: {sample_payment.credits_earned}")
                print(f"   Transaction ID: {sample_payment.transaction_id}")
            
            # 7. Show problematic payments details
            if problematic_payments:
                print(f"\n⚠️  Problematic Payments Details:")
                for i, (payment, issues) in enumerate(problematic_payments[:5]):  # Show first 5
                    print(f"   Payment {i+1}: {payment.id}")
                    print(f"      Issues: {', '.join(issues)}")
                if len(problematic_payments) > 5:
                    print(f"   ... and {len(problematic_payments) - 5} more")
            
            # 8. Analyze payment methods
            print(f"\n💳 Payment Methods Analysis:")
            method_counts = db.session.query(
                Payment.method,
                func.count(Payment.id)
            ).filter(Payment.status == 'completed').group_by(Payment.method).all()
            
            for method, count in method_counts:
                print(f"   {method or 'Unknown'}: {count} payments")
            
            # 9. Currency analysis
            print(f"\n💰 Currency Analysis:")
            currency_counts = db.session.query(
                Payment.currency,
                func.count(Payment.id)
            ).filter(Payment.status == 'completed').group_by(Payment.currency).all()
            
            for currency, count in currency_counts:
                print(f"   {currency or 'Unknown'}: {count} payments")
            
            # 10. Summary
            print(f"\n📋 SUMMARY:")
            print(f"   • Total payments: {total_payments}")
            print(f"   • Completed payments: {len(completed_payments)}")
            print(f"   • Need invoices: {payments_without_invoices}")
            print(f"   • Eligible for generation: {len(eligible_payments)}")
            print(f"   • Problematic: {len(problematic_payments)}")
            
        except Exception as e:
            print(f"❌ Error during research: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    research_payments_data()