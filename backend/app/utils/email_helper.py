import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from typing import Optional, List
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailConfig:
    """Email configuration class"""
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.sender_email = os.getenv('SENDER_EMAIL')
        self.sender_password = os.getenv('SENDER_PASSWORD')
        self.smtp_username = os.getenv('SMTP_USERNAME')  # For SES, this is different from email
        self.sender_name = os.getenv('SENDER_NAME', 'Tutor Academy')
        self.use_ssl = os.getenv('SMTP_USE_SSL', 'false').lower() == 'true'
        
        # Use SMTP username if provided (for SES), otherwise fall back to sender email
        self.auth_username = self.smtp_username if self.smtp_username else self.sender_email
        
        if not self.sender_email or not self.sender_password:
            raise ValueError("SENDER_EMAIL and SENDER_PASSWORD environment variables must be set")

def send_email(
    recipient_email: str,
    subject: str,
    text_content: str,
    html_content: Optional[str] = None,
    attachments: Optional[List[str]] = None,
    cc_emails: Optional[List[str]] = None,
    bcc_emails: Optional[List[str]] = None
) -> bool:
    """
    Send an email with optional HTML content and attachments
    
    Args:
        recipient_email (str): Recipient's email address
        subject (str): Email subject
        text_content (str): Plain text content
        html_content (str, optional): HTML content for rich emails
        attachments (List[str], optional): List of file paths to attach
        cc_emails (List[str], optional): List of CC email addresses
        bcc_emails (List[str], optional): List of BCC email addresses
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Initialize email configuration
        config = EmailConfig()
        
        # Create message container
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{config.sender_name} <{config.sender_email}>"
        message["To"] = recipient_email
        
        # Add CC and BCC if provided
        if cc_emails:
            message["Cc"] = ", ".join(cc_emails)
        if bcc_emails:
            message["Bcc"] = ", ".join(bcc_emails)
        
        # Create plain text part
        text_part = MIMEText(text_content, "plain")
        message.attach(text_part)
        
        # Create HTML part if provided
        if html_content:
            html_part = MIMEText(html_content, "html")
            message.attach(html_part)
        
        # Add attachments if provided
        if attachments:
            for file_path in attachments:
                if os.path.isfile(file_path):
                    with open(file_path, "rb") as attachment:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(attachment.read())
                    
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f'attachment; filename= {os.path.basename(file_path)}'
                    )
                    message.attach(part)
                else:
                    logger.warning(f"Attachment file not found: {file_path}")
        
        # Prepare recipient list (including CC and BCC)
        all_recipients = [recipient_email]
        if cc_emails:
            all_recipients.extend(cc_emails)
        if bcc_emails:
            all_recipients.extend(bcc_emails)
        
        # Create secure connection and send email
        context = ssl.create_default_context()
        
        if config.use_ssl:
            # Use SSL connection (required for Amazon WorkMail and port 465)
            with smtplib.SMTP_SSL(config.smtp_server, config.smtp_port, context=context) as server:
                server.login(config.auth_username, config.sender_password)
                server.sendmail(config.sender_email, all_recipients, message.as_string())
        else:
            # Use STARTTLS (Gmail, Outlook, Amazon SES, etc. on port 587)
            with smtplib.SMTP(config.smtp_server, config.smtp_port) as server:
                server.starttls(context=context)
                server.login(config.auth_username, config.sender_password)
                server.sendmail(config.sender_email, all_recipients, message.as_string())
        
        logger.info(f"Email sent successfully to {recipient_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {recipient_email}: {str(e)}")
        return False

def send_simple_email(recipient_email: str, subject: str, text_content: str) -> bool:
    """
    Simplified email sending function for basic text emails
    
    Args:
        recipient_email (str): Recipient's email address
        subject (str): Email subject
        text_content (str): Plain text content
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    return send_email(recipient_email, subject, text_content)

def send_welcome_email(recipient_email: str, user_name: str) -> bool:
    """
    Send a welcome email to new users
    
    Args:
        recipient_email (str): New user's email address
        user_name (str): New user's name
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    subject = "Welcome to Tutor Academy!"
    
    text_content = f"""
    Hi {user_name},

    Welcome to Tutor Academy! We're excited to have you join our learning community.

    Your account has been successfully created. You can now:
    - Browse available courses
    - Schedule tutoring sessions
    - Connect with qualified tutors
    - Track your learning progress

    If you have any questions, feel free to reach out to our support team.

    Best regards,
    The Tutor Academy Team
    """
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4338ca;">Welcome to Tutor Academy!</h2>
            
            <p>Hi <strong>{user_name}</strong>,</p>
            
            <p>Welcome to Tutor Academy! We're excited to have you join our learning community.</p>
            
            <p>Your account has been successfully created. You can now:</p>
            <ul>
                <li>Browse available courses</li>
                <li>Schedule tutoring sessions</li>
                <li>Connect with qualified tutors</li>
                <li>Track your learning progress</li>
            </ul>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Best regards,<br>
            <strong>The Tutor Academy Team</strong></p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
                This email was sent from Tutor Academy. If you did not create an account, please ignore this email.
            </p>
        </div>
    </body>
    </html>
    """
    
    return send_email(recipient_email, subject, text_content, html_content)

def send_session_reminder(recipient_email: str, user_name: str, session_details: dict) -> bool:
    """
    Send a session reminder email
    
    Args:
        recipient_email (str): Recipient's email address
        user_name (str): User's name
        session_details (dict): Dictionary containing session information
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    subject = f"Session Reminder: {session_details.get('title', 'Upcoming Session')}"
    
    text_content = f"""
    Hi {user_name},

    This is a reminder about your upcoming tutoring session:

    Session: {session_details.get('title', 'N/A')}
    Date: {session_details.get('date', 'N/A')}
    Time: {session_details.get('time', 'N/A')}
    Duration: {session_details.get('duration', 'N/A')} minutes
    Tutor: {session_details.get('tutor_name', 'N/A')}

    Meeting Details:
    Meeting ID: {session_details.get('meeting_id', 'N/A')}
    Meeting Link: {session_details.get('meeting_link', 'N/A')}
    Password: {session_details.get('meeting_password', 'N/A')}

    Please join the session 5 minutes before the scheduled time.

    Best regards,
    The Tutor Academy Team
    """
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4338ca;">Session Reminder</h2>
            
            <p>Hi <strong>{user_name}</strong>,</p>
            
            <p>This is a reminder about your upcoming tutoring session:</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2c5aa0;">{session_details.get('title', 'N/A')}</h3>
                <p><strong>Date:</strong> {session_details.get('date', 'N/A')}</p>
                <p><strong>Time:</strong> {session_details.get('time', 'N/A')}</p>
                <p><strong>Duration:</strong> {session_details.get('duration', 'N/A')} minutes</p>
                <p><strong>Tutor:</strong> {session_details.get('tutor_name', 'N/A')}</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #1565c0;">Meeting Details</h4>
                <p><strong>Meeting ID:</strong> {session_details.get('meeting_id', 'N/A')}</p>
                <p><strong>Meeting Link:</strong> <a href="{session_details.get('meeting_link', '#')}" style="color: #1565c0;">{session_details.get('meeting_link', 'N/A')}</a></p>
                <p><strong>Password:</strong> {session_details.get('meeting_password', 'N/A')}</p>
            </div>
            
            <p><strong>Please join the session 5 minutes before the scheduled time.</strong></p>
            
            <p>Best regards,<br>
            <strong>The Tutor Academy Team</strong></p>
        </div>
    </body>
    </html>
    """
    
    return send_email(recipient_email, subject, text_content, html_content)

# Email template functions
def get_email_template(template_name: str, **kwargs) -> tuple:
    """
    Get email templates for common use cases
    
    Args:
        template_name (str): Name of the template
        **kwargs: Template variables
    
    Returns:
        tuple: (subject, text_content, html_content)
    """
    templates = {
        'password_reset': {
            'subject': 'Password Reset Request',
            'text': f"""
            Hi {kwargs.get('user_name', 'User')},

            You requested a password reset for your Tutor Academy account.

            Please click the following link to reset your password:
            {kwargs.get('reset_link', 'N/A')}

            This link will expire in 1 hour.

            If you did not request this password reset, please ignore this email.

            Best regards,
            The Tutor Academy Team
            """,
            'html': f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4338ca;">Password Reset Request</h2>
                    
                    <p>Hi <strong>{kwargs.get('user_name', 'User')}</strong>,</p>
                    
                    <p>You requested a password reset for your Tutor Academy account.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{kwargs.get('reset_link', '#')}" 
                           style="background: #4338ca; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 6px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p style="color: #666; font-size: 14px;">
                        This link will expire in 1 hour. If you did not request this password reset, please ignore this email.
                    </p>
                    
                    <p>Best regards,<br>
                    <strong>The Tutor Academy Team</strong></p>
                </div>
            </body>
            </html>
            """
        },
        
        'admin_password_reset': {
            'subject': 'Your password has been reset by an administrator',
            'text': f"""
            Hi {kwargs.get('user_name', 'User')},

            An administrator ({kwargs.get('admin_name', 'Administrator')}) has initiated a password reset for your Tutor Academy account.

            Please click the following link to reset your password:
            {kwargs.get('reset_link', 'N/A')}

            This link will expire in {kwargs.get('expiry_time', '1 hour')}.

            If you did not request this password reset, please contact support immediately.

            Best regards,
            The Tutor Academy Team
            """,
            'html': f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                        <h2 style="color: #856404; margin: 0;">⚠️ Password Reset by Administrator</h2>
                    </div>
                    
                    <p>Hi <strong>{kwargs.get('user_name', 'User')}</strong>,</p>
                    
                    <p>An administrator (<strong>{kwargs.get('admin_name', 'Administrator')}</strong>) has initiated a password reset for your Tutor Academy account.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{kwargs.get('reset_link', '#')}" 
                           style="background: #dc3545; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 6px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">
                        This link will expire in <strong>{kwargs.get('expiry_time', '1 hour')}</strong>. 
                        If you did not request this password reset, please contact support immediately.
                    </p>
                    
                    <p>Best regards,<br>
                    <strong>The Tutor Academy Team</strong></p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">
                        This action was initiated by an administrator for security purposes. All admin actions are logged and audited.
                    </p>
                </div>
            </body>
            </html>
            """
        },
        
        'admin_temp_password': {
            'subject': 'Temporary password created by administrator',
            'text': f"""
            Hi {kwargs.get('user_name', 'User')},

            An administrator ({kwargs.get('admin_name', 'Administrator')}) has generated a temporary password for your Tutor Academy account.

            Temporary Password: {kwargs.get('temporary_password', 'N/A')}

            This password will expire in {kwargs.get('expiry_time', '24 hours')}. You will be required to change it upon your next login.

            Please log in and change your password as soon as possible.

            Best regards,
            The Tutor Academy Team
            """,
            'html': f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                        <h2 style="color: #856404; margin: 0;">🔑 Temporary Password Generated</h2>
                    </div>
                    
                    <p>Hi <strong>{kwargs.get('user_name', 'User')}</strong>,</p>
                    
                    <p>An administrator (<strong>{kwargs.get('admin_name', 'Administrator')}</strong>) has generated a temporary password for your Tutor Academy account.</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; border: 2px solid #dee2e6;">
                        <p style="margin: 0 0 10px 0;"><strong>Temporary Password:</strong></p>
                        <code style="font-size: 18px; background: #fff; padding: 10px 15px; border-radius: 4px; display: inline-block; border: 1px solid #ccc; letter-spacing: 1px;">{kwargs.get('temporary_password', 'N/A')}</code>
                    </div>
                    
                    <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <p style="margin: 0; color: #721c24;"><strong>⚠️ Important:</strong></p>
                        <ul style="margin: 10px 0 0 20px; color: #721c24;">
                            <li>This password will expire in <strong>{kwargs.get('expiry_time', '24 hours')}</strong></li>
                            <li>You will be required to change it upon your next login</li>
                            <li>Keep this password secure and do not share it</li>
                        </ul>
                    </div>
                    
                    <p><strong>Please log in and change your password as soon as possible.</strong></p>
                    
                    <p>Best regards,<br>
                    <strong>The Tutor Academy Team</strong></p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">
                        This temporary password was generated by an administrator. All admin actions are logged and audited.
                    </p>
                </div>
            </body>
            </html>
            """
        }
    }
    
    if template_name in templates:
        template = templates[template_name]
        return template['subject'], template['text'], template['html']
    else:
        raise ValueError(f"Template '{template_name}' not found")