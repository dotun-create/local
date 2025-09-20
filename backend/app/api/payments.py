from flask import request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User, Invoice, Payment, TutorEarning, CreditBalance, PricingPlan, PaymentMethod, StripeCustomer
from app import db
import uuid
import stripe
import math
from datetime import datetime, timedelta

def calculate_credits_from_payment(amount_gbp, plan_type):
    """
    Calculate credits based on payment amount and plan type
    - Class & Weekly Plans: 1 pound per credit
    - Monthly Plan: 0.90 pence per credit (1.11 credits per pound)  
    - Session Plan: 0.85 pence per credit (1.18 credits per pound)
    Round up to nearest whole number
    """
    plan_type = plan_type.lower()
    
    if plan_type in ['class', 'weekly']:
        # 1 pound = 1 credit
        credits = amount_gbp
    elif plan_type == 'monthly':
        # 0.90 pence per credit = 1.111... credits per pound
        credits = amount_gbp / 0.90
    elif plan_type == 'session':
        # 0.85 pence per credit = 1.176... credits per pound  
        credits = amount_gbp / 0.85
    else:
        # Default to 1:1 ratio
        credits = amount_gbp
    
    # Round up to nearest whole number
    return math.ceil(credits)

@api_bp.route('/invoices', methods=['GET'])
@jwt_required()
def get_invoices():
    """Get invoices based on user role"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        
        query = Invoice.query
        
        # Filter by user role
        if current_user.account_type == 'guardian':
            query = query.filter_by(guardian_id=current_user_id)
        elif current_user.account_type != 'admin':
            return jsonify({'error': 'Access denied'}), 403
        
        if status:
            query = query.filter_by(status=status)
        
        invoices = query.order_by(Invoice.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        invoice_data = []
        for invoice in invoices.items:
            data = invoice.to_dict()
            # Add student and course info
            if invoice.student_id:
                student = User.query.get(invoice.student_id)
                if student:
                    data['student'] = {
                        'id': student.id,
                        'name': student.profile.get('name', student.email)
                    }
            invoice_data.append(data)
        
        return jsonify({
            'invoices': invoice_data,
            'totalInvoices': invoices.total,
            'totalPages': invoices.pages,
            'currentPage': page,
            'hasNext': invoices.has_next,
            'hasPrev': invoices.has_prev
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/invoices', methods=['POST'])
@jwt_required()
def create_invoice():
    """Create new invoice (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        required_fields = ['guardianId', 'amount']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if guardian exists
        guardian = User.query.filter_by(id=data['guardianId'], account_type='guardian').first()
        if not guardian:
            return jsonify({'error': 'Guardian not found'}), 404
        
        # Calculate due date (30 days from now)
        due_date = datetime.utcnow() + timedelta(days=30)
        
        invoice = Invoice(
            id=f"invoice_{uuid.uuid4().hex[:8]}",
            guardian_id=data['guardianId'],
            student_id=data.get('studentId'),
            course_id=data.get('courseId'),
            amount=data['amount'],
            currency=data.get('currency', 'GBP'),
            due_date=due_date,
            items=data.get('items', [])
        )
        
        db.session.add(invoice)
        db.session.commit()
        
        return jsonify({
            'invoice': invoice.to_dict(),
            'message': 'Invoice created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/invoices/<string:invoice_id>/pay', methods=['POST'])
@jwt_required()
def pay_invoice(invoice_id):
    """Process invoice payment"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        invoice = Invoice.query.get(invoice_id)
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
        
        # Check permissions (admin or guardian who owns the invoice)
        if (current_user.account_type != 'admin' and 
            invoice.guardian_id != current_user_id):
            return jsonify({'error': 'Access denied'}), 403
        
        if invoice.status == 'paid':
            return jsonify({'error': 'Invoice already paid'}), 400
        
        data = request.get_json()
        payment_method = data.get('paymentMethod', 'credit_card')
        
        # Create payment record
        payment = Payment(
            id=f"payment_{uuid.uuid4().hex[:8]}",
            invoice_id=invoice_id,
            amount=invoice.amount,
            currency=invoice.currency,
            method=payment_method,
            status='completed',  # In real implementation, this would be 'pending' until confirmed
            transaction_id=f"txn_{uuid.uuid4().hex[:8]}",
            processed_at=datetime.utcnow()
        )
        
        # Update invoice status
        invoice.status = 'paid'
        invoice.payment_date = datetime.utcnow()
        invoice.payment_method = payment_method
        
        db.session.add(payment)
        db.session.commit()
        
        return jsonify({
            'invoice': invoice.to_dict(),
            'payment': payment.to_dict(),
            'message': 'Payment processed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/tutor-earnings', methods=['GET'])
@jwt_required()
def get_tutor_earnings():
    """Get tutor earnings"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        tutor_id = request.args.get('tutorId')
        
        query = TutorEarning.query
        
        # Filter by user role
        if current_user.account_type == 'tutor':
            query = query.filter_by(tutor_id=current_user_id)
        elif current_user.account_type == 'admin':
            if tutor_id:
                query = query.filter_by(tutor_id=tutor_id)
        else:
            return jsonify({'error': 'Access denied'}), 403
        
        if status:
            query = query.filter_by(status=status)
        
        earnings = query.order_by(TutorEarning.earned_date.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Calculate totals
        total_earnings = query.with_entities(db.func.sum(TutorEarning.amount)).scalar() or 0
        pending_earnings = query.filter_by(status='pending').with_entities(db.func.sum(TutorEarning.amount)).scalar() or 0
        paid_earnings = query.filter_by(status='paid').with_entities(db.func.sum(TutorEarning.amount)).scalar() or 0
        
        return jsonify({
            'earnings': [earning.to_dict() for earning in earnings.items],
            'totalEarnings': earnings.total,
            'totalPages': earnings.pages,
            'currentPage': page,
            'hasNext': earnings.has_next,
            'hasPrev': earnings.has_prev,
            'summary': {
                'totalAmount': total_earnings,
                'pendingAmount': pending_earnings,
                'paidAmount': paid_earnings
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/tutor-earnings', methods=['POST'])
@jwt_required()
def create_tutor_earning():
    """Create tutor earning record (admin only or system generated)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        required_fields = ['tutorId', 'amount']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if tutor exists and has tutor role (supports dual-role users)
        tutor = User.query.get(data['tutorId'])
        if not tutor or not tutor.has_role('tutor'):
            return jsonify({'error': 'Tutor not found'}), 404
        
        earning = TutorEarning(
            id=f"earning_{uuid.uuid4().hex[:8]}",
            tutor_id=data['tutorId'],
            session_id=data.get('sessionId'),
            amount=data['amount'],
            currency=data.get('currency', 'GBP'),
            commission=data.get('commission', 0.15)
        )
        
        db.session.add(earning)
        db.session.commit()
        
        return jsonify({
            'earning': earning.to_dict(),
            'message': 'Earning record created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/tutor-earnings/<string:earning_id>/payout', methods=['POST'])
@jwt_required()
def process_tutor_payout(earning_id):
    """Process tutor payout (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        earning = TutorEarning.query.get(earning_id)
        if not earning:
            return jsonify({'error': 'Earning record not found'}), 404
        
        if earning.status != 'pending':
            return jsonify({'error': 'Earning already processed'}), 400
        
        earning.status = 'paid'
        earning.payout_date = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'earning': earning.to_dict(),
            'message': 'Payout processed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/tutor-earnings/bulk-payout', methods=['POST'])
@jwt_required()
def process_bulk_tutor_payout():
    """Process bulk tutor payouts (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        earning_ids = data.get('earningIds', [])
        
        if not earning_ids:
            return jsonify({'error': 'No earning IDs provided'}), 400
        
        earnings = TutorEarning.query.filter(
            TutorEarning.id.in_(earning_ids),
            TutorEarning.status == 'pending'
        ).all()
        
        if not earnings:
            return jsonify({'error': 'No pending earnings found'}), 404
        
        processed_count = 0
        for earning in earnings:
            earning.status = 'paid'
            earning.payout_date = datetime.utcnow()
            processed_count += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'Processed {processed_count} payouts successfully',
            'processedCount': processed_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Stripe Integration Endpoints

@api_bp.route('/payment/stripe/create-payment-intent', methods=['POST'])
def create_stripe_payment_intent():
    """Create Stripe PaymentIntent"""
    try:
        # Initialize Stripe with secret key
        stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
        
        data = request.get_json()
        amount = data.get('amount')  # Amount in cents
        currency = data.get('currency', 'gbp').lower()
        description = data.get('description', 'Payment')
        
        if not amount:
            return jsonify({'error': 'Amount is required'}), 400
            
        # Create PaymentIntent
        intent = stripe.PaymentIntent.create(
            amount=int(amount),
            currency=currency,
            description=description,
            automatic_payment_methods={'enabled': True}
        )
        
        return jsonify({
            'client_secret': intent.client_secret,
            'payment_intent_id': intent.id
        }), 200
        
    except stripe.error.StripeError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/payment/stripe/confirm-payment', methods=['POST'])
def confirm_stripe_payment():
    """Confirm Stripe payment and save to database with credits calculation"""
    try:
        stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
        
        data = request.get_json()
        payment_intent_id = data.get('payment_intent_id')
        guardian_id = data.get('guardian_id')  # Should be passed from frontend
        plan_type = data.get('plan_type', 'class')  # Plan type for credit calculation
        plan_id = data.get('plan_id')  # Dynamic plan ID
        credit_rate = data.get('credit_rate')  # Credit rate from plan
        
        if not payment_intent_id:
            return jsonify({'error': 'Payment Intent ID is required'}), 400
            
        # Retrieve PaymentIntent from Stripe
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status == 'succeeded':
            amount_paid = intent.amount / 100  # Convert from cents
            save_payment_method = data.get('save_payment_method', False)
            payment_method_nickname = data.get('payment_method_nickname', '')
            
            # Calculate credits based on plan data
            if plan_id and credit_rate:
                # Use dynamic plan credit rate
                credits_earned = math.ceil(amount_paid / credit_rate)
            else:
                # Fall back to plan type calculation
                credits_earned = calculate_credits_from_payment(amount_paid, plan_type)
            
            # Create payment record in database
            payment = Payment(
                id=f"payment_{uuid.uuid4().hex[:8]}",
                guardian_id=guardian_id,
                amount=amount_paid,
                currency=intent.currency.upper(),
                method='stripe',
                status='completed',
                transaction_id=payment_intent_id,
                credits_earned=credits_earned,
                processed_at=datetime.utcnow()
            )
            
            db.session.add(payment)
            db.session.commit()
            
            # Generate invoice for this payment
            from app.services.invoice_service import InvoiceService
            try:
                invoice = InvoiceService.generate_invoice_for_payment(
                    payment_id=payment.id,
                    guardian_id=guardian_id,
                    student_id=None,
                    course_id=None
                )
            except Exception as invoice_error:
                # Log the error but don't fail the payment
                current_app.logger.error(f"Failed to generate invoice: {invoice_error}")
                invoice = None
            
            # Save payment method if requested
            saved_payment_method = None
            if save_payment_method and guardian_id:
                try:
                    # Get the payment method from Stripe
                    stripe_pm = stripe.PaymentMethod.retrieve(intent.payment_method)
                    
                    if stripe_pm.type == 'card':
                        # Get or create Stripe customer
                        guardian = User.query.get(guardian_id)
                        if guardian:
                            stripe_customer = get_or_create_stripe_customer(guardian)
                            
                            # Attach payment method to customer
                            stripe.PaymentMethod.attach(
                                intent.payment_method,
                                customer=stripe_customer.stripe_customer_id
                            )
                            
                            # Save to our database
                            saved_payment_method = PaymentMethod(
                                user_id=guardian_id,
                                stripe_customer_id=stripe_customer.id,
                                stripe_payment_method_id=intent.payment_method,
                                type='card',
                                nickname=payment_method_nickname or f"{stripe_pm.card.brand.title()} ending in {stripe_pm.card.last4}",
                                card_type=stripe_pm.card.brand,
                                last4=stripe_pm.card.last4,
                                exp_month=stripe_pm.card.exp_month,
                                exp_year=stripe_pm.card.exp_year,
                                is_default=False
                            )
                            
                            db.session.add(saved_payment_method)
                            db.session.flush()  # Get the ID
                            
                            # Check if this should be the default
                            existing_methods = PaymentMethod.query.filter_by(
                                user_id=guardian_id,
                                is_active=True
                            ).count()
                            
                            if existing_methods == 1:  # First payment method
                                PaymentMethod.set_as_default(guardian_id, saved_payment_method.id)
                
                except Exception as pm_error:
                    print(f"Warning: Could not save payment method: {pm_error}")
                    # Don't fail the payment, just log the error
            
            # Update or create credit balance for guardian
            if guardian_id:
                credit_balance = CreditBalance.query.filter_by(guardian_id=guardian_id).first()
                if not credit_balance:
                    credit_balance = CreditBalance(
                        guardian_id=guardian_id,
                        total_credits=0.0,
                        used_credits=0.0,
                        available_credits=0.0
                    )
                    db.session.add(credit_balance)
                
                # Add credits to balance
                credit_balance.add_credits(credits_earned)
            
            db.session.add(payment)
            db.session.commit()
            
            response_data = {
                'payment': payment.to_dict(),
                'credits_earned': credits_earned,
                'credit_balance': credit_balance.to_dict() if guardian_id else None,
                'stripe_intent': {
                    'id': intent.id,
                    'status': intent.status,
                    'amount': intent.amount,
                    'currency': intent.currency
                },
                'message': f'Payment successful! {credits_earned} credits added to your account.'
            }
            
            if saved_payment_method:
                response_data['saved_payment_method'] = saved_payment_method.to_dict()
                response_data['message'] += ' Payment method saved for future use.'
            
            return jsonify(response_data), 200
        else:
            return jsonify({
                'error': f'Payment not successful. Status: {intent.status}'
            }), 400
            
    except stripe.error.StripeError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/payment/stripe/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhooks"""
    try:
        payload = request.get_data(as_text=True)
        sig_header = request.headers.get('Stripe-Signature')
        webhook_secret = current_app.config['STRIPE_WEBHOOK_SECRET']
        
        if not webhook_secret:
            return jsonify({'error': 'Webhook secret not configured'}), 400
            
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
        
        # Handle different event types
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            
            # Update payment status in database
            payment = Payment.query.filter_by(
                transaction_id=payment_intent['id']
            ).first()
            
            if payment:
                payment.status = 'completed'
                payment.processed_at = datetime.utcnow()
                db.session.commit()
                
        elif event['type'] == 'payment_intent.payment_failed':
            payment_intent = event['data']['object']
            
            # Update payment status in database
            payment = Payment.query.filter_by(
                transaction_id=payment_intent['id']
            ).first()
            
            if payment:
                payment.status = 'failed'
                db.session.commit()
        
        return jsonify({'status': 'success'}), 200
        
    except stripe.error.SignatureVerificationError as e:
        return jsonify({'error': 'Invalid signature'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/payment/stripe/create-subscription', methods=['POST'])
def create_stripe_subscription():
    """Create Stripe subscription for recurring payments"""
    try:
        stripe.api_key = current_app.config['STRIPE_SECRET_KEY']
        
        data = request.get_json()
        customer_email = data.get('customer_email')
        price_id = data.get('price_id')  # Stripe Price ID for recurring billing
        
        if not customer_email or not price_id:
            return jsonify({'error': 'Customer email and price ID are required'}), 400
            
        # Create or retrieve customer
        customers = stripe.Customer.list(email=customer_email)
        if customers.data:
            customer = customers.data[0]
        else:
            customer = stripe.Customer.create(email=customer_email)
        
        # Create subscription
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{'price': price_id}],
            payment_behavior='default_incomplete',
            payment_settings={'save_default_payment_method': 'on_subscription'},
            expand=['latest_invoice.payment_intent']
        )
        
        return jsonify({
            'subscription_id': subscription.id,
            'client_secret': subscription.latest_invoice.payment_intent.client_secret
        }), 200
        
    except stripe.error.StripeError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Credits Management Endpoints

@api_bp.route('/credits/balance/<string:guardian_id>', methods=['GET'])
@jwt_required()
def get_credit_balance(guardian_id):
    """Get credit balance for a guardian"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Check permissions (admin or the guardian themselves)
        if (current_user.account_type != 'admin' and current_user_id != guardian_id):
            return jsonify({'error': 'Access denied'}), 403
        
        credit_balance = CreditBalance.query.filter_by(guardian_id=guardian_id).first()
        if not credit_balance:
            # Create initial credit balance if it doesn't exist
            credit_balance = CreditBalance(
                guardian_id=guardian_id,
                total_credits=0.0,
                used_credits=0.0,
                available_credits=0.0
            )
            db.session.add(credit_balance)
            db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'credit_balance': credit_balance.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/credits/history/<string:guardian_id>', methods=['GET'])
@jwt_required()
def get_credit_history(guardian_id):
    """Get credit history (payments) for a guardian"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Check permissions
        if (current_user.account_type != 'admin' and current_user_id != guardian_id):
            return jsonify({'error': 'Access denied'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        payments = Payment.query.filter_by(
            guardian_id=guardian_id,
            status='completed'
        ).order_by(Payment.processed_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Calculate total credits earned
        total_credits = db.session.query(db.func.sum(Payment.credits_earned)).filter_by(
            guardian_id=guardian_id,
            status='completed'
        ).scalar() or 0
        
        return jsonify({
            'payments': [payment.to_dict() for payment in payments.items],
            'totalPayments': payments.total,
            'totalPages': payments.pages,
            'currentPage': page,
            'hasNext': payments.has_next,
            'hasPrev': payments.has_prev,
            'totalCreditsEarned': total_credits
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/credits/use', methods=['POST'])
@jwt_required()
def use_credits():
    """Use credits for a purchase/enrollment"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        data = request.get_json()
        guardian_id = data.get('guardian_id')
        amount = data.get('amount')
        description = data.get('description', 'Credit usage')
        
        if not guardian_id or not amount:
            return jsonify({'error': 'Guardian ID and amount are required'}), 400
        
        # Check permissions
        if (current_user.account_type != 'admin' and current_user_id != guardian_id):
            return jsonify({'error': 'Access denied'}), 403
        
        credit_balance = CreditBalance.query.filter_by(guardian_id=guardian_id).first()
        if not credit_balance:
            return jsonify({'error': 'No credit balance found'}), 404
        
        if credit_balance.available_credits < amount:
            return jsonify({
                'error': f'Insufficient credits. Available: {credit_balance.available_credits}, Required: {amount}'
            }), 400
        
        # Use the credits
        success = credit_balance.use_credits(amount)
        if success:
            db.session.commit()
            
            return jsonify({
                'message': f'Successfully used {amount} credits',
                'credit_balance': credit_balance.to_dict(),
                'credits_used': amount
            }), 200
        else:
            return jsonify({'error': 'Failed to use credits'}), 400
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/credits/add', methods=['POST'])
@jwt_required()
def add_credits():
    """Add credits manually (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        guardian_id = data.get('guardian_id')
        amount = data.get('amount')
        reason = data.get('reason', 'Manual credit addition by admin')
        
        if not guardian_id or not amount:
            return jsonify({'error': 'Guardian ID and amount are required'}), 400
        
        # Check if guardian exists
        guardian = User.query.filter_by(id=guardian_id, account_type='guardian').first()
        if not guardian:
            return jsonify({'error': 'Guardian not found'}), 404
        
        credit_balance = CreditBalance.query.filter_by(guardian_id=guardian_id).first()
        if not credit_balance:
            credit_balance = CreditBalance(
                guardian_id=guardian_id,
                total_credits=0.0,
                used_credits=0.0,
                available_credits=0.0
            )
            db.session.add(credit_balance)
        
        # Add credits
        credit_balance.add_credits(amount)
        
        # Create a payment record for tracking
        payment = Payment(
            id=f"payment_{uuid.uuid4().hex[:8]}",
            guardian_id=guardian_id,
            amount=amount,
            currency='GBP',
            method='manual_admin',
            status='completed',
            transaction_id=f"manual_{uuid.uuid4().hex[:8]}",
            credits_earned=amount,
            processed_at=datetime.utcnow()
        )
        
        db.session.add(payment)
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully added {amount} credits',
            'credit_balance': credit_balance.to_dict(),
            'payment': payment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Pricing Plan Management Endpoints

@api_bp.route('/plans', methods=['GET'])
def get_pricing_plans():
    """Get all active pricing plans"""
    try:
        plans = PricingPlan.query.filter_by(is_active=True).order_by(PricingPlan.display_order).all()
        
        return jsonify({
            'plans': [plan.to_dict() for plan in plans]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/plans', methods=['GET'])
@jwt_required()
def get_all_pricing_plans():
    """Get all pricing plans (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        plans = PricingPlan.query.order_by(PricingPlan.display_order).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            'plans': [plan.to_dict() for plan in plans.items],
            'totalPlans': plans.total,
            'totalPages': plans.pages,
            'currentPage': page,
            'hasNext': plans.has_next,
            'hasPrev': plans.has_prev
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/plans', methods=['POST'])
@jwt_required()
def create_pricing_plan():
    """Create new pricing plan (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        required_fields = ['name', 'price', 'period', 'creditRate']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        plan = PricingPlan(
            name=data['name'],
            price=data['price'],
            currency=data.get('currency', 'GBP'),
            period=data['period'],
            credit_rate=data['creditRate'],
            features=data.get('features', []),
            is_popular=data.get('isPopular', False),
            is_active=data.get('isActive', True),
            display_order=data.get('displayOrder', 0)
        )
        
        db.session.add(plan)
        db.session.commit()
        
        return jsonify({
            'plan': plan.to_dict(),
            'message': 'Pricing plan created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/plans/<string:plan_id>', methods=['PUT'])
@jwt_required()
def update_pricing_plan(plan_id):
    """Update pricing plan (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        plan = PricingPlan.query.get(plan_id)
        if not plan:
            return jsonify({'error': 'Plan not found'}), 404
        
        data = request.get_json()
        
        # Update fields if provided
        if 'name' in data:
            plan.name = data['name']
        if 'price' in data:
            plan.price = data['price']
        if 'currency' in data:
            plan.currency = data['currency']
        if 'period' in data:
            plan.period = data['period']
        if 'creditRate' in data:
            plan.credit_rate = data['creditRate']
        if 'features' in data:
            plan.features = data['features']
        if 'isPopular' in data:
            plan.is_popular = data['isPopular']
        if 'isActive' in data:
            plan.is_active = data['isActive']
        if 'displayOrder' in data:
            plan.display_order = data['displayOrder']
        
        plan.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'plan': plan.to_dict(),
            'message': 'Pricing plan updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/plans/<string:plan_id>', methods=['DELETE'])
@jwt_required()
def delete_pricing_plan(plan_id):
    """Delete pricing plan (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        plan = PricingPlan.query.get(plan_id)
        if not plan:
            return jsonify({'error': 'Plan not found'}), 404
        
        db.session.delete(plan)
        db.session.commit()
        
        return jsonify({
            'message': 'Pricing plan deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/admin/plans/<string:plan_id>/toggle-active', methods=['POST'])
@jwt_required()
def toggle_plan_active(plan_id):
    """Toggle plan active status (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        plan = PricingPlan.query.get(plan_id)
        if not plan:
            return jsonify({'error': 'Plan not found'}), 404
        
        plan.is_active = not plan.is_active
        plan.updated_at = datetime.utcnow()
        db.session.commit()
        
        status = 'activated' if plan.is_active else 'deactivated'
        
        return jsonify({
            'plan': plan.to_dict(),
            'message': f'Plan {status} successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Saved Payment Methods Endpoints

@api_bp.route("/payment-methods", methods=["GET"])
@jwt_required()
def get_payment_methods():
    """Get all saved payment methods for the current user"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({"error": "User not found"}), 404
        
        # Only guardians can have saved payment methods for now
        if current_user.account_type != "guardian":
            return jsonify({"error": "Only guardians can have saved payment methods"}), 403
        
        payment_methods = PaymentMethod.query.filter_by(
            user_id=current_user_id,
            is_active=True
        ).order_by(PaymentMethod.is_default.desc(), PaymentMethod.created_at.desc()).all()
        
        return jsonify({
            "paymentMethods": [pm.to_dict() for pm in payment_methods]
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route("/payment-methods", methods=["POST"])
@jwt_required()
def create_payment_method():
    """Create a new saved payment method"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({"error": "User not found"}), 404
        
        if current_user.account_type != "guardian":
            return jsonify({"error": "Only guardians can create payment methods"}), 403
        
        data = request.get_json()
        payment_type = data.get("type")
        nickname = data.get("nickname", "")
        set_as_default = data.get("setAsDefault", False)
        
        if not payment_type or payment_type not in ["card", "bank", "paypal"]:
            return jsonify({"error": "Invalid payment method type"}), 400
        
        # Create payment method based on type
        payment_method = PaymentMethod(
            user_id=current_user_id,
            type=payment_type,
            nickname=nickname,
            is_default=False  # We will set this properly below
        )
        
        # Handle card-specific data
        if payment_type == "card":
            stripe_payment_method_id = data.get("stripePaymentMethodId")
            card_type = data.get("cardType", "").lower()
            last4 = data.get("last4", "")
            exp_month = data.get("expMonth")
            exp_year = data.get("expYear")
            
            if not stripe_payment_method_id:
                return jsonify({"error": "Stripe payment method ID required for cards"}), 400
            
            payment_method.stripe_payment_method_id = stripe_payment_method_id
            payment_method.card_type = card_type
            payment_method.last4 = last4
            payment_method.exp_month = exp_month
            payment_method.exp_year = exp_year
            
            # Get or create Stripe customer
            stripe_customer = get_or_create_stripe_customer(current_user)
            payment_method.stripe_customer_id = stripe_customer.id
            
        elif payment_type == "bank":
            bank_name = data.get("bankName", "")
            account_type = data.get("accountType", "")
            last4 = data.get("last4", "")
            
            payment_method.bank_name = bank_name
            payment_method.account_type = account_type
            payment_method.last4 = last4
            
        elif payment_type == "paypal":
            paypal_email = data.get("email", "")
            paypal_account_id = data.get("accountId", "")
            
            if not paypal_email:
                return jsonify({"error": "PayPal email required"}), 400
            
            payment_method.paypal_email = paypal_email
            payment_method.paypal_account_id = paypal_account_id
        
        db.session.add(payment_method)
        db.session.flush()  # Get the ID
        
        # Set as default if requested or if it is the first payment method
        existing_methods = PaymentMethod.query.filter_by(
            user_id=current_user_id, 
            is_active=True
        ).count()
        
        if set_as_default or existing_methods == 1:
            PaymentMethod.set_as_default(current_user_id, payment_method.id)
        
        db.session.commit()
        
        return jsonify({
            "paymentMethod": payment_method.to_dict(),
            "message": "Payment method saved successfully"
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/payment-methods/<string:method_id>", methods=["DELETE"])
@jwt_required()
def delete_payment_method(method_id):
    """Delete a saved payment method"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({"error": "User not found"}), 404
        
        payment_method = PaymentMethod.query.filter_by(
            id=method_id, 
            user_id=current_user_id
        ).first()
        
        if not payment_method:
            return jsonify({"error": "Payment method not found"}), 404
        
        was_default = payment_method.is_default
        
        # If this payment method is linked to Stripe, detach it
        if payment_method.stripe_payment_method_id:
            try:
                stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]
                stripe.PaymentMethod.detach(payment_method.stripe_payment_method_id)
            except Exception as stripe_error:
                print(f"Warning: Could not detach Stripe payment method: {stripe_error}")
        
        # Soft delete by marking as inactive
        payment_method.is_active = False
        payment_method.is_default = False
        
        # If this was the default, set another one as default
        if was_default:
            next_method = PaymentMethod.query.filter_by(
                user_id=current_user_id,
                is_active=True
            ).filter(PaymentMethod.id != method_id).first()
            
            if next_method:
                next_method.is_default = True
        
        db.session.commit()
        
        return jsonify({
            "message": "Payment method deleted successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/payment-methods/<string:method_id>/set-default", methods=["POST"])
@jwt_required()
def set_default_payment_method(method_id):
    """Set a payment method as default"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({"error": "User not found"}), 404
        
        payment_method = PaymentMethod.query.filter_by(
            id=method_id,
            user_id=current_user_id,
            is_active=True
        ).first()
        
        if not payment_method:
            return jsonify({"error": "Payment method not found"}), 404
        
        # Set this method as default
        PaymentMethod.set_as_default(current_user_id, method_id)
        db.session.commit()
        
        return jsonify({
            "paymentMethod": payment_method.to_dict(),
            "message": "Default payment method updated successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

def get_or_create_stripe_customer(user):
    """Get existing Stripe customer or create a new one"""
    stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]
    
    # Check if user already has a Stripe customer
    stripe_customer_record = StripeCustomer.query.filter_by(user_id=user.id).first()
    
    if stripe_customer_record:
        return stripe_customer_record
    
    # Create new Stripe customer
    try:
        stripe_customer = stripe.Customer.create(
            email=user.email,
            name=user.profile.get("name", "") if user.profile else "",
            metadata={"user_id": user.id}
        )
        
        # Save to database
        customer_record = StripeCustomer(
            user_id=user.id,
            stripe_customer_id=stripe_customer.id,
            email=user.email
        )
        
        db.session.add(customer_record)
        db.session.commit()
        
        return customer_record
        
    except Exception as e:
        print(f"Error creating Stripe customer: {e}")
        raise e


@api_bp.route("/payment/stripe/create-setup-intent", methods=["POST"])
@jwt_required()
def create_stripe_setup_intent():
    """Create Stripe SetupIntent for saving payment methods without payment"""
    try:
        stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]
        
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({"error": "User not found"}), 404
        
        if current_user.account_type != "guardian":
            return jsonify({"error": "Only guardians can save payment methods"}), 403
        
        # Get or create Stripe customer
        stripe_customer = get_or_create_stripe_customer(current_user)
        
        # Create SetupIntent
        setup_intent = stripe.SetupIntent.create(
            customer=stripe_customer.stripe_customer_id,
            payment_method_types=["card"],
            usage="off_session"
        )
        
        return jsonify({
            "client_secret": setup_intent.client_secret,
            "setup_intent_id": setup_intent.id
        }), 200
        
    except stripe.error.StripeError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route("/payment/stripe/confirm-setup-intent", methods=["POST"])
@jwt_required()
def confirm_stripe_setup_intent():
    """Confirm SetupIntent and save payment method"""
    try:
        stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]
        
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({"error": "User not found"}), 404
        
        if current_user.account_type != "guardian":
            return jsonify({"error": "Only guardians can save payment methods"}), 403
        
        data = request.get_json()
        setup_intent_id = data.get("setup_intent_id")
        payment_method_nickname = data.get("nickname", "")
        set_as_default = data.get("set_as_default", False)
        
        if not setup_intent_id:
            return jsonify({"error": "Setup Intent ID is required"}), 400
            
        # Retrieve SetupIntent from Stripe
        setup_intent = stripe.SetupIntent.retrieve(setup_intent_id)
        
        if setup_intent.status == "succeeded":
            # Get the payment method from Stripe
            stripe_pm = stripe.PaymentMethod.retrieve(setup_intent.payment_method)
            
            if stripe_pm.type == "card":
                # Get Stripe customer
                stripe_customer = StripeCustomer.query.filter_by(user_id=current_user_id).first()
                
                if not stripe_customer:
                    return jsonify({"error": "Stripe customer not found"}), 404
                
                # Save to our database
                saved_payment_method = PaymentMethod(
                    user_id=current_user_id,
                    stripe_customer_id=stripe_customer.id,
                    stripe_payment_method_id=setup_intent.payment_method,
                    type="card",
                    nickname=payment_method_nickname or f"{stripe_pm.card.brand.title()} ending in {stripe_pm.card.last4}",
                    card_type=stripe_pm.card.brand,
                    last4=stripe_pm.card.last4,
                    exp_month=stripe_pm.card.exp_month,
                    exp_year=stripe_pm.card.exp_year,
                    is_default=False,
                    verified=True
                )
                
                db.session.add(saved_payment_method)
                db.session.flush()  # Get the ID
                
                # Set as default if requested or if it is the first payment method
                existing_methods = PaymentMethod.query.filter_by(
                    user_id=current_user_id,
                    is_active=True
                ).count()
                
                if set_as_default or existing_methods == 1:
                    PaymentMethod.set_as_default(current_user_id, saved_payment_method.id)
                
                db.session.commit()
                
                return jsonify({
                    "payment_method": saved_payment_method.to_dict(),
                    "message": "Payment method saved successfully"
                }), 200
            else:
                return jsonify({"error": "Only card payment methods are supported"}), 400
        else:
            return jsonify({
                "error": f"Setup not successful. Status: {setup_intent.status}"
            }), 400
            
    except stripe.error.StripeError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@api_bp.route("/payment/stripe/charge-saved-card", methods=["POST"])
@jwt_required()
def charge_saved_card():
    """Charge a saved payment method"""
    try:
        stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]
        
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({"error": "User not found"}), 404
        
        if current_user.account_type != "guardian":
            return jsonify({"error": "Only guardians can make payments"}), 403
        
        data = request.get_json()
        payment_method_id = data.get("payment_method_id")
        amount = data.get("amount")  # Amount in cents
        currency = data.get("currency", "gbp").lower()
        description = data.get("description", "Payment with saved card")
        plan_type = data.get("plan_type", "class")
        plan_id = data.get("plan_id")
        credit_rate = data.get("credit_rate")
        
        if not payment_method_id or not amount:
            return jsonify({"error": "Payment method ID and amount are required"}), 400
        
        # Get the saved payment method
        saved_payment_method = PaymentMethod.query.filter_by(
            id=payment_method_id,
            user_id=current_user_id,
            is_active=True
        ).first()
        
        if not saved_payment_method:
            return jsonify({"error": "Payment method not found"}), 404
        
        if not saved_payment_method.stripe_payment_method_id:
            return jsonify({"error": "This payment method cannot be charged"}), 400
        
        # Get Stripe customer
        stripe_customer = StripeCustomer.query.get(saved_payment_method.stripe_customer_id)
        
        if not stripe_customer:
            return jsonify({"error": "Stripe customer not found"}), 404
        
        # Create PaymentIntent with saved payment method
        intent = stripe.PaymentIntent.create(
            amount=int(amount),
            currency=currency,
            customer=stripe_customer.stripe_customer_id,
            payment_method=saved_payment_method.stripe_payment_method_id,
            description=description,
            confirm=True,
            off_session=True
        )
        
        if intent.status == "succeeded":
            amount_paid = intent.amount / 100  # Convert from cents
            
            # Calculate credits
            if plan_id and credit_rate:
                credits_earned = math.ceil(amount_paid / credit_rate)
            else:
                credits_earned = calculate_credits_from_payment(amount_paid, plan_type)
            
            # Create payment record
            payment = Payment(
                id=f"payment_{uuid.uuid4().hex[:8]}",
                guardian_id=current_user_id,
                amount=amount_paid,
                currency=intent.currency.upper(),
                method="stripe_saved",
                status="completed",
                transaction_id=intent.id,
                credits_earned=credits_earned,
                processed_at=datetime.utcnow()
            )
            
            # Update credit balance
            credit_balance = CreditBalance.query.filter_by(guardian_id=current_user_id).first()
            if not credit_balance:
                credit_balance = CreditBalance(
                    guardian_id=current_user_id,
                    total_credits=0.0,
                    used_credits=0.0,
                    available_credits=0.0
                )
                db.session.add(credit_balance)
            
            credit_balance.add_credits(credits_earned)
            
            # Update payment method last used
            saved_payment_method.update_last_used()
            
            db.session.add(payment)
            db.session.commit()
            
            # Generate invoice for this payment
            from app.services.invoice_service import InvoiceService
            try:
                invoice = InvoiceService.generate_invoice_for_payment(
                    payment_id=payment.id,
                    guardian_id=current_user_id,
                    student_id=None,
                    course_id=None
                )
            except Exception as invoice_error:
                # Log the error but don't fail the payment
                current_app.logger.error(f"Failed to generate invoice: {invoice_error}")
                invoice = None
            
            return jsonify({
                "payment": payment.to_dict(),
                "credits_earned": credits_earned,
                "credit_balance": credit_balance.to_dict(),
                "message": f"Payment successful! {credits_earned} credits added to your account."
            }), 200
            
        else:
            return jsonify({
                "error": f"Payment failed. Status: {intent.status}",
                "requires_action": intent.status == "requires_action",
                "client_secret": intent.client_secret if intent.status == "requires_action" else None
            }), 400
            
    except stripe.error.CardError as e:
        return jsonify({"error": "Your card was declined"}), 400
    except stripe.error.StripeError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

