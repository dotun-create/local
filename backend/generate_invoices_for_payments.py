#!/usr/bin/env python3
"""
Generate invoices for all completed payments that don't have invoices yet.
This script processes payments in batches and creates proper invoices with all required data.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Payment, Invoice, User, Course
from app.services.invoice_service import InvoiceService
from datetime import datetime, timedelta
import traceback

class InvoiceGenerator:
    def __init__(self):
        self.app = create_app()
        self.processed_count = 0
        self.error_count = 0
        self.skipped_count = 0
        self.batch_size = 10
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def generate_invoices(self, dry_run=False):
        """Generate invoices for all completed payments without existing invoices"""
        
        with self.app.app_context():
            self.log("🚀 Starting invoice generation process")
            
            try:
                # Get all completed payments without invoices
                completed_payments = self._get_eligible_payments()
                
                if not completed_payments:
                    self.log("✅ No payments need invoices - all completed payments already have invoices")
                    return
                
                self.log(f"📊 Found {len(completed_payments)} completed payments needing invoices")
                
                if dry_run:
                    self.log("🔍 DRY RUN MODE - No actual invoices will be created")
                    self._dry_run_analysis(completed_payments)
                    return
                
                # Process payments in batches
                self._process_payments_in_batches(completed_payments)
                
                # Final summary
                self._print_final_summary()
                
            except Exception as e:
                self.log(f"❌ Fatal error during invoice generation: {str(e)}", "ERROR")
                traceback.print_exc()
                raise
    
    def _get_eligible_payments(self):
        """Get all completed payments that don't have invoices"""
        
        # Get all completed payments
        completed_payments = db.session.query(Payment).filter(
            Payment.status == 'completed'
        ).all()
        
        # Filter out payments that already have invoices
        eligible_payments = []
        for payment in completed_payments:
            existing_invoice = db.session.query(Invoice).filter(
                Invoice.payment_id == payment.id
            ).first()
            
            if not existing_invoice:
                eligible_payments.append(payment)
        
        return eligible_payments
    
    def _dry_run_analysis(self, payments):
        """Perform dry run analysis without creating invoices"""
        
        self.log("📋 DRY RUN ANALYSIS:")
        
        for i, payment in enumerate(payments, 1):
            self.log(f"\n--- Payment {i}/{len(payments)} ---")
            
            # Validate payment data
            validation_result = self._validate_payment_data(payment)
            
            if validation_result['valid']:
                self.log(f"✅ Payment {payment.id} - ELIGIBLE")
                self.log(f"   Guardian: {payment.guardian_id}")
                self.log(f"   Amount: {payment.amount} {payment.currency}")
                self.log(f"   Method: {payment.method}")
                self.log(f"   Date: {payment.processed_at}")
                
                # Calculate invoice amounts
                subtotal = payment.amount
                tax_rate = 0.20
                tax_amount = subtotal * tax_rate
                total_amount = subtotal + tax_amount
                
                self.log(f"   Invoice will be:")
                self.log(f"     Subtotal: {subtotal}")
                self.log(f"     Tax (20%): {tax_amount}")
                self.log(f"     Total: {total_amount}")
                
            else:
                self.log(f"❌ Payment {payment.id} - PROBLEMATIC")
                for issue in validation_result['issues']:
                    self.log(f"   Issue: {issue}")
        
        self.log(f"\n📊 DRY RUN SUMMARY:")
        self.log(f"   Total payments analyzed: {len(payments)}")
        eligible_count = sum(1 for p in payments if self._validate_payment_data(p)['valid'])
        problematic_count = len(payments) - eligible_count
        self.log(f"   Eligible for invoice creation: {eligible_count}")
        self.log(f"   Problematic payments: {problematic_count}")
    
    def _process_payments_in_batches(self, payments):
        """Process payments in batches to avoid memory issues"""
        
        total_batches = (len(payments) + self.batch_size - 1) // self.batch_size
        
        for batch_num in range(total_batches):
            start_idx = batch_num * self.batch_size
            end_idx = min(start_idx + self.batch_size, len(payments))
            batch = payments[start_idx:end_idx]
            
            self.log(f"🔄 Processing batch {batch_num + 1}/{total_batches} ({len(batch)} payments)")
            
            for payment in batch:
                self._process_single_payment(payment)
            
            # Commit batch
            try:
                db.session.commit()
                self.log(f"✅ Batch {batch_num + 1} committed successfully")
            except Exception as e:
                self.log(f"❌ Error committing batch {batch_num + 1}: {str(e)}", "ERROR")
                db.session.rollback()
                raise
    
    def _process_single_payment(self, payment):
        """Process a single payment to create an invoice"""
        
        try:
            self.log(f"🔄 Processing payment {payment.id}")
            
            # Validate payment data
            validation_result = self._validate_payment_data(payment)
            
            if not validation_result['valid']:
                self.log(f"⚠️  Skipping payment {payment.id} - validation failed:", "WARN")
                for issue in validation_result['issues']:
                    self.log(f"   Issue: {issue}", "WARN")
                self.skipped_count += 1
                return
            
            # Create invoice using the fixed service method
            invoice = self._create_invoice_for_payment(payment)
            
            if invoice:
                self.log(f"✅ Created invoice {invoice.invoice_number} for payment {payment.id}")
                self.processed_count += 1
            else:
                self.log(f"❌ Failed to create invoice for payment {payment.id}", "ERROR")
                self.error_count += 1
                
        except Exception as e:
            self.log(f"❌ Error processing payment {payment.id}: {str(e)}", "ERROR")
            self.error_count += 1
            traceback.print_exc()
    
    def _validate_payment_data(self, payment):
        """Validate that payment has all required data for invoice generation"""
        
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
        
        return {
            'valid': len(issues) == 0,
            'issues': issues
        }
    
    def _create_invoice_for_payment(self, payment):
        """Create invoice for a payment with correct field mapping"""
        
        try:
            # Create new invoice
            invoice = Invoice()
            invoice.invoice_number = invoice.generate_invoice_number()
            invoice.guardian_id = payment.guardian_id
            invoice.payment_id = payment.id
            
            # Calculate amounts
            subtotal = payment.amount
            tax_rate = 0.20  # 20% VAT for UK
            tax_amount = subtotal * tax_rate
            total_amount = subtotal + tax_amount
            
            invoice.subtotal = subtotal
            invoice.tax_amount = tax_amount
            invoice.tax_rate = tax_rate
            invoice.amount = total_amount
            invoice.currency = payment.currency or 'GBP'
            invoice.payment_method = payment.method  # Fixed: use 'method' not 'payment_method'
            invoice.status = 'paid' if payment.status == 'completed' else 'pending'
            invoice.payment_date = payment.processed_at  # Fixed: use 'processed_at' not 'payment_date'
            invoice.due_date = datetime.now() + timedelta(days=30)
            
            # Generate line items based on payment type
            line_items = []
            
            if payment.credits_earned and payment.credits_earned > 0:
                # Credit purchase payment
                description = f"Account Credit Purchase - {payment.credits_earned} credits"
                line_items.append({
                    'description': description,
                    'quantity': 1,
                    'unitPrice': subtotal,
                    'total': subtotal,
                    'type': 'credit'
                })
            else:
                # Other payment type
                description = f"Payment via {payment.method}"
                if payment.transaction_id:
                    description += f" (Transaction: {payment.transaction_id})"
                
                line_items.append({
                    'description': description,
                    'quantity': 1,
                    'unitPrice': subtotal,
                    'total': subtotal,
                    'type': 'payment'
                })
            
            invoice.line_items = line_items
            
            # Legacy items field for backward compatibility
            invoice.items = [{
                'name': item['description'],
                'amount': item['total']
            } for item in line_items]
            
            db.session.add(invoice)
            
            return invoice
            
        except Exception as e:
            self.log(f"❌ Error creating invoice for payment {payment.id}: {str(e)}", "ERROR")
            traceback.print_exc()
            return None
    
    def _print_final_summary(self):
        """Print final processing summary"""
        
        self.log("\n" + "="*60)
        self.log("📊 INVOICE GENERATION COMPLETED")
        self.log("="*60)
        self.log(f"✅ Successfully processed: {self.processed_count}")
        self.log(f"⚠️  Skipped (validation failed): {self.skipped_count}")
        self.log(f"❌ Errors: {self.error_count}")
        self.log(f"📋 Total attempted: {self.processed_count + self.skipped_count + self.error_count}")
        
        if self.processed_count > 0:
            self.log(f"🎉 {self.processed_count} invoices created successfully!")
        
        if self.error_count > 0:
            self.log(f"⚠️  {self.error_count} payments had errors - check logs above", "WARN")
        
        if self.skipped_count > 0:
            self.log(f"ℹ️  {self.skipped_count} payments were skipped due to validation issues", "INFO")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate invoices for completed payments')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Perform a dry run without creating actual invoices')
    parser.add_argument('--batch-size', type=int, default=10,
                       help='Number of payments to process in each batch')
    
    args = parser.parse_args()
    
    generator = InvoiceGenerator()
    generator.batch_size = args.batch_size
    
    try:
        generator.generate_invoices(dry_run=args.dry_run)
    except KeyboardInterrupt:
        generator.log("❌ Process interrupted by user", "ERROR")
        sys.exit(1)
    except Exception as e:
        generator.log(f"❌ Fatal error: {str(e)}", "ERROR")
        sys.exit(1)

if __name__ == '__main__':
    main()