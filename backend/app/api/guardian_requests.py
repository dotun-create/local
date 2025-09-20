"""
Guardian-Student Request Management API

This module handles the API endpoints for managing guardian-student linking requests,
including creating requests, approving/rejecting them, and managing active links.
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, GuardianStudentRequest, GuardianStudentLink
from datetime import datetime
import logging

# Create blueprint
guardian_requests_bp = Blueprint('guardian_requests', __name__)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@guardian_requests_bp.route('/guardian/pending-requests', methods=['GET'])
@jwt_required()
def get_pending_requests():
    """
    Get all pending student requests for a guardian
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or user.account_type != 'guardian':
            return jsonify({'error': 'Guardian access required'}), 403

        # Get query parameters for filtering and pagination
        status = request.args.get('status', 'pending')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Build query
        query = GuardianStudentRequest.query.filter_by(guardian_id=user_id)

        if status != 'all':
            query = query.filter_by(status=status)

        # Order by request date (newest first)
        query = query.order_by(GuardianStudentRequest.request_date.desc())

        # Paginate results
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        requests_data = [req.to_dict() for req in pagination.items]

        return jsonify({
            'requests': requests_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200

    except Exception as e:
        logger.error(f"Error fetching pending requests: {str(e)}")
        return jsonify({'error': 'Failed to fetch pending requests'}), 500


@guardian_requests_bp.route('/guardian/approve-request/<request_id>', methods=['POST'])
@jwt_required()
def approve_request(request_id):
    """
    Approve a student request to be linked to guardian
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or user.account_type != 'guardian':
            return jsonify({'error': 'Guardian access required'}), 403

        # Get request data
        data = request.get_json() or {}
        response_message = data.get('response_message', '')

        # Find the pending request
        student_request = GuardianStudentRequest.query.filter_by(
            id=request_id,
            guardian_id=user_id,
            status='pending'
        ).first()

        if not student_request:
            return jsonify({'error': 'Request not found or already processed'}), 404

        # Check if link already exists
        existing_link = GuardianStudentLink.get_active_link(
            student_request.student_id,
            user_id
        )

        if existing_link:
            return jsonify({'error': 'Student is already linked to this guardian'}), 400

        # Approve the request
        link = student_request.approve(user, response_message)

        # Commit the transaction
        db.session.commit()

        logger.info(f"Guardian {user_id} approved request {request_id}")

        return jsonify({
            'message': 'Request approved successfully',
            'request': student_request.to_dict(),
            'link': link.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error approving request: {str(e)}")
        return jsonify({'error': 'Failed to approve request'}), 500


@guardian_requests_bp.route('/guardian/reject-request/<request_id>', methods=['POST'])
@jwt_required()
def reject_request(request_id):
    """
    Reject a student request to be linked to guardian
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or user.account_type != 'guardian':
            return jsonify({'error': 'Guardian access required'}), 403

        # Get request data
        data = request.get_json() or {}
        rejection_reason = data.get('rejection_reason', 'No reason provided')
        response_message = data.get('response_message', '')

        # Find the pending request
        student_request = GuardianStudentRequest.query.filter_by(
            id=request_id,
            guardian_id=user_id,
            status='pending'
        ).first()

        if not student_request:
            return jsonify({'error': 'Request not found or already processed'}), 404

        # Reject the request
        student_request.reject(user, rejection_reason, response_message)

        # Commit the transaction
        db.session.commit()

        logger.info(f"Guardian {user_id} rejected request {request_id}")

        return jsonify({
            'message': 'Request rejected successfully',
            'request': student_request.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error rejecting request: {str(e)}")
        return jsonify({'error': 'Failed to reject request'}), 500


@guardian_requests_bp.route('/student/request-guardian/<guardian_id>', methods=['POST'])
@jwt_required()
def request_guardian(guardian_id):
    """
    Student creates a request to be linked to a guardian
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or user.account_type != 'student':
            return jsonify({'error': 'Student access required'}), 403

        # Get request data
        data = request.get_json() or {}
        student_message = data.get('message', '')

        # Validate guardian exists
        guardian = User.query.filter_by(id=guardian_id, account_type='guardian').first()
        if not guardian:
            return jsonify({'error': 'Guardian not found'}), 404

        # Check for existing pending request
        existing_request = GuardianStudentRequest.query.filter_by(
            student_id=user_id,
            guardian_id=guardian_id,
            status='pending'
        ).first()

        if existing_request:
            return jsonify({'error': 'Request already pending with this guardian'}), 400

        # Check if already linked
        existing_link = GuardianStudentLink.get_active_link(user_id, guardian_id)
        if existing_link:
            return jsonify({'error': 'Already linked to this guardian'}), 400

        # Create new request
        new_request = GuardianStudentRequest(
            student_id=user_id,
            guardian_id=guardian_id,
            student_message=student_message
        )

        db.session.add(new_request)
        db.session.commit()

        logger.info(f"Student {user_id} requested guardian {guardian_id}")

        return jsonify({
            'message': 'Request sent successfully',
            'request': new_request.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating guardian request: {str(e)}")
        return jsonify({'error': 'Failed to create request'}), 500


@guardian_requests_bp.route('/guardian/students-linked', methods=['GET'])
@jwt_required()
def get_linked_students():
    """
    Get all students linked to a guardian
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or user.account_type != 'guardian':
            return jsonify({'error': 'Guardian access required'}), 403

        # Get active student links
        links = GuardianStudentLink.get_guardian_students(user_id)

        students_data = [link.to_dict() for link in links]

        return jsonify({
            'students': students_data,
            'total': len(students_data)
        }), 200

    except Exception as e:
        logger.error(f"Error fetching linked students: {str(e)}")
        return jsonify({'error': 'Failed to fetch linked students'}), 500


@guardian_requests_bp.route('/guardian/unlink-student/<student_id>', methods=['POST'])
@jwt_required()
def unlink_student(student_id):
    """
    Remove/deactivate a guardian-student link
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or user.account_type != 'guardian':
            return jsonify({'error': 'Guardian access required'}), 403

        # Get request data
        data = request.get_json() or {}
        reason = data.get('reason', 'Unlinked by guardian')

        # Find active link
        link = GuardianStudentLink.get_active_link(student_id, user_id)

        if not link:
            return jsonify({'error': 'Student link not found'}), 404

        # Deactivate the link
        link.deactivate(user, reason)

        db.session.commit()

        logger.info(f"Guardian {user_id} unlinked student {student_id}")

        return jsonify({
            'message': 'Student unlinked successfully',
            'link': link.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error unlinking student: {str(e)}")
        return jsonify({'error': 'Failed to unlink student'}), 500


@guardian_requests_bp.route('/student/my-guardians', methods=['GET'])
@jwt_required()
def get_student_guardians():
    """
    Get all guardians linked to a student
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or user.account_type != 'student':
            return jsonify({'error': 'Student access required'}), 403

        # Get active guardian links
        links = GuardianStudentLink.get_student_guardians(user_id)

        guardians_data = [link.to_dict() for link in links]

        return jsonify({
            'guardians': guardians_data,
            'total': len(guardians_data)
        }), 200

    except Exception as e:
        logger.error(f"Error fetching student guardians: {str(e)}")
        return jsonify({'error': 'Failed to fetch guardians'}), 500


@guardian_requests_bp.route('/student/my-requests', methods=['GET'])
@jwt_required()
def get_student_requests():
    """
    Get all guardian requests made by a student
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or user.account_type != 'student':
            return jsonify({'error': 'Student access required'}), 403

        # Get query parameters
        status = request.args.get('status', 'all')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Build query
        query = GuardianStudentRequest.query.filter_by(student_id=user_id)

        if status != 'all':
            query = query.filter_by(status=status)

        # Order by request date (newest first)
        query = query.order_by(GuardianStudentRequest.request_date.desc())

        # Paginate results
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        requests_data = [req.to_dict() for req in pagination.items]

        return jsonify({
            'requests': requests_data,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages,
                'has_next': pagination.has_next,
                'has_prev': pagination.has_prev
            }
        }), 200

    except Exception as e:
        logger.error(f"Error fetching student requests: {str(e)}")
        return jsonify({'error': 'Failed to fetch requests'}), 500


@guardian_requests_bp.route('/guardian/search', methods=['GET'])
@jwt_required()
def search_guardians():
    """
    Search for guardians by email or name (for students to find guardians)
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or user.account_type != 'student':
            return jsonify({'error': 'Student access required'}), 403

        # Get search query
        search_query = request.args.get('q', '').strip()

        if not search_query or len(search_query) < 3:
            return jsonify({'error': 'Search query must be at least 3 characters'}), 400

        # Search guardians by email or name
        guardians = User.query.filter(
            User.account_type == 'guardian',
            User.is_active == True,
            User.status == 'active',
            db.or_(
                User.email.ilike(f'%{search_query}%'),
                User.profile['name'].astext.ilike(f'%{search_query}%')
            )
        ).limit(10).all()

        # Format results (exclude sensitive information)
        results = []
        for guardian in guardians:
            # Check if already linked or has pending request
            existing_link = GuardianStudentLink.get_active_link(user_id, guardian.id)
            pending_request = GuardianStudentRequest.query.filter_by(
                student_id=user_id,
                guardian_id=guardian.id,
                status='pending'
            ).first()

            results.append({
                'id': guardian.id,
                'email': guardian.email,
                'name': guardian.profile.get('name', ''),
                'isLinked': bool(existing_link),
                'hasPendingRequest': bool(pending_request)
            })

        return jsonify({
            'guardians': results,
            'total': len(results)
        }), 200

    except Exception as e:
        logger.error(f"Error searching guardians: {str(e)}")
        return jsonify({'error': 'Failed to search guardians'}), 500


# Batch operations
@guardian_requests_bp.route('/guardian/batch-approve', methods=['POST'])
@jwt_required()
def batch_approve_requests():
    """
    Approve multiple requests at once
    """
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)

        if not user or user.account_type != 'guardian':
            return jsonify({'error': 'Guardian access required'}), 403

        # Get request data
        data = request.get_json() or {}
        request_ids = data.get('request_ids', [])
        response_message = data.get('response_message', '')

        if not request_ids or not isinstance(request_ids, list):
            return jsonify({'error': 'request_ids must be a non-empty list'}), 400

        approved = []
        errors = []

        for req_id in request_ids:
            try:
                # Find the pending request
                student_request = GuardianStudentRequest.query.filter_by(
                    id=req_id,
                    guardian_id=user_id,
                    status='pending'
                ).first()

                if not student_request:
                    errors.append({'request_id': req_id, 'error': 'Request not found or already processed'})
                    continue

                # Check if link already exists
                existing_link = GuardianStudentLink.get_active_link(
                    student_request.student_id,
                    user_id
                )

                if existing_link:
                    errors.append({'request_id': req_id, 'error': 'Student already linked'})
                    continue

                # Approve the request
                link = student_request.approve(user, response_message)
                approved.append({
                    'request_id': req_id,
                    'student_id': student_request.student_id
                })

            except Exception as e:
                errors.append({'request_id': req_id, 'error': str(e)})

        # Commit all approved requests
        db.session.commit()

        logger.info(f"Guardian {user_id} batch approved {len(approved)} requests")

        return jsonify({
            'message': f'Processed {len(request_ids)} requests',
            'approved': approved,
            'errors': errors,
            'approved_count': len(approved),
            'error_count': len(errors)
        }), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in batch approve: {str(e)}")
        return jsonify({'error': 'Failed to process batch approval'}), 500