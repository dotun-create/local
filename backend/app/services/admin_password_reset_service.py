import secrets
import string
from datetime import datetime, timedelta
from flask import current_app, request
from app import db
from app.models import User, AdminAction, PasswordResetToken
from app.utils.email_helper import send_email, get_email_template
import hashlib

class AdminPasswordResetService:
    
    @staticmethod
    def reset_password_via_email(admin_user_id: str, target_user_id: str, 
                                notify_user: bool = True) -> dict:
        """
        Admin-initiated password reset via email link
        """
        try:
            admin_user = User.query.get(admin_user_id)
            target_user = User.query.get(target_user_id)
            
            if not admin_user or admin_user.account_type != 'admin':
                return {'success': False, 'error': 'Unauthorized'}
            
            if not target_user or not target_user.is_active:
                return {'success': False, 'error': 'User not found or inactive'}
            
            # Generate secure reset token
            raw_token = secrets.token_urlsafe(32)
            token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
            
            # Create reset token record
            reset_token = PasswordResetToken(
                user_id=target_user_id,
                token_hash=token_hash,
                initiated_by_admin=admin_user_id,
                expires_at=datetime.utcnow() + timedelta(hours=1),
                ip_address=request.remote_addr if request else None
            )
            
            db.session.add(reset_token)
            
            # Log admin action
            admin_action = AdminAction(
                admin_id=admin_user_id,
                action_type='password_reset_email',
                target_user_id=target_user_id,
                details={
                    'method': 'email_link',
                    'notify_user': notify_user,
                    'token_id': str(reset_token.id)
                },
                ip_address=request.remote_addr if request else None,
                user_agent=request.user_agent.string if request else None
            )
            
            db.session.add(admin_action)
            db.session.commit()
            
            # Send email notification if requested
            if notify_user:
                frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000')
                reset_link = f"{frontend_url}/reset-password?token={raw_token}"
                
                subject, text_content, html_content = get_email_template(
                    'admin_password_reset',
                    user_name=target_user.profile.get('name', target_user.email) if target_user.profile else target_user.email,
                    reset_link=reset_link,
                    admin_name=admin_user.profile.get('name', admin_user.email) if admin_user.profile else admin_user.email,
                    expiry_time='1 hour'
                )
                
                email_sent = send_email(target_user.email, subject, text_content, html_content)
                
                if not email_sent:
                    return {'success': False, 'error': 'Failed to send reset email'}
            
            return {
                'success': True,
                'message': 'Password reset email initiated',
                'token_id': str(reset_token.id),
                'expires_at': reset_token.expires_at.isoformat(),
                'email_sent': notify_user
            }
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Admin password reset via email failed: {str(e)}")
            return {'success': False, 'error': 'Internal server error'}
    
    @staticmethod
    def generate_temporary_password(admin_user_id: str, target_user_id: str, 
                                   password_length: int = 12) -> dict:
        """
        Admin-initiated temporary password generation
        """
        try:
            admin_user = User.query.get(admin_user_id)
            target_user = User.query.get(target_user_id)
            
            if not admin_user or admin_user.account_type != 'admin':
                return {'success': False, 'error': 'Unauthorized'}
            
            if not target_user or not target_user.is_active:
                return {'success': False, 'error': 'User not found or inactive'}
            
            # Generate secure temporary password
            characters = string.ascii_letters + string.digits + "!@#$%^&*"
            temp_password = ''.join(secrets.choice(characters) for _ in range(password_length))
            
            # Set temporary password
            target_user.set_temporary_password(temp_password, admin_user_id)
            
            # Log admin action
            admin_action = AdminAction(
                admin_id=admin_user_id,
                action_type='password_reset_temp',
                target_user_id=target_user_id,
                details={
                    'method': 'temporary_password',
                    'password_length': password_length,
                    'expires_at': target_user.temp_password_expires_at.isoformat() if target_user.temp_password_expires_at else None
                },
                ip_address=request.remote_addr if request else None,
                user_agent=request.user_agent.string if request else None
            )
            
            db.session.add(admin_action)
            db.session.commit()
            
            # Send notification email
            subject, text_content, html_content = get_email_template(
                'admin_temp_password',
                user_name=target_user.profile.get('name', target_user.email) if target_user.profile else target_user.email,
                temporary_password=temp_password,
                admin_name=admin_user.profile.get('name', admin_user.email) if admin_user.profile else admin_user.email,
                expiry_time='24 hours'
            )
            
            email_sent = send_email(target_user.email, subject, text_content, html_content)
            
            return {
                'success': True,
                'message': 'Temporary password generated',
                'temporary_password': temp_password,
                'expires_at': target_user.temp_password_expires_at.isoformat() if target_user.temp_password_expires_at else None,
                'email_sent': email_sent
            }
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Temporary password generation failed: {str(e)}")
            return {'success': False, 'error': 'Internal server error'}
    
    @staticmethod
    def bulk_reset_passwords(admin_user_id: str, user_ids: list, 
                           method: str = 'email') -> dict:
        """
        Bulk password reset for multiple users
        """
        results = {
            'success_count': 0,
            'failure_count': 0,
            'results': []
        }
        
        for user_id in user_ids:
            if method == 'email':
                result = AdminPasswordResetService.reset_password_via_email(
                    admin_user_id, user_id
                )
            else:  # temporary password
                result = AdminPasswordResetService.generate_temporary_password(
                    admin_user_id, user_id
                )
            
            if result['success']:
                results['success_count'] += 1
            else:
                results['failure_count'] += 1
            
            results['results'].append({
                'user_id': user_id,
                'success': result['success'],
                'message': result.get('message', ''),
                'error': result.get('error', ''),
                'temporary_password': result.get('temporary_password', '') if method == 'temp' else ''
            })
        
        return results
    
    @staticmethod
    def reset_password_with_token(token: str, new_password: str) -> dict:
        """
        User endpoint to reset password using admin-generated token
        """
        try:
            # Hash the token to find it in database
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            
            reset_token = PasswordResetToken.query.filter_by(
                token_hash=token_hash
            ).first()
            
            if not reset_token or reset_token.is_expired() or reset_token.is_used():
                return {'success': False, 'error': 'Invalid or expired token'}
            
            # Reset the password
            user = reset_token.user
            # Store plaintext for admin viewing if needed
            user.set_password(new_password, store_plaintext=True)
            user.clear_temporary_password()  # Clear any temp password
            
            # Mark token as used
            reset_token.used_at = datetime.utcnow()
            reset_token.ip_address = request.remote_addr if request else None
            
            db.session.commit()
            
            return {'success': True, 'message': 'Password reset successfully'}
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Password reset with token failed: {str(e)}")
            return {'success': False, 'error': 'Internal server error'}