import secrets
from datetime import datetime, timedelta
from flask import request, current_app
from app import db
from app.models import User, AdminSecureSession, AdminSecurityConfig, PasswordViewAudit

class AdminSecurityService:
    
    @staticmethod
    def get_password_viewing_config():
        """Get current password viewing configuration"""
        config = AdminSecurityConfig.query.filter_by(
            config_key='password_viewing_enabled'
        ).first()
        
        if not config:
            return {'enabled': True, 'require_mfa': False, 'session_timeout': 900}  # Default: enabled for demo
        
        return config.config_value
    
    @staticmethod
    def initiate_secure_session(admin_user_id: str, admin_password: str, 
                               operations: list = None) -> dict:
        """
        Create secure session for sensitive operations
        Requires admin to re-authenticate
        """
        try:
            admin_user = User.query.get(admin_user_id)
            
            if not admin_user or admin_user.account_type != 'admin':
                return {'success': False, 'error': 'Unauthorized'}
            
            # Verify admin password
            if not admin_user.check_password(admin_password):
                return {'success': False, 'error': 'Invalid password'}
            
            # Check if password viewing is enabled
            config = AdminSecurityService.get_password_viewing_config()
            if not config.get('enabled', False):
                return {'success': False, 'error': 'Password viewing is disabled'}
            
            # Generate secure session token
            session_token = secrets.token_urlsafe(32)
            
            # Create secure session
            secure_session = AdminSecureSession(
                admin_id=admin_user_id,
                session_token=session_token,
                operations_allowed=operations or ['view_passwords'],
                expires_at=datetime.utcnow() + timedelta(seconds=config.get('session_timeout', 900)),
                ip_address=request.remote_addr if request else None,
                user_agent=request.user_agent.string if request else None
            )
            
            db.session.add(secure_session)
            db.session.commit()
            
            return {
                'success': True,
                'session_token': session_token,
                'expires_at': secure_session.expires_at.isoformat(),
                'operations_allowed': secure_session.operations_allowed,
                'requires_mfa': config.get('require_mfa', False)
            }
            
        except Exception as e:
            current_app.logger.error(f"Secure session creation failed: {str(e)}")
            return {'success': False, 'error': 'Internal server error'}
    
    @staticmethod
    def verify_secure_session(admin_user_id: str, session_token: str = None) -> bool:
        """Verify admin has valid secure session"""
        try:
            if not session_token:
                # Try to get from request headers
                session_token = request.headers.get('X-Secure-Session-Token')
            
            if not session_token:
                return False
            
            secure_session = AdminSecureSession.query.filter_by(
                admin_id=admin_user_id,
                session_token=session_token
            ).first()
            
            if not secure_session or not secure_session.is_valid():
                return False
            
            # Update activity timestamp
            secure_session.update_activity()
            db.session.commit()
            
            return True
            
        except Exception:
            return False
    
    @staticmethod
    def revoke_secure_session(admin_user_id: str, session_token: str) -> bool:
        """Revoke secure session"""
        try:
            secure_session = AdminSecureSession.query.filter_by(
                admin_id=admin_user_id,
                session_token=session_token
            ).first()
            
            if secure_session:
                secure_session.is_revoked = True
                db.session.commit()
                return True
            
            return False
            
        except Exception:
            return False
    
    @staticmethod
    def check_rate_limit(admin_user_id: str, operation: str = 'view_password') -> bool:
        """Check if admin has exceeded rate limits"""
        try:
            # Get security config
            config = AdminSecurityService.get_security_controls_config()
            max_views = config.get('max_views_per_hour', 10)
            
            # Count password views in last hour
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            
            recent_views = PasswordViewAudit.query.filter(
                PasswordViewAudit.admin_id == admin_user_id,
                PasswordViewAudit.viewed_at > one_hour_ago
            ).count()
            
            return recent_views < max_views
            
        except Exception:
            return True  # Allow on error, but log it
    
    @staticmethod
    def get_security_controls_config():
        """Get security controls configuration"""
        config = AdminSecurityConfig.query.filter_by(
            config_key='security_controls'
        ).first()
        
        if not config:
            return {'max_views_per_hour': 10, 'require_justification': True, 'alert_on_access': True}
        
        return config.config_value
    
    @staticmethod
    def initialize_default_configs():
        """Initialize default security configurations"""
        try:
            # Default password viewing configuration
            if not AdminSecurityConfig.query.filter_by(config_key='password_viewing_enabled').first():
                config = AdminSecurityConfig(
                    config_key='password_viewing_enabled',
                    config_value={'enabled': True, 'require_mfa': False, 'session_timeout': 900}
                )
                db.session.add(config)
            
            # Default security controls
            if not AdminSecurityConfig.query.filter_by(config_key='security_controls').first():
                config = AdminSecurityConfig(
                    config_key='security_controls',
                    config_value={'max_views_per_hour': 10, 'require_justification': True, 'alert_on_access': True}
                )
                db.session.add(config)
            
            # Default audit retention
            if not AdminSecurityConfig.query.filter_by(config_key='audit_retention').first():
                config = AdminSecurityConfig(
                    config_key='audit_retention',
                    config_value={'password_views_days': 2555, 'auto_delete': True}  # 7 years
                )
                db.session.add(config)
            
            db.session.commit()
            
        except Exception as e:
            current_app.logger.error(f"Failed to initialize security configs: {str(e)}")
            db.session.rollback()