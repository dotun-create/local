from flask import request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User
from app.services.earnings_service import EarningsService
from app import db
from sqlalchemy import text
import logging

@api_bp.route('/tutors/<tutor_id>/earnings', methods=['GET'])
@jwt_required()
def get_comprehensive_tutor_earnings(tutor_id):
    """Get comprehensive earnings data for a tutor"""
    try:
        # Verify the tutor exists
        tutor = User.query.get(tutor_id)
        if not tutor or not tutor.has_role('tutor'):
            return jsonify({
                'success': False,
                'error': 'User does not have tutor role'
            }), 404
        
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Check permissions - tutors can only view their own earnings, admins can view any
        if not current_user.has_role('admin') and current_user_id != tutor_id:
            return jsonify({
                'success': False,
                'error': 'Insufficient permissions to view earnings'
            }), 403
        
        # Get comprehensive earnings data
        earnings_data = EarningsService.get_comprehensive_earnings_data(tutor_id)
        
        return jsonify({
            'success': True,
            'data': earnings_data
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching earnings for tutor {tutor_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/tutors/<tutor_id>/earnings/weekly', methods=['GET'])
@jwt_required()
def get_tutor_weekly_earnings(tutor_id):
    """Get weekly earnings data for a tutor"""
    try:
        # Verify the tutor exists and check permissions
        tutor = User.query.get(tutor_id)
        if not tutor or not tutor.has_role('tutor'):
            return jsonify({
                'success': False,
                'error': 'User does not have tutor role'
            }), 404

        if not g.current_user.has_role('admin') and g.current_user.id != tutor_id:
            return jsonify({
                'success': False,
                'error': 'Insufficient permissions to view earnings'
            }), 403
        
        # Get both potential and actual weekly earnings
        potential_earnings = EarningsService.get_potential_weekly_earnings(tutor_id)
        actual_earnings = EarningsService.get_actual_weekly_earnings(tutor_id)
        
        return jsonify({
            'success': True,
            'data': {
                'potential': potential_earnings,
                'actual': actual_earnings
            }
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching weekly earnings for tutor {tutor_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/tutors/<tutor_id>/earnings/monthly', methods=['GET'])
@jwt_required()
def get_tutor_monthly_earnings(tutor_id):
    """Get monthly earnings data for a tutor"""
    try:
        # Verify the tutor exists and check permissions
        tutor = User.query.get(tutor_id)
        if not tutor or not tutor.has_role('tutor'):
            return jsonify({
                'success': False,
                'error': 'User does not have tutor role'
            }), 404

        if not g.current_user.has_role('admin') and g.current_user.id != tutor_id:
            return jsonify({
                'success': False,
                'error': 'Insufficient permissions to view earnings'
            }), 403
        
        # Get monthly earnings data
        monthly_earnings = EarningsService.get_monthly_earnings(tutor_id)
        
        return jsonify({
            'success': True,
            'data': monthly_earnings
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching monthly earnings for tutor {tutor_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/tutors/<tutor_id>/earnings/total', methods=['GET'])
@jwt_required()
def get_tutor_total_earnings(tutor_id):
    """Get total lifetime earnings for a tutor"""
    try:
        # Verify the tutor exists and check permissions
        tutor = User.query.get(tutor_id)
        if not tutor or not tutor.has_role('tutor'):
            return jsonify({
                'success': False,
                'error': 'User does not have tutor role'
            }), 404

        if not g.current_user.has_role('admin') and g.current_user.id != tutor_id:
            return jsonify({
                'success': False,
                'error': 'Insufficient permissions to view earnings'
            }), 403
        
        # Get total earnings data
        total_earnings = EarningsService.get_total_earnings(tutor_id)
        
        return jsonify({
            'success': True,
            'data': total_earnings
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching total earnings for tutor {tutor_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/tutors/<tutor_id>/sessions/upcoming', methods=['GET'])
@jwt_required()
def get_tutor_upcoming_sessions(tutor_id):
    """Get upcoming sessions for a tutor this week"""
    try:
        # Verify the tutor exists and check permissions
        tutor = User.query.get(tutor_id)
        if not tutor or not tutor.has_role('tutor'):
            return jsonify({
                'success': False,
                'error': 'User does not have tutor role'
            }), 404

        if not g.current_user.has_role('admin') and g.current_user.id != tutor_id:
            return jsonify({
                'success': False,
                'error': 'Insufficient permissions to view sessions'
            }), 403
        
        # Get upcoming sessions data
        upcoming_sessions = EarningsService.get_upcoming_sessions_this_week(tutor_id)
        
        return jsonify({
            'success': True,
            'data': upcoming_sessions
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching upcoming sessions for tutor {tutor_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/tutors/my-earnings', methods=['GET'])
@jwt_required()
def get_my_earnings():
    """Get earnings data for the current logged-in tutor"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or not current_user.has_role('tutor'):
            return jsonify({'error': 'Tutor access required'}), 403
            
        # Get comprehensive earnings data for the current user
        earnings_data = EarningsService.get_comprehensive_earnings_data(current_user_id)
        
        return jsonify({
            'success': True,
            'data': earnings_data
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching earnings for current tutor {g.current_user.id}: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Admin endpoints for earnings analytics
@api_bp.route('/admin/earnings/overview', methods=['GET'])
@jwt_required()
def get_earnings_overview():
    """Get system-wide earnings overview (admin only)"""
    try:
        # Verify admin permissions
        if not g.current_user.has_role('admin'):
            return jsonify({
                'success': False,
                'error': 'Admin access required'
            }), 403
        
        # Get all tutors
        tutors = User.query.filter(text("users.roles::jsonb @> :tutor_role")).params(tutor_role='["tutor"]').all()
        
        system_overview = {
            'totalTutors': len(tutors),
            'hourlyRate': EarningsService.get_hourly_rate(),
            'currency': 'GBP',
            'tutorEarnings': []
        }
        
        total_system_earnings = 0
        total_system_hours = 0
        
        for tutor in tutors[:10]:  # Limit to first 10 for performance
            try:
                earnings_data = EarningsService.get_comprehensive_earnings_data(tutor.id)
                total_system_earnings += earnings_data['total']['totalEarnings']
                total_system_hours += earnings_data['total']['totalHours']
                
                system_overview['tutorEarnings'].append({
                    'tutorId': tutor.id,
                    'tutorName': f"{tutor.profile.get('firstName', 'Unknown')} {tutor.profile.get('lastName', '')}".strip(),
                    'totalEarnings': earnings_data['total']['totalEarnings'],
                    'monthlyEarnings': earnings_data['monthly']['monthlyEarnings'],
                    'totalSessions': earnings_data['total']['totalSessions']
                })
            except Exception as tutor_error:
                logging.warning(f"Error calculating earnings for tutor {tutor.id}: {str(tutor_error)}")
                continue
        
        system_overview['totalSystemEarnings'] = total_system_earnings
        system_overview['totalSystemHours'] = total_system_hours
        
        return jsonify({
            'success': True,
            'data': system_overview
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching earnings overview: {str(e)}")
        return jsonify({'error': str(e)}), 500