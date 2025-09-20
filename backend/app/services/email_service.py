"""Email service for sending password reset and other notification emails"""

import logging
from app.utils.email_helper import send_email
from typing import Optional

logger = logging.getLogger(__name__)

def send_password_reset_email(recipient_email: str, user_name: str, reset_url: str) -> bool:
    """
    Send a password reset email to the user
    
    Args:
        recipient_email (str): User's email address
        user_name (str): User's name for personalization
        reset_url (str): Complete URL with reset token
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        subject = "Reset Your Password - Tutor Academy"
        
        # Plain text version
        text_content = f"""
Hi {user_name},

You recently requested to reset your password for your Tutor Academy account.

To reset your password, please click the link below:
{reset_url}

This link will expire in 1 hour for security reasons.

If you did not request a password reset, please ignore this email or contact our support team if you have any concerns.

Best regards,
The Tutor Academy Team

---
This is an automated message. Please do not reply to this email.
        """.strip()
        
        # HTML version for better presentation
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
        }}
        .header {{ 
            background-color: #667eea; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0;
        }}
        .content {{ 
            background-color: #f8f9fa; 
            padding: 30px; 
            border-radius: 0 0 8px 8px;
        }}
        .reset-button {{
            display: inline-block;
            background-color: #667eea;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: bold;
        }}
        .reset-button:hover {{
            background-color: #5a67d8;
        }}
        .footer {{ 
            margin-top: 30px; 
            font-size: 12px; 
            color: #6c757d; 
            border-top: 1px solid #dee2e6; 
            padding-top: 20px;
        }}
        .warning {{
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h2>🔒 Reset Your Password</h2>
    </div>
    
    <div class="content">
        <p>Hi <strong>{user_name}</strong>,</p>
        
        <p>You recently requested to reset your password for your Tutor Academy account.</p>
        
        <p>To reset your password, please click the button below:</p>
        
        <p style="text-align: center;">
            <a href="{reset_url}" class="reset-button">Reset My Password</a>
        </p>
        
        <div class="warning">
            <strong>⏰ This link will expire in 1 hour</strong> for security reasons.
        </div>
        
        <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; background-color: #e9ecef; padding: 10px; border-radius: 4px;">
            {reset_url}
        </p>
        
        <p>If you did not request a password reset, please ignore this email or contact our support team if you have any concerns.</p>
        
        <p>Best regards,<br>
        <strong>The Tutor Academy Team</strong></p>
    </div>
    
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
        <p>© 2024 Tutor Academy. All rights reserved.</p>
    </div>
</body>
</html>
        """.strip()
        
        # Send the email
        success = send_email(
            recipient_email=recipient_email,
            subject=subject,
            text_content=text_content,
            html_content=html_content
        )
        
        if success:
            logger.info(f"Password reset email sent successfully to {recipient_email}")
        else:
            logger.error(f"Failed to send password reset email to {recipient_email}")
        
        return success
        
    except Exception as e:
        logger.error(f"Error sending password reset email to {recipient_email}: {str(e)}")
        return False

def send_password_changed_notification(recipient_email: str, user_name: str) -> bool:
    """
    Send a notification email when password has been successfully changed
    
    Args:
        recipient_email (str): User's email address
        user_name (str): User's name for personalization
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        subject = "Password Changed Successfully - Tutor Academy"
        
        text_content = f"""
Hi {user_name},

Your password for your Tutor Academy account has been successfully changed.

If you made this change, no further action is required.

If you did not change your password, please contact our support team immediately at support@tutoracademy.com.

Best regards,
The Tutor Academy Team

---
This is an automated message. Please do not reply to this email.
        """.strip()
        
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px;
        }}
        .header {{ 
            background-color: #28a745; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0;
        }}
        .content {{ 
            background-color: #f8f9fa; 
            padding: 30px; 
            border-radius: 0 0 8px 8px;
        }}
        .footer {{ 
            margin-top: 30px; 
            font-size: 12px; 
            color: #6c757d; 
            border-top: 1px solid #dee2e6; 
            padding-top: 20px;
        }}
        .alert {{
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h2>✅ Password Changed Successfully</h2>
    </div>
    
    <div class="content">
        <p>Hi <strong>{user_name}</strong>,</p>
        
        <p>Your password for your Tutor Academy account has been successfully changed.</p>
        
        <p>✅ <strong>If you made this change</strong>, no further action is required.</p>
        
        <div class="alert">
            <strong>🚨 If you did not change your password</strong>, please contact our support team immediately at <a href="mailto:support@tutoracademy.com">support@tutoracademy.com</a>.
        </div>
        
        <p>Best regards,<br>
        <strong>The Tutor Academy Team</strong></p>
    </div>
    
    <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
        <p>© 2024 Tutor Academy. All rights reserved.</p>
    </div>
</body>
</html>
        """.strip()
        
        success = send_email(
            recipient_email=recipient_email,
            subject=subject,
            text_content=text_content,
            html_content=html_content
        )
        
        if success:
            logger.info(f"Password change notification sent successfully to {recipient_email}")
        else:
            logger.error(f"Failed to send password change notification to {recipient_email}")
        
        return success
        
    except Exception as e:
        logger.error(f"Error sending password change notification to {recipient_email}: {str(e)}")
        return False