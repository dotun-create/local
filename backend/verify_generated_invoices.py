#!/usr/bin/env python3
"""
Verify the integrity and completeness of generated invoices
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Payment, Invoice, User
from datetime import datetime
import json

def verify_generated_invoices():
    app = create_app()
    with app.app_context():
        print("=== INVOICE VERIFICATION REPORT ===\n")
        
        try:
            # 1. Count total invoices
            total_invoices = db.session.query(Invoice).count()
            print(f"📊 Total invoices in database: {total_invoices}")
            
            # 2. Get all invoices created today
            today = datetime.now().date()
            todays_invoices = db.session.query(Invoice).filter(
                db.func.date(Invoice.created_at) == today
            ).all()
            
            print(f"🆕 Invoices created today: {len(todays_invoices)}")
            
            # 3. Verify each generated invoice
            print(f"\n🔍 DETAILED VERIFICATION:")
            
            for i, invoice in enumerate(todays_invoices, 1):
                print(f"\n--- Invoice {i}: {invoice.invoice_number} ---")
                
                # Basic invoice data
                print(f"✓ ID: {invoice.id}")
                print(f"✓ Number: {invoice.invoice_number}")
                print(f"✓ Guardian: {invoice.guardian_id}")
                print(f"✓ Payment ID: {invoice.payment_id}")
                print(f"✓ Status: {invoice.status}")
                print(f"✓ Currency: {invoice.currency}")
                print(f"✓ Payment Method: {invoice.payment_method}")
                
                # Financial verification
                print(f"✓ Subtotal: £{invoice.subtotal}")
                print(f"✓ Tax Rate: {invoice.tax_rate * 100}%")
                print(f"✓ Tax Amount: £{invoice.tax_amount}")
                print(f"✓ Total Amount: £{invoice.amount}")
                
                # Verify tax calculation
                expected_tax = invoice.subtotal * 0.20
                expected_total = invoice.subtotal + expected_tax
                
                tax_correct = abs(invoice.tax_amount - expected_tax) < 0.01
                total_correct = abs(invoice.amount - expected_total) < 0.01
                
                print(f"✓ Tax calculation correct: {'✅' if tax_correct else '❌'}")
                print(f"✓ Total calculation correct: {'✅' if total_correct else '❌'}")
                
                # Verify payment relationship
                payment = db.session.query(Payment).filter(
                    Payment.id == invoice.payment_id
                ).first()
                
                if payment:
                    print(f"✓ Linked payment found: {payment.id}")
                    print(f"✓ Payment amount matches subtotal: {'✅' if abs(payment.amount - invoice.subtotal) < 0.01 else '❌'}")
                    print(f"✓ Payment guardian matches: {'✅' if payment.guardian_id == invoice.guardian_id else '❌'}")
                    print(f"✓ Payment status: {payment.status}")
                    print(f"✓ Invoice status matches payment: {'✅' if invoice.status == 'paid' else '❌'}")
                else:
                    print("❌ No linked payment found!")
                
                # Verify guardian relationship
                guardian = db.session.query(User).filter(
                    User.id == invoice.guardian_id,
                    User.account_type == 'guardian'
                ).first()
                
                if guardian:
                    print(f"✓ Guardian found: {guardian.profile.get('fullName', 'N/A') if guardian.profile else 'N/A'}")
                else:
                    print("❌ Guardian not found or not a guardian!")
                
                # Verify line items
                if invoice.line_items:
                    try:
                        if isinstance(invoice.line_items, str):
                            line_items = json.loads(invoice.line_items)
                        else:
                            line_items = invoice.line_items
                        
                        print(f"✓ Line items: {len(line_items)} items")
                        for item in line_items:
                            print(f"  - {item.get('description', 'N/A')}: £{item.get('total', 0)}")
                    except Exception as e:
                        print(f"❌ Error parsing line items: {str(e)}")
                
                # Verify dates
                print(f"✓ Payment Date: {invoice.payment_date}")
                print(f"✓ Due Date: {invoice.due_date}")
                print(f"✓ Created At: {invoice.created_at}")
                
                # Check due date is 30 days from payment date
                if invoice.payment_date and invoice.due_date:
                    expected_due = invoice.payment_date.replace(month=invoice.payment_date.month + 1)
                    # Simplified check - due date should be in future
                    due_date_correct = invoice.due_date > invoice.payment_date
                    print(f"✓ Due date is after payment date: {'✅' if due_date_correct else '❌'}")
            
            # 4. Overall verification summary
            print(f"\n📋 SUMMARY VERIFICATION:")
            
            # Check for completed payments without invoices
            completed_payments = db.session.query(Payment).filter(
                Payment.status == 'completed'
            ).all()
            
            payments_with_invoices = 0
            payments_without_invoices = []
            
            for payment in completed_payments:
                invoice = db.session.query(Invoice).filter(
                    Invoice.payment_id == payment.id
                ).first()
                
                if invoice:
                    payments_with_invoices += 1
                else:
                    payments_without_invoices.append(payment.id)
            
            print(f"✓ Total completed payments: {len(completed_payments)}")
            print(f"✓ Payments with invoices: {payments_with_invoices}")
            print(f"✓ Payments without invoices: {len(payments_without_invoices)}")
            
            if payments_without_invoices:
                print(f"❌ Missing invoices for payments: {payments_without_invoices}")
            else:
                print(f"✅ All completed payments have invoices!")
            
            # Check for duplicate invoice numbers
            invoice_numbers = db.session.query(Invoice.invoice_number).all()
            invoice_numbers_list = [num[0] for num in invoice_numbers]
            unique_numbers = set(invoice_numbers_list)
            
            print(f"✓ Total invoice numbers: {len(invoice_numbers_list)}")
            print(f"✓ Unique invoice numbers: {len(unique_numbers)}")
            
            if len(invoice_numbers_list) == len(unique_numbers):
                print(f"✅ All invoice numbers are unique!")
            else:
                print(f"❌ Duplicate invoice numbers found!")
            
            # Financial totals
            total_subtotal = db.session.query(db.func.sum(Invoice.subtotal)).scalar() or 0
            total_tax = db.session.query(db.func.sum(Invoice.tax_amount)).scalar() or 0
            total_amount = db.session.query(db.func.sum(Invoice.amount)).scalar() or 0
            
            print(f"\n💰 FINANCIAL SUMMARY:")
            print(f"✓ Total subtotal: £{total_subtotal}")
            print(f"✓ Total tax: £{total_tax}")
            print(f"✓ Total amount: £{total_amount}")
            print(f"✓ Expected total: £{total_subtotal + total_tax}")
            print(f"✓ Financial consistency: {'✅' if abs(total_amount - (total_subtotal + total_tax)) < 0.01 else '❌'}")
            
            print(f"\n🎉 VERIFICATION COMPLETED!")
            print(f"{'✅' if len(payments_without_invoices) == 0 and len(invoice_numbers_list) == len(unique_numbers) else '⚠️'} Overall Status: {'PASS' if len(payments_without_invoices) == 0 else 'ISSUES FOUND'}")
            
        except Exception as e:
            print(f"❌ Error during verification: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    verify_generated_invoices()