"""
Zoom Webhook Management Service
Handles webhook registration, configuration, and management with Zoom API
"""

import os
import requests
import logging
from typing import Dict, List, Optional
from app.services.zoom_service import zoom_service

logger = logging.getLogger(__name__)

class ZoomWebhookService:
    """Service for managing Zoom webhooks"""
    
    def __init__(self):
        self.zoom_service = zoom_service
        self.webhook_secret = os.environ.get('ZOOM_WEBHOOK_SECRET_TOKEN')
    
    def get_webhook_url(self, base_url: str) -> str:
        """
        Generate webhook URL for this deployment
        """
        return f"{base_url.rstrip('/')}/api/zoom/webhook"
    
    def register_webhook(self, webhook_url: str, events: Optional[List[str]] = None) -> Dict:
        """
        Register webhook with Zoom
        
        Args:
            webhook_url: The URL where Zoom should send webhook events
            events: List of events to subscribe to
            
        Returns:
            Dict with registration result
        """
        try:
            if not self.zoom_service.is_configured():
                return {
                    'success': False,
                    'error': 'Zoom service not configured'
                }
            
            # Default events to subscribe to
            if events is None:
                events = [
                    'meeting.started',
                    'meeting.ended',
                    'meeting.participant_joined',
                    'meeting.participant_left',
                    'recording.completed'
                ]
            
            # Get access token
            token_result = self.zoom_service.get_access_token()
            if not token_result.get('success'):
                return {
                    'success': False,
                    'error': 'Failed to get Zoom access token'
                }
            
            access_token = token_result['access_token']
            
            # Prepare webhook registration payload
            webhook_data = {
                'url': webhook_url,
                'auth': {
                    'type': 'bearer_token',
                    'token': self.webhook_secret or 'default_secret'
                },
                'events': events,
                'deactivation_details': {
                    'enabled': True
                }
            }
            
            # Register webhook
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                'https://api.zoom.us/v2/webhooks',
                json=webhook_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 201:
                webhook_info = response.json()
                logger.info(f"Successfully registered Zoom webhook: {webhook_info.get('webhook_id')}")
                return {
                    'success': True,
                    'webhook_id': webhook_info.get('webhook_id'),
                    'webhook_url': webhook_url,
                    'events': events,
                    'message': 'Webhook registered successfully'
                }
            else:
                error_detail = response.json() if response.content else {}
                logger.error(f"Failed to register webhook: {response.status_code} - {error_detail}")
                return {
                    'success': False,
                    'error': f'Registration failed: {response.status_code}',
                    'details': error_detail
                }
                
        except Exception as e:
            logger.error(f"Error registering webhook: {str(e)}")
            return {
                'success': False,
                'error': f'Registration error: {str(e)}'
            }
    
    def list_webhooks(self) -> Dict:
        """
        List all registered webhooks
        """
        try:
            if not self.zoom_service.is_configured():
                return {
                    'success': False,
                    'error': 'Zoom service not configured'
                }
            
            token_result = self.zoom_service.get_access_token()
            if not token_result.get('success'):
                return {
                    'success': False,
                    'error': 'Failed to get Zoom access token'
                }
            
            access_token = token_result['access_token']
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(
                'https://api.zoom.us/v2/webhooks',
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                webhooks_data = response.json()
                return {
                    'success': True,
                    'webhooks': webhooks_data.get('webhooks', []),
                    'total_records': webhooks_data.get('total_records', 0)
                }
            else:
                error_detail = response.json() if response.content else {}
                return {
                    'success': False,
                    'error': f'Failed to list webhooks: {response.status_code}',
                    'details': error_detail
                }
                
        except Exception as e:
            logger.error(f"Error listing webhooks: {str(e)}")
            return {
                'success': False,
                'error': f'List error: {str(e)}'
            }
    
    def delete_webhook(self, webhook_id: str) -> Dict:
        """
        Delete a webhook by ID
        """
        try:
            if not self.zoom_service.is_configured():
                return {
                    'success': False,
                    'error': 'Zoom service not configured'
                }
            
            token_result = self.zoom_service.get_access_token()
            if not token_result.get('success'):
                return {
                    'success': False,
                    'error': 'Failed to get Zoom access token'
                }
            
            access_token = token_result['access_token']
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.delete(
                f'https://api.zoom.us/v2/webhooks/{webhook_id}',
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 204:
                logger.info(f"Successfully deleted webhook: {webhook_id}")
                return {
                    'success': True,
                    'message': 'Webhook deleted successfully'
                }
            else:
                error_detail = response.json() if response.content else {}
                return {
                    'success': False,
                    'error': f'Failed to delete webhook: {response.status_code}',
                    'details': error_detail
                }
                
        except Exception as e:
            logger.error(f"Error deleting webhook: {str(e)}")
            return {
                'success': False,
                'error': f'Delete error: {str(e)}'
            }
    
    def update_webhook(self, webhook_id: str, webhook_url: str, events: Optional[List[str]] = None) -> Dict:
        """
        Update an existing webhook
        """
        try:
            if not self.zoom_service.is_configured():
                return {
                    'success': False,
                    'error': 'Zoom service not configured'
                }
            
            if events is None:
                events = [
                    'meeting.started',
                    'meeting.ended',
                    'meeting.participant_joined',
                    'meeting.participant_left',
                    'recording.completed'
                ]
            
            token_result = self.zoom_service.get_access_token()
            if not token_result.get('success'):
                return {
                    'success': False,
                    'error': 'Failed to get Zoom access token'
                }
            
            access_token = token_result['access_token']
            
            webhook_data = {
                'url': webhook_url,
                'auth': {
                    'type': 'bearer_token',
                    'token': self.webhook_secret or 'default_secret'
                },
                'events': events
            }
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.patch(
                f'https://api.zoom.us/v2/webhooks/{webhook_id}',
                json=webhook_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 204:
                logger.info(f"Successfully updated webhook: {webhook_id}")
                return {
                    'success': True,
                    'message': 'Webhook updated successfully'
                }
            else:
                error_detail = response.json() if response.content else {}
                return {
                    'success': False,
                    'error': f'Failed to update webhook: {response.status_code}',
                    'details': error_detail
                }
                
        except Exception as e:
            logger.error(f"Error updating webhook: {str(e)}")
            return {
                'success': False,
                'error': f'Update error: {str(e)}'
            }
    
    def validate_webhook_configuration(self) -> Dict:
        """
        Validate current webhook configuration
        """
        issues = []
        suggestions = []
        
        # Check webhook secret
        if not self.webhook_secret:
            issues.append("ZOOM_WEBHOOK_SECRET_TOKEN environment variable not set")
            suggestions.append("Set ZOOM_WEBHOOK_SECRET_TOKEN for webhook security")
        
        # Check Zoom service configuration
        if not self.zoom_service.is_configured():
            issues.append("Zoom service not configured")
            suggestions.append("Configure ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET")
        
        # Check if we can get access token
        if self.zoom_service.is_configured():
            token_result = self.zoom_service.get_access_token()
            if not token_result.get('success'):
                issues.append("Cannot obtain Zoom access token")
                suggestions.append("Verify Zoom credentials and app permissions")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'suggestions': suggestions,
            'webhook_secret_configured': bool(self.webhook_secret),
            'zoom_service_configured': self.zoom_service.is_configured()
        }

# Create global instance
zoom_webhook_service = ZoomWebhookService()