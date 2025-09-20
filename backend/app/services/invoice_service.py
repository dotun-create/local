from datetime import datetime, timedelta
from app import db
from app.models import Invoice, Payment, User, Course, Enrollment
from sqlalchemy import desc


class InvoiceService:
    
    @staticmethod
    def generate_invoice_for_payment(payment_id, guardian_id, student_id=None, course_id=None):
        """Generate invoice automatically for a payment transaction"""
        try:
            payment = Payment.query.get(payment_id)
            if not payment:
                raise ValueError("Payment not found")
            
            # Create new invoice
            invoice = Invoice()
            invoice.invoice_number = invoice.generate_invoice_number()
            invoice.guardian_id = guardian_id
            invoice.student_id = student_id
            invoice.course_id = course_id
            invoice.payment_id = payment_id
            
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
            invoice.payment_method = payment.payment_method
            invoice.status = 'paid' if payment.status == 'completed' else 'pending'
            invoice.payment_date = payment.payment_date
            invoice.due_date = datetime.now() + timedelta(days=30)
            
            # Generate line items
            line_items = []
            if course_id:
                course = Course.query.get(course_id)
                if course:
                    line_items.append({
                        'description': f'Course: {course.title}',
                        'quantity': 1,
                        'unitPrice': subtotal,
                        'total': subtotal,
                        'type': 'course_enrollment'
                    })
            else:
                # Credit addition or other payment
                line_items.append({
                    'description': payment.description or 'Account Credit',
                    'quantity': 1,
                    'unitPrice': subtotal,
                    'total': subtotal,
                    'type': 'credit'
                })
            
            invoice.line_items = line_items
            
            # Legacy items field for backward compatibility
            invoice.items = [{
                'name': item['description'],
                'amount': item['total']
            } for item in line_items]
            
            db.session.add(invoice)
            db.session.commit()
            
            return invoice
            
        except Exception as e:
            db.session.rollback()
            raise e
    
    @staticmethod
    def get_guardian_invoices(guardian_id, page=1, per_page=10):
        """Get paginated invoices for a guardian"""
        invoices = Invoice.query.filter_by(guardian_id=guardian_id)\
                               .order_by(desc(Invoice.created_at))\
                               .paginate(page=page, per_page=per_page, error_out=False)
        
        return {
            'invoices': [invoice.to_dict() for invoice in invoices.items],
            'total': invoices.total,
            'pages': invoices.pages,
            'current_page': page,
            'per_page': per_page,
            'has_next': invoices.has_next,
            'has_prev': invoices.has_prev
        }
    
    @staticmethod
    def get_all_invoices(page=1, per_page=20, status=None, guardian_id=None, search=None):
        """Get all invoices for admin view with filtering"""
        query = Invoice.query
        
        # Apply filters
        if status:
            query = query.filter(Invoice.status == status)
        
        if guardian_id:
            query = query.filter(Invoice.guardian_id == guardian_id)
        
        if search:
            query = query.join(User, Invoice.guardian_id == User.id)\
                        .filter(
                            db.or_(
                                Invoice.invoice_number.ilike(f'%{search}%'),
                                User.profile['fullName'].astext.ilike(f'%{search}%')
                            )
                        )
        
        invoices = query.order_by(desc(Invoice.created_at))\
                       .paginate(page=page, per_page=per_page, error_out=False)
        
        return {
            'invoices': [invoice.to_dict() for invoice in invoices.items],
            'total': invoices.total,
            'pages': invoices.pages,
            'current_page': page,
            'per_page': per_page,
            'has_next': invoices.has_next,
            'has_prev': invoices.has_prev
        }
    
    @staticmethod
    def create_manual_invoice(guardian_id, student_id=None, course_id=None, 
                            amount=0, description="Manual Invoice", notes=None):
        """Create manual invoice (admin function)"""
        try:
            invoice = Invoice()
            invoice.invoice_number = invoice.generate_invoice_number()
            invoice.guardian_id = guardian_id
            invoice.student_id = student_id
            invoice.course_id = course_id
            
            # Calculate amounts (no tax for manual invoices by default)
            invoice.subtotal = amount
            invoice.tax_amount = 0
            invoice.tax_rate = 0
            invoice.amount = amount
            invoice.currency = 'GBP'
            invoice.status = 'pending'
            invoice.due_date = datetime.now() + timedelta(days=30)
            invoice.notes = notes
            
            # Generate line items
            line_items = [{
                'description': description,
                'quantity': 1,
                'unitPrice': amount,
                'total': amount,
                'type': 'manual'
            }]
            
            invoice.line_items = line_items
            invoice.items = [{'name': description, 'amount': amount}]
            
            db.session.add(invoice)
            db.session.commit()
            
            return invoice
            
        except Exception as e:
            db.session.rollback()
            raise e
    
    @staticmethod
    def get_invoice_stats():
        """Get comprehensive invoice statistics for admin dashboard"""
        try:
            from datetime import datetime
            from sqlalchemy import func, extract
            
            # Basic counts
            total_invoices = db.session.query(Invoice).count()
            paid_invoices = db.session.query(Invoice).filter_by(status='paid').count()
            pending_invoices = db.session.query(Invoice).filter_by(status='pending').count()
            overdue_invoices = db.session.query(Invoice).filter(
                Invoice.status == 'pending',
                Invoice.due_date < datetime.now()
            ).count()
            
            # Revenue calculations
            total_revenue = db.session.query(func.sum(Invoice.amount)).filter_by(status='paid').scalar() or 0
            pending_revenue = db.session.query(func.sum(Invoice.amount)).filter_by(status='pending').scalar() or 0
            
            # Monthly revenue for the last 12 months
            monthly_revenue = []
            current_date = datetime.now()
            
            for i in range(12):
                # Calculate month/year going back i months
                month = current_date.month - i
                year = current_date.year
                
                if month <= 0:
                    month += 12
                    year -= 1
                
                revenue = db.session.query(func.sum(Invoice.amount)).filter(
                    Invoice.status == 'paid',
                    extract('month', Invoice.payment_date) == month,
                    extract('year', Invoice.payment_date) == year
                ).scalar() or 0
                
                monthly_revenue.append({
                    'month': f"{year}-{month:02d}",
                    'revenue': float(revenue)
                })
            
            # Reverse to show chronological order
            monthly_revenue.reverse()
            
            return {
                'totalInvoices': total_invoices,
                'paidInvoices': paid_invoices,
                'pendingInvoices': pending_invoices,
                'overdueInvoices': overdue_invoices,
                'totalRevenue': float(total_revenue),
                'pendingRevenue': float(pending_revenue),
                'monthlyRevenue': monthly_revenue
            }
            
        except Exception as e:
            raise e