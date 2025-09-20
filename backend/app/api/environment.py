"""
Environment Variable Management API Endpoints
Admin-only endpoints for managing backend environment variables
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User
from app.services.environment_service import EnvironmentService
import logging

logger = logging.getLogger(__name__)

def admin_required():
    """Decorator to ensure only admin users can access environment endpoints"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    if not current_user or current_user.account_type != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    return None

@api_bp.route('/environment/variables', methods=['GET'])
@jwt_required()
def get_environment_variables():
    """
    Get all environment variables organized by category
    
    Query Parameters:
        - mask_sensitive: boolean (default: true) - Whether to mask sensitive values
        
    Returns:
        JSON response with categorized environment variables
    """
    try:
        # Check admin access
        admin_check = admin_required()
        if admin_check:
            return admin_check
        
        # Get query parameters
        mask_sensitive = request.args.get('mask_sensitive', 'true').lower() == 'true'
        
        # Get environment variables
        env_vars = EnvironmentService.get_all_environment_variables(mask_sensitive=mask_sensitive)
        
        return jsonify({
            'success': True,
            'environment_variables': env_vars,
            'total_categories': len(env_vars),
            'masked': mask_sensitive
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting environment variables: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve environment variables'
        }), 500

@api_bp.route('/environment/variables/<variable_name>', methods=['PUT'])
@jwt_required()
def update_environment_variable(variable_name):
    """
    Update a single environment variable
    
    Args:
        variable_name (str): The name of the environment variable to update
        
    Request Body:
        {
            "value": "new_value"
        }
        
    Returns:
        JSON response with update result
    """
    try:
        # Check admin access
        admin_check = admin_required()
        if admin_check:
            return admin_check
        
        data = request.get_json()
        
        if not data or 'value' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing "value" in request body'
            }), 400
        
        new_value = data['value']
        
        # Update the environment variable
        result = EnvironmentService.update_environment_variable(variable_name, new_value)
        
        if result['success']:
            logger.info(f"Admin {get_jwt_identity()} updated environment variable: {variable_name}")
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error updating environment variable '{variable_name}': {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to update environment variable: {str(e)}'
        }), 500

@api_bp.route('/environment/variables', methods=['PUT'])
@jwt_required()
def update_multiple_environment_variables():
    """
    Update multiple environment variables at once
    
    Request Body:
        {
            "variables": {
                "VAR1": "value1",
                "VAR2": "value2",
                ...
            }
        }
        
    Returns:
        JSON response with update result
    """
    try:
        # Check admin access
        admin_check = admin_required()
        if admin_check:
            return admin_check
        
        data = request.get_json()
        
        if not data or 'variables' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing "variables" in request body'
            }), 400
        
        variables = data['variables']
        
        if not isinstance(variables, dict):
            return jsonify({
                'success': False,
                'error': 'Variables must be provided as a dictionary'
            }), 400
        
        # Update the environment variables
        result = EnvironmentService.update_multiple_environment_variables(variables)
        
        if result['success']:
            logger.info(f"Admin {get_jwt_identity()} updated {len(variables)} environment variables")
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"Error updating multiple environment variables: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to update environment variables: {str(e)}'
        }), 500

@api_bp.route('/environment/validation', methods=['GET'])
@jwt_required()
def validate_environment_setup():
    """
    Validate the current environment setup
    
    Returns:
        JSON response with validation results for different features
    """
    try:
        # Check admin access
        admin_check = admin_required()
        if admin_check:
            return admin_check
        
        # Validate environment setup
        validation_results = EnvironmentService.validate_environment_setup()
        
        return jsonify({
            'success': True,
            'validation': validation_results
        }), 200
        
    except Exception as e:
        logger.error(f"Error validating environment setup: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to validate environment setup'
        }), 500

@api_bp.route('/environment/unmask/<variable_name>', methods=['POST'])
@jwt_required()
def unmask_environment_variable(variable_name):
    """
    Get the unmasked value of a sensitive environment variable
    
    Args:
        variable_name (str): The name of the environment variable to unmask
        
    Returns:
        JSON response with unmasked value
    """
    try:
        # Check admin access
        admin_check = admin_required()
        if admin_check:
            return admin_check
        
        # Get unmasked environment variables
        env_vars = EnvironmentService.get_all_environment_variables(mask_sensitive=False)
        
        # Find the variable in any category
        unmasked_value = None
        found = False
        
        for category_vars in env_vars.values():
            if variable_name in category_vars:
                unmasked_value = category_vars[variable_name]['value']
                found = True
                break
        
        if not found:
            return jsonify({
                'success': False,
                'error': f'Environment variable "{variable_name}" not found'
            }), 404
        
        logger.info(f"Admin {get_jwt_identity()} unmasked environment variable: {variable_name}")
        
        return jsonify({
            'success': True,
            'variable': variable_name,
            'value': unmasked_value
        }), 200
        
    except Exception as e:
        logger.error(f"Error unmasking environment variable '{variable_name}': {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to unmask environment variable: {str(e)}'
        }), 500

@api_bp.route('/environment/categories', methods=['GET'])
@jwt_required()
def get_environment_categories():
    """
    Get the list of environment variable categories and their keys
    
    Returns:
        JSON response with category information
    """
    try:
        # Check admin access
        admin_check = admin_required()
        if admin_check:
            return admin_check
        
        return jsonify({
            'success': True,
            'categories': EnvironmentService.ENV_CATEGORIES,
            'sensitive_keys': EnvironmentService.SENSITIVE_KEYS
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting environment categories: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve environment categories'
        }), 500