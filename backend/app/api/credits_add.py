from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, CreditBalance, CreditTransaction, Payment
from app.api import api_bp
from datetime import datetime
import uuid


@api_bp.route('/credits/add', methods=['POST'])
@jwt_required()
def add_credits_to_guardian():
    """Add credits to guardian account (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        guardian_id = data.get('guardian_id')
        amount = data.get('amount')
        reason = data.get('reason', 'Manual credit addition by admin')
        
        if not guardian_id or amount is None:
            return jsonify({'error': 'Guardian ID and amount are required'}), 400
        
        if amount <= 0:
            return jsonify({'error': 'Amount must be greater than 0'}), 400
        
        # Verify guardian exists
        guardian = User.query.get(guardian_id)
        if not guardian or guardian.account_type != 'guardian':
            return jsonify({'error': 'Guardian not found'}), 404
        
        # Get or create credit balance
        credit_balance = CreditBalance.query.filter_by(guardian_id=guardian_id).first()
        if not credit_balance:
            credit_balance = CreditBalance(
                guardian_id=guardian_id,
                total_credits=0.0,
                used_credits=0.0,
                available_credits=0.0
            )
            db.session.add(credit_balance)
        
        # Create payment record for admin credit addition
        payment = Payment(
            id=f"payment_{uuid.uuid4().hex[:8]}",
            guardian_id=guardian_id,
            amount=0.0,  # No monetary transaction for admin credit addition
            currency='GBP',
            method='admin_credit',
            status='completed',
            transaction_id=f"admin_credit_{uuid.uuid4().hex[:8]}",
            credits_earned=amount,
            processed_at=datetime.utcnow(),
            description=reason
        )
        
        # Add credits to balance
        credit_balance.add_credits(amount)
        
        # Create credit transaction record
        transaction = CreditTransaction(
            id=f"txn_{uuid.uuid4().hex[:8]}",
            guardian_id=guardian_id,
            amount=amount,
            transaction_type='credit_addition',
            description=reason,
            created_by=current_user_id,
            created_at=datetime.utcnow()
        )
        
        db.session.add(payment)
        db.session.add(transaction)
        db.session.commit()
        
        # Generate invoice for the credit addition
        from app.services.invoice_service import InvoiceService
        try:
            invoice = InvoiceService.generate_invoice_for_payment(
                payment_id=payment.id,
                guardian_id=guardian_id,
                student_id=None,
                course_id=None
            )
        except Exception as invoice_error:
            # Log the error but don't fail the credit addition
            import logging
            logging.error(f"Failed to generate invoice for credit addition: {invoice_error}")
            invoice = None
        
        return jsonify({
            'message': f'{amount} credits added successfully to guardian account',
            'credit_balance': credit_balance.to_dict(),
            'transaction': transaction.to_dict(),
            'payment': payment.to_dict(),
            'invoice_created': invoice is not None
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500