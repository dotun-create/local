#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Invoice
from app.services.invoice_service import InvoiceService

def test_invoice_methods():
    app = create_app()
    with app.app_context():
        try:
            print("Testing get_invoice_stats...")
            stats = InvoiceService.get_invoice_stats()
            print("Stats retrieved successfully:", stats)
        except Exception as e:
            print("Error in get_invoice_stats:", str(e))
            import traceback
            traceback.print_exc()
            
        try:
            print("\nTesting get_all_invoices...")
            invoices = InvoiceService.get_all_invoices(page=1, per_page=20)
            print("Invoices retrieved successfully:", invoices)
        except Exception as e:
            print("Error in get_all_invoices:", str(e))
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_invoice_methods()