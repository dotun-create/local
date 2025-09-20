from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import SystemSettings, User
from app import db
import logging

@api_bp.route('/system-settings', methods=['GET'])
@jwt_required()
def get_all_system_settings():
    """Get all system settings (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
            
        settings = SystemSettings.query.all()
        return jsonify({
            'success': True,
            'data': [setting.to_dict() for setting in settings]
        }), 200
    except Exception as e:
        logging.error(f"Error fetching system settings: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/system-settings/<setting_key>', methods=['GET'])
@jwt_required()
def get_system_setting(setting_key):
    """Get a specific system setting by key"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
            
        setting = SystemSettings.query.filter_by(setting_key=setting_key).first()
        if not setting:
            return jsonify({
                'success': False,
                'error': 'Setting not found'
            }), 404
            
        return jsonify({
            'success': True,
            'data': setting.to_dict()
        }), 200
    except Exception as e:
        logging.error(f"Error fetching system setting {setting_key}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/system-settings/<setting_key>', methods=['PUT'])
@jwt_required()
def update_system_setting(setting_key):
    """Update a system setting (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
            
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validate required fields
        if 'settingValue' not in data:
            return jsonify({
                'success': False,
                'error': 'Setting value is required'
            }), 400
        
        # Update the setting
        setting = SystemSettings.set_setting(
            key=setting_key,
            value=data['settingValue'],
            description=data.get('description'),
            updated_by=current_user_id
        )
        
        return jsonify({
            'success': True,
            'data': setting.to_dict(),
            'message': f'Setting {setting_key} updated successfully'
        }), 200
        
    except Exception as e:
        logging.error(f"Error updating system setting {setting_key}: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/system-settings', methods=['POST'])
@jwt_required()
def create_system_setting():
    """Create a new system setting (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
            
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['settingKey', 'settingValue']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'{field} is required'
                }), 400
        
        # Check if setting already exists
        existing_setting = SystemSettings.query.filter_by(setting_key=data['settingKey']).first()
        if existing_setting:
            return jsonify({
                'success': False,
                'error': 'Setting with this key already exists'
            }), 409
        
        # Create the setting
        setting = SystemSettings.set_setting(
            key=data['settingKey'],
            value=data['settingValue'],
            description=data.get('description'),
            updated_by=g.current_user.id
        )
        
        return jsonify({
            'success': True,
            'data': setting.to_dict(),
            'message': f'Setting {data["settingKey"]} created successfully'
        }), 201
        
    except Exception as e:
        logging.error(f"Error creating system setting: {str(e)}")
        return handle_api_error(e)

@api_bp.route('/system-settings/<setting_key>', methods=['DELETE'])
@jwt_required()
def delete_system_setting(setting_key):
    """Delete a system setting (admin only)"""
    try:
        setting = SystemSettings.query.filter_by(setting_key=setting_key).first()
        if not setting:
            return jsonify({
                'success': False,
                'error': 'Setting not found'
            }), 404
        
        db.session.delete(setting)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Setting {setting_key} deleted successfully'
        }), 200
        
    except Exception as e:
        logging.error(f"Error deleting system setting {setting_key}: {str(e)}")
        db.session.rollback()
        return handle_api_error(e)

# Specific endpoint for hourly rate (most commonly accessed)
@api_bp.route('/system-settings/hourly-rate', methods=['GET'])
@jwt_required()
def get_hourly_rate():
    """Get the current hourly rate"""
    try:
        hourly_rate = SystemSettings.get_setting('hourly_rate_gbp', 21.0)
        return jsonify({
            'success': True,
            'data': {
                'hourlyRate': hourly_rate,
                'currency': SystemSettings.get_setting('platform_currency', 'GBP')
            }
        }), 200
    except Exception as e:
        logging.error(f"Error fetching hourly rate: {str(e)}")
        return handle_api_error(e)

@api_bp.route('/system-settings/hourly-rate', methods=['PUT'])
@jwt_required()
def update_hourly_rate():
    """Update the hourly rate (admin only)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        if 'hourlyRate' not in data:
            return jsonify({
                'success': False,
                'error': 'Hourly rate is required'
            }), 400
        
        try:
            hourly_rate = float(data['hourlyRate'])
            if hourly_rate <= 0:
                return jsonify({
                    'success': False,
                    'error': 'Hourly rate must be greater than 0'
                }), 400
        except (ValueError, TypeError):
            return jsonify({
                'success': False,
                'error': 'Invalid hourly rate format'
            }), 400
        
        # Update the hourly rate
        setting = SystemSettings.set_setting(
            key='hourly_rate_gbp',
            value=hourly_rate,
            description='Hourly rate in GBP for tutor earnings calculations',
            updated_by=g.current_user.id
        )
        
        return jsonify({
            'success': True,
            'data': {
                'hourlyRate': hourly_rate,
                'currency': SystemSettings.get_setting('platform_currency', 'GBP')
            },
            'message': f'Hourly rate updated to £{hourly_rate:.2f}'
        }), 200
        
    except Exception as e:
        logging.error(f"Error updating hourly rate: {str(e)}")
        return handle_api_error(e)