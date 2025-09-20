from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, CreditBalance, StudentCreditAllocation, CreditTransaction
from app.api import api_bp
from datetime import datetime
import uuid

@api_bp.route('/credits/balance/<string:guardian_id>/detailed', methods=['GET'])
@jwt_required()
def get_guardian_credit_balance(guardian_id):
    """Get guardian's credit balance with student allocations"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Check permissions
        if current_user.account_type != 'admin' and current_user_id != guardian_id:
            return jsonify({'error': 'Access denied'}), 403
        
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
            db.session.commit()
        
        # Get student allocations
        allocations = StudentCreditAllocation.query.filter_by(guardian_id=guardian_id).all()
        
        # Recalculate available credits to ensure accuracy
        credit_balance.recalculate_available_credits()
        db.session.commit()
        
        return jsonify({
            'creditBalance': credit_balance.to_dict(),
            'studentAllocations': [allocation.to_dict() for allocation in allocations],
            'totalAllocated': sum(allocation.allocated_credits for allocation in allocations)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/credits/allocate', methods=['POST'])
@jwt_required()
def allocate_credits_to_student():
    """Allocate credits from guardian to student"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Only guardians can allocate credits
        if current_user.account_type != 'guardian':
            return jsonify({'error': 'Only guardians can allocate credits'}), 403
        
        data = request.get_json()
        student_id = data.get('student_id')
        credits = data.get('credits', 0)
        reason = data.get('reason', 'Manual allocation')
        
        if not student_id or credits <= 0:
            return jsonify({'error': 'Invalid student_id or credits amount'}), 400
        
        # Verify student exists and is linked to this guardian
        student = User.query.get(student_id)
        if not student or student.account_type != 'student':
            return jsonify({'error': 'Student not found'}), 404
        
        # Get guardian's credit balance
        credit_balance = CreditBalance.query.filter_by(guardian_id=current_user_id).first()
        if not credit_balance:
            return jsonify({'error': 'No credit balance found'}), 404
        
        # Check if guardian has enough available credits
        if credit_balance.available_credits < credits:
            return jsonify({
                'error': f'Insufficient credits. Available: {credit_balance.available_credits}, Required: {credits}'
            }), 400
        
        # Get or create student allocation
        allocation = StudentCreditAllocation.query.filter_by(
            guardian_id=current_user_id,
            student_id=student_id
        ).first()
        
        if not allocation:
            allocation = StudentCreditAllocation(
                guardian_id=current_user_id,
                student_id=student_id,
                allocated_credits=0.0,
                used_credits=0.0,
                remaining_credits=0.0,
                allocation_reason=reason
            )
            db.session.add(allocation)
        
        # Allocate credits
        if credit_balance.allocate_credits_to_student(credits):
            allocation.allocate_credits(credits, reason)
            
            # Log the transaction
            transaction = CreditTransaction(
                guardian_id=current_user_id,
                student_id=student_id,
                allocation_id=allocation.id,
                transaction_type='allocation',
                credits=credits,
                description=f'Allocated {credits} credits to student: {reason}'
            )
            db.session.add(transaction)
            db.session.commit()
            
            return jsonify({
                'message': f'Successfully allocated {credits} credits to student',
                'allocation': allocation.to_dict(),
                'creditBalance': credit_balance.to_dict()
            }), 200
        else:
            return jsonify({'error': 'Failed to allocate credits'}), 400
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/credits/allocations/<string:guardian_id>', methods=['GET'])
@jwt_required()
def get_student_allocations(guardian_id):
    """Get all student credit allocations for a guardian"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Check permissions
        if current_user.account_type != 'admin' and current_user_id != guardian_id:
            return jsonify({'error': 'Access denied'}), 403
        
        allocations = StudentCreditAllocation.query.filter_by(guardian_id=guardian_id).all()
        
        # Enrich with student information
        result = []
        for allocation in allocations:
            student = User.query.get(allocation.student_id)
            allocation_dict = allocation.to_dict()
            allocation_dict['studentName'] = student.profile.get('name', student.email) if student and student.profile else student.email if student else 'Unknown'
            allocation_dict['studentEmail'] = student.email if student else 'Unknown'
            result.append(allocation_dict)
        
        return jsonify({'allocations': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/credits/use', methods=['POST'])
@jwt_required()
def use_student_credits():
    """Use credits from a student's allocation"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        student_id = data.get('student_id')
        credits = data.get('credits', 0)
        usage_type = data.get('usage_type', 'general')
        description = data.get('description', 'Credit usage')
        session_id = data.get('session_id')
        enrollment_id = data.get('enrollment_id')
        
        if not student_id or credits <= 0:
            return jsonify({'error': 'Invalid student_id or credits amount'}), 400
        
        # Find the student's allocation
        allocation = StudentCreditAllocation.query.filter_by(student_id=student_id).first()
        if not allocation:
            return jsonify({'error': 'No credit allocation found for student'}), 404
        
        # Use the credits
        if allocation.use_credits(credits):
            # Update guardian's used credits
            credit_balance = CreditBalance.query.filter_by(guardian_id=allocation.guardian_id).first()
            if credit_balance:
                credit_balance.used_credits += credits
                credit_balance.last_updated = datetime.utcnow()
            
            # Log the transaction
            transaction = CreditTransaction(
                guardian_id=allocation.guardian_id,
                student_id=student_id,
                allocation_id=allocation.id,
                transaction_type='usage',
                credits=credits,
                description=description,
                related_session_id=session_id,
                related_enrollment_id=enrollment_id
            )
            db.session.add(transaction)
            db.session.commit()
            
            return jsonify({
                'message': f'Successfully used {credits} credits',
                'allocation': allocation.to_dict(),
                'remainingCredits': allocation.remaining_credits
            }), 200
        else:
            return jsonify({
                'error': f'Insufficient credits. Available: {allocation.remaining_credits}, Required: {credits}'
            }), 400
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/credits/transfer', methods=['POST'])
@jwt_required()
def transfer_credits_between_students():
    """Transfer credits from one student to another"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Only guardians can transfer credits
        if current_user.account_type != 'guardian':
            return jsonify({'error': 'Only guardians can transfer credits'}), 403
        
        data = request.get_json()
        from_student_id = data.get('from_student_id')
        to_student_id = data.get('to_student_id')
        credits = data.get('credits', 0)
        reason = data.get('reason', 'Credit transfer')
        
        if not from_student_id or not to_student_id or credits <= 0:
            return jsonify({'error': 'Invalid parameters'}), 400
        
        if from_student_id == to_student_id:
            return jsonify({'error': 'Cannot transfer credits to the same student'}), 400
        
        # Get allocations for both students
        from_allocation = StudentCreditAllocation.query.filter_by(
            guardian_id=current_user_id,
            student_id=from_student_id
        ).first()
        
        to_allocation = StudentCreditAllocation.query.filter_by(
            guardian_id=current_user_id,
            student_id=to_student_id
        ).first()
        
        if not from_allocation:
            return jsonify({'error': 'Source student has no credit allocation'}), 404
        
        # Create destination allocation if it doesn't exist
        if not to_allocation:
            to_allocation = StudentCreditAllocation(
                guardian_id=current_user_id,
                student_id=to_student_id,
                allocated_credits=0.0,
                used_credits=0.0,
                remaining_credits=0.0,
                allocation_reason=reason
            )
            db.session.add(to_allocation)
        
        # Transfer credits
        if from_allocation.transfer_credits(credits, to_allocation):
            # Log transactions
            from_transaction = CreditTransaction(
                guardian_id=current_user_id,
                student_id=from_student_id,
                allocation_id=from_allocation.id,
                transaction_type='transfer',
                credits=-credits,
                description=f'Transferred {credits} credits to another student: {reason}'
            )
            
            to_transaction = CreditTransaction(
                guardian_id=current_user_id,
                student_id=to_student_id,
                allocation_id=to_allocation.id,
                transaction_type='transfer',
                credits=credits,
                description=f'Received {credits} credits from another student: {reason}'
            )
            
            db.session.add_all([from_transaction, to_transaction])
            db.session.commit()
            
            return jsonify({
                'message': f'Successfully transferred {credits} credits',
                'fromAllocation': from_allocation.to_dict(),
                'toAllocation': to_allocation.to_dict()
            }), 200
        else:
            return jsonify({
                'error': f'Insufficient credits to transfer. Available: {from_allocation.remaining_credits}, Required: {credits}'
            }), 400
            
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/credits/student-allocations/<string:student_id>', methods=['GET'])
@jwt_required()
def get_student_credit_allocations(student_id):
    """Get all credit allocations for a specific student"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Check permissions - student can access their own, admins can access any
        if current_user.account_type != 'admin' and current_user_id != student_id:
            return jsonify({'error': 'Access denied'}), 403
        
        allocations = StudentCreditAllocation.query.filter_by(student_id=student_id).all()
        
        # Enrich with guardian information
        result = []
        for allocation in allocations:
            guardian = User.query.get(allocation.guardian_id)
            allocation_dict = allocation.to_dict()
            allocation_dict['guardianName'] = guardian.profile.get('name', guardian.email) if guardian and guardian.profile else guardian.email if guardian else 'Unknown'
            allocation_dict['guardianEmail'] = guardian.email if guardian else 'Unknown'
            result.append(allocation_dict)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/credits/transactions/<string:guardian_id>', methods=['GET'])
@jwt_required()
def get_credit_transactions(guardian_id):
    """Get credit transaction history for a guardian"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Check permissions
        if current_user.account_type != 'admin' and current_user_id != guardian_id:
            return jsonify({'error': 'Access denied'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        transactions = CreditTransaction.query.filter_by(
            guardian_id=guardian_id
        ).order_by(CreditTransaction.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Enrich with student names
        result = []
        for transaction in transactions.items:
            transaction_dict = transaction.to_dict()
            if transaction.student_id:
                student = User.query.get(transaction.student_id)
                transaction_dict['studentName'] = student.profile.get('name', student.email) if student and student.profile else student.email if student else 'Unknown'
            result.append(transaction_dict)
        
        return jsonify({
            'transactions': result,
            'totalTransactions': transactions.total,
            'totalPages': transactions.pages,
            'currentPage': page,
            'hasNext': transactions.has_next,
            'hasPrev': transactions.has_prev
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500