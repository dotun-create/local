from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User, Invoice
from app.services.invoice_service import InvoiceService
from app import db


@api_bp.route('/invoices/guardian', methods=['GET'])
@jwt_required()
def get_guardian_invoices():
    """Get invoices for authenticated guardian"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        if current_user.account_type != 'guardian':
            return jsonify({'error': 'Guardian access required'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        result = InvoiceService.get_guardian_invoices(
            guardian_id=current_user_id,
            page=page,
            per_page=per_page
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/invoices/admin', methods=['GET'])
@jwt_required()
def get_all_invoices():
    """Get all invoices for admin view"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        guardian_id = request.args.get('guardian_id')
        search = request.args.get('search')
        
        result = InvoiceService.get_all_invoices(
            page=page,
            per_page=per_page,
            status=status,
            guardian_id=guardian_id,
            search=search
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/invoices/admin/stats', methods=['GET'])
@jwt_required()
def get_invoice_stats():
    """Get invoice statistics for admin dashboard"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        stats = InvoiceService.get_invoice_stats()
        return jsonify(stats), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/invoices/<invoice_id>', methods=['GET'])
@jwt_required()
def get_invoice_detail(invoice_id):
    """Get specific invoice details"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        invoice = Invoice.query.get(invoice_id)
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
        
        # Check permissions
        if current_user.account_type == 'guardian':
            if invoice.guardian_id != current_user_id:
                return jsonify({'error': 'Access denied'}), 403
        elif current_user.account_type not in ['admin']:
            return jsonify({'error': 'Access denied'}), 403
        
        return jsonify(invoice.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/invoices/create', methods=['POST'])
@jwt_required()
def create_manual_invoice():
    """Create manual invoice (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        required_fields = ['guardian_id', 'amount', 'description']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate guardian exists
        guardian = User.query.get(data['guardian_id'])
        if not guardian or guardian.account_type != 'guardian':
            return jsonify({'error': 'Invalid guardian'}), 400
        
        invoice = InvoiceService.create_manual_invoice(
            guardian_id=data['guardian_id'],
            student_id=data.get('student_id'),
            course_id=data.get('course_id'),
            amount=float(data['amount']),
            description=data['description'],
            notes=data.get('notes')
        )
        
        return jsonify(invoice.to_dict()), 201
        
    except ValueError as ve:
        return jsonify({'error': f'Invalid data: {str(ve)}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/invoices/<invoice_id>/status', methods=['PUT'])
@jwt_required()
def update_invoice_status(invoice_id):
    """Update invoice status (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        invoice = Invoice.query.get(invoice_id)
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
        
        data = request.get_json()
        if not data or 'status' not in data:
            return jsonify({'error': 'Status is required'}), 400
        
        valid_statuses = ['pending', 'paid', 'cancelled', 'overdue']
        if data['status'] not in valid_statuses:
            return jsonify({'error': f'Invalid status. Must be one of: {valid_statuses}'}), 400
        
        invoice.status = data['status']
        
        if data['status'] == 'paid' and not invoice.payment_date:
            from datetime import datetime
            invoice.payment_date = datetime.now()
        
        db.session.commit()
        
        return jsonify(invoice.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@api_bp.route('/invoices/<invoice_id>/pdf', methods=['GET'])
@jwt_required()
def download_invoice_pdf(invoice_id):
    """Download invoice PDF"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        invoice = Invoice.query.get(invoice_id)
        if not invoice:
            return jsonify({'error': 'Invoice not found'}), 404
        
        # Check permissions
        if current_user.account_type == 'guardian':
            if invoice.guardian_id != current_user_id:
                return jsonify({'error': 'Access denied'}), 403
        elif current_user.account_type not in ['admin']:
            return jsonify({'error': 'Access denied'}), 403
        
        # For now, return invoice data (PDF generation can be implemented later)
        return jsonify({
            'message': 'PDF generation not yet implemented',
            'invoice': invoice.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500