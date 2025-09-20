"""
Environment Variable Management Service
Handles reading, updating, and managing environment variables for the application
"""

import os
import re
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

class EnvironmentService:
    
    # Define which variables are sensitive and should be masked
    SENSITIVE_KEYS = [
        'JWT_SECRET_KEY',
        'SECRET_KEY',
        'OPENAI_API_KEY',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'SENDER_PASSWORD',
        'ZOOM_CLIENT_SECRET',
        'DATABASE_URL'  # Can contain passwords
    ]
    
    # Define environment variable categories for better organization
    ENV_CATEGORIES = {
        'Database': [
            'DATABASE_URL'
        ],
        'JWT & Security': [
            'JWT_SECRET_KEY',
            'JWT_ACCESS_TOKEN_EXPIRES',
            'JWT_REFRESH_TOKEN_EXPIRES',
            'SECRET_KEY'
        ],
        'Stripe Payment': [
            'STRIPE_SECRET_KEY',
            'STRIPE_PUBLISHABLE_KEY',
            'STRIPE_WEBHOOK_SECRET'
        ],
        'CORS & Flask': [
            'CORS_ORIGINS',
            'FLASK_ENV'
        ],
        'Admin': [
            'ADMIN_SECRET'
        ],
        'Email Configuration': [
            'SENDER_EMAIL',
            'SENDER_NAME',
            'SMTP_SERVER',
            'SMTP_PORT',
            'SMTP_USE_SSL',
            'SMTP_USERNAME',
            'SENDER_PASSWORD'
        ],
        'Zoom Integration': [
            'ZOOM_ACCOUNT_ID',
            'ZOOM_CLIENT_ID',
            'ZOOM_CLIENT_SECRET'
        ],
        'OpenAI Configuration': [
            'OPENAI_API_KEY',
            'OPENAI_MODEL',
            'OPENAI_API_BASE'
        ]
    }
    
    @classmethod
    def get_env_file_path(cls) -> str:
        """Get the path to the .env file"""
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.join(backend_dir, '.env')
    
    @classmethod
    def mask_sensitive_value(cls, key: str, value: str) -> str:
        """Mask sensitive environment variable values"""
        if not value:
            return ""
        
        if key in cls.SENSITIVE_KEYS:
            # Show first 4 and last 4 characters, mask the middle
            if len(value) <= 8:
                return '*' * len(value)
            else:
                return value[:4] + '*' * (len(value) - 8) + value[-4:]
        
        return value
    
    @classmethod
    def read_env_file(cls) -> Dict[str, str]:
        """Read environment variables from .env file"""
        env_file_path = cls.get_env_file_path()
        env_vars = {}
        
        try:
            if not os.path.exists(env_file_path):
                logger.warning(f"Environment file not found: {env_file_path}")
                return env_vars
            
            with open(env_file_path, 'r', encoding='utf-8') as file:
                for line_num, line in enumerate(file, 1):
                    line = line.strip()
                    
                    # Skip empty lines and comments
                    if not line or line.startswith('#'):
                        continue
                    
                    # Parse key=value pairs
                    if '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip()
                        
                        # Remove quotes if present
                        if (value.startswith('"') and value.endswith('"')) or \
                           (value.startswith("'") and value.endswith("'")):
                            value = value[1:-1]
                        
                        env_vars[key] = value
                    else:
                        logger.warning(f"Invalid line format in .env file (line {line_num}): {line}")
        
        except Exception as e:
            logger.error(f"Error reading environment file: {str(e)}")
        
        return env_vars
    
    @classmethod
    def write_env_file(cls, env_vars: Dict[str, str]) -> bool:
        """Write environment variables back to .env file"""
        env_file_path = cls.get_env_file_path()
        
        try:
            # Read existing file to preserve comments and structure
            original_lines = []
            if os.path.exists(env_file_path):
                with open(env_file_path, 'r', encoding='utf-8') as file:
                    original_lines = file.readlines()
            
            # Create new content
            new_lines = []
            processed_keys = set()
            
            # Process existing lines, updating values where found
            for line in original_lines:
                stripped_line = line.strip()
                
                # Keep comments and empty lines
                if not stripped_line or stripped_line.startswith('#'):
                    new_lines.append(line)
                    continue
                
                # Process key=value lines
                if '=' in stripped_line:
                    key = stripped_line.split('=', 1)[0].strip()
                    if key in env_vars:
                        # Update with new value
                        value = env_vars[key]
                        # Quote value if it contains spaces
                        if ' ' in value or not value:
                            value = f'"{value}"'
                        new_lines.append(f'{key}={value}\n')
                        processed_keys.add(key)
                    else:
                        # Keep original line
                        new_lines.append(line)
                else:
                    new_lines.append(line)
            
            # Add any new variables that weren't in the original file
            for key, value in env_vars.items():
                if key not in processed_keys:
                    if ' ' in value or not value:
                        value = f'"{value}"'
                    new_lines.append(f'{key}={value}\n')
            
            # Write back to file
            with open(env_file_path, 'w', encoding='utf-8') as file:
                file.writelines(new_lines)
            
            logger.info("Environment file updated successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error writing environment file: {str(e)}")
            return False
    
    @classmethod
    def get_all_environment_variables(cls, mask_sensitive: bool = True) -> Dict[str, Any]:
        """Get all environment variables organized by category"""
        env_vars = cls.read_env_file()
        
        # Also include current runtime environment variables
        runtime_vars = dict(os.environ)
        
        # Merge file vars with runtime vars (file takes precedence for display)
        all_vars = {**runtime_vars, **env_vars}
        
        # Organize by category
        categorized_vars = {}
        uncategorized_vars = {}
        
        for category, keys in cls.ENV_CATEGORIES.items():
            categorized_vars[category] = {}
            for key in keys:
                if key in all_vars:
                    value = all_vars[key]
                    categorized_vars[category][key] = {
                        'value': cls.mask_sensitive_value(key, value) if mask_sensitive else value,
                        'masked': mask_sensitive and key in cls.SENSITIVE_KEYS,
                        'source': 'file' if key in env_vars else 'runtime',
                        'sensitive': key in cls.SENSITIVE_KEYS
                    }
        
        # Find uncategorized variables
        all_categorized_keys = set()
        for keys in cls.ENV_CATEGORIES.values():
            all_categorized_keys.update(keys)
        
        for key, value in all_vars.items():
            if key not in all_categorized_keys:
                uncategorized_vars[key] = {
                    'value': cls.mask_sensitive_value(key, value) if mask_sensitive else value,
                    'masked': mask_sensitive and key in cls.SENSITIVE_KEYS,
                    'source': 'file' if key in env_vars else 'runtime',
                    'sensitive': key in cls.SENSITIVE_KEYS
                }
        
        if uncategorized_vars:
            categorized_vars['Other'] = uncategorized_vars
        
        return categorized_vars
    
    @classmethod
    def update_environment_variable(cls, key: str, value: str) -> Dict[str, Any]:
        """Update a single environment variable"""
        try:
            # Read current variables
            env_vars = cls.read_env_file()
            
            # Update the specific variable
            env_vars[key] = value
            
            # Write back to file
            success = cls.write_env_file(env_vars)
            
            if success:
                # Also update runtime environment
                os.environ[key] = value
                logger.info(f"Environment variable '{key}' updated successfully")
                
                return {
                    'success': True,
                    'message': f'Environment variable "{key}" updated successfully',
                    'key': key,
                    'masked_value': cls.mask_sensitive_value(key, value)
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to write environment file'
                }
                
        except Exception as e:
            logger.error(f"Error updating environment variable '{key}': {str(e)}")
            return {
                'success': False,
                'error': f'Error updating environment variable: {str(e)}'
            }
    
    @classmethod
    def update_multiple_environment_variables(cls, updates: Dict[str, str]) -> Dict[str, Any]:
        """Update multiple environment variables at once"""
        try:
            # Read current variables
            env_vars = cls.read_env_file()
            
            # Update all specified variables
            updated_keys = []
            for key, value in updates.items():
                env_vars[key] = value
                updated_keys.append(key)
            
            # Write back to file
            success = cls.write_env_file(env_vars)
            
            if success:
                # Update runtime environment
                for key, value in updates.items():
                    os.environ[key] = value
                
                logger.info(f"Updated environment variables: {updated_keys}")
                
                return {
                    'success': True,
                    'message': f'Successfully updated {len(updated_keys)} environment variables',
                    'updated_keys': updated_keys
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to write environment file'
                }
                
        except Exception as e:
            logger.error(f"Error updating multiple environment variables: {str(e)}")
            return {
                'success': False,
                'error': f'Error updating environment variables: {str(e)}'
            }
    
    @classmethod
    def validate_environment_setup(cls) -> Dict[str, Any]:
        """Validate current environment setup and identify missing variables"""
        env_vars = cls.get_all_environment_variables(mask_sensitive=False)
        
        # Define required variables for different features
        required_vars = {
            'Database': ['DATABASE_URL'],
            'JWT Authentication': ['JWT_SECRET_KEY'],
            'Email System': ['SENDER_EMAIL', 'SENDER_PASSWORD', 'SMTP_SERVER'],
            'Payment Processing': ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'],
            'AI Features': ['OPENAI_API_KEY'],
            'Video Conferencing': ['ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET']
        }
        
        validation_results = {}
        overall_status = 'complete'
        
        for feature, required_keys in required_vars.items():
            missing_keys = []
            empty_keys = []
            
            for key in required_keys:
                found = False
                for category_vars in env_vars.values():
                    if key in category_vars:
                        found = True
                        if not category_vars[key]['value'] or category_vars[key]['value'] in ['your-key-here', 'placeholder']:
                            empty_keys.append(key)
                        break
                
                if not found:
                    missing_keys.append(key)
            
            status = 'complete'
            if missing_keys or empty_keys:
                status = 'incomplete'
                overall_status = 'incomplete'
            
            validation_results[feature] = {
                'status': status,
                'missing_keys': missing_keys,
                'empty_keys': empty_keys,
                'required_keys': required_keys
            }
        
        return {
            'overall_status': overall_status,
            'feature_status': validation_results,
            'total_variables': sum(len(category) for category in env_vars.values()),
            'file_path': cls.get_env_file_path()
        }