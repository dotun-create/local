"""
Guardian invitation and management service
Handles the flow for inviting guardians when students sign up
"""

import uuid
import secrets
import string
from datetime import datetime, timedelta
from app import db
from app.models import User, GuardianInvitation, Enrollment, Notification
from app.utils.email_helper import send_email
from sqlalchemy.orm.attributes import flag_modified
import logging

logger = logging.getLogger(__name__)

class GuardianService:
    """Service to handle guardian invitations and account management"""
    
    @staticmethod
    def _generate_guardian_credentials() -> dict:
        """Generate automatic username and password for new guardian"""
        # Generate username based on timestamp
        username = f"guardian_{int(datetime.utcnow().timestamp())}"
        
        # Generate secure password (8-12 characters with letters and numbers)
        password_length = secrets.randbelow(5) + 8  # Random length 8-12
        password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(password_length))
        
        return {
            'username': username,
            'password': password
        }
    
    @staticmethod
    def create_guardian_request_on_signup(student_id: str, guardian_email: str) -> dict:
        """
        Create a guardian request during student signup (new approval workflow)

        Args:
            student_id (str): ID of the student
            guardian_email (str): Email address of the guardian

        Returns:
            dict: Result containing request details or error
        """
        try:
            from app.models import GuardianStudentRequest, GuardianStudentLink

            # Check if student exists
            student = User.query.get(student_id)
            if not student or student.account_type != 'student':
                return {'success': False, 'error': 'Student not found'}

            # Check if guardian exists
            existing_guardian = User.query.filter_by(email=guardian_email, account_type='guardian').first()

            if existing_guardian:
                # Guardian exists, create request for approval
                return GuardianService._create_request_for_existing_guardian(student, existing_guardian)
            else:
                # Guardian doesn't exist, fall back to old invitation system
                # But also create a request for when they eventually sign up
                return GuardianService._handle_nonexistent_guardian_signup(student, guardian_email)

        except Exception as e:
            logger.error(f"Error creating guardian request on signup: {str(e)}")
            return {'success': False, 'error': 'Failed to create guardian request'}

    @staticmethod
    def _create_request_for_existing_guardian(student: User, guardian: User) -> dict:
        """
        Create a guardian request for an existing guardian

        Args:
            student (User): Student user object
            guardian (User): Guardian user object

        Returns:
            dict: Result of request creation
        """
        try:
            from app.models import GuardianStudentRequest, GuardianStudentLink

            # Check for existing request
            existing_request = GuardianStudentRequest.query.filter_by(
                student_id=student.id,
                guardian_id=guardian.id,
                status='pending'
            ).first()

            if existing_request:
                return {
                    'success': True,
                    'message': 'Request already exists',
                    'request_id': existing_request.id,
                    'action': 'existing_request'
                }

            # Check if already linked
            existing_link = GuardianStudentLink.get_active_link(student.id, guardian.id)
            if existing_link:
                return {
                    'success': True,
                    'message': 'Student already linked to guardian',
                    'link_id': existing_link.id,
                    'action': 'already_linked'
                }

            # Create new request
            student_name = student.profile.get('name', student.email) if student.profile else student.email
            new_request = GuardianStudentRequest(
                student_id=student.id,
                guardian_id=guardian.id,
                student_message=f'Requested during signup by {student_name}',
                notes='Auto-created during student registration'
            )

            db.session.add(new_request)
            db.session.commit()

            # Create notification for guardian
            notification = Notification(
                user_id=guardian.id,
                type='student_request',
                title='New Student Request',
                message=f'{student_name} has requested to link you as their guardian.',
                data={
                    'student_id': student.id,
                    'student_name': student_name,
                    'student_email': student.email,
                    'request_id': new_request.id,
                    'action_required': 'approval'
                }
            )
            db.session.add(notification)
            db.session.commit()

            # Send notification email to guardian
            GuardianService._send_student_request_email(guardian, student, new_request.id)

            logger.info(f"Guardian request created during signup: {new_request.id}")

            return {
                'success': True,
                'message': 'Guardian request created successfully',
                'request_id': new_request.id,
                'guardian_id': guardian.id,
                'action': 'request_created'
            }

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating request for existing guardian: {str(e)}")
            return {'success': False, 'error': 'Failed to create guardian request'}

    @staticmethod
    def _handle_nonexistent_guardian_signup(student: User, guardian_email: str) -> dict:
        """
        Handle signup when guardian doesn't exist yet
        Store the request to be processed when guardian signs up

        Args:
            student (User): Student user object
            guardian_email (str): Guardian email address

        Returns:
            dict: Result of handling
        """
        try:
            # Create guardian account with auto-generated credentials (existing behavior)
            # but also prepare for approval workflow
            result = GuardianService._create_guardian_with_credentials(student, guardian_email)

            # If guardian was created, also create a request for proper workflow
            if result.get('success') and result.get('guardian_id'):
                guardian = User.query.get(result['guardian_id'])
                if guardian:
                    # Create a request that requires approval (no auto-approval)
                    from app.models import GuardianStudentRequest, GuardianStudentLink

                    student_name = student.profile.get('name', student.email) if student.profile else student.email
                    pending_request = GuardianStudentRequest(
                        student_id=student.id,
                        guardian_id=guardian.id,
                        student_message=f'Requested during signup by {student_name}',
                        status='pending',
                        notes='Auto-created during student registration - requires guardian approval'
                    )

                    db.session.add(pending_request)
                    db.session.commit()

                    # Create notification for guardian about the pending request
                    from app.models import Notification
                    notification = Notification(
                        user_id=guardian.id,
                        type='student_request',
                        title='New Student Request',
                        message=f'{student_name} has requested to link you as their guardian.',
                        data={
                            'student_id': student.id,
                            'student_name': student_name,
                            'student_email': student.email,
                            'request_id': pending_request.id,
                            'action_required': 'approval'
                        }
                    )
                    db.session.add(notification)
                    db.session.commit()

                    # Send notification email to guardian about the pending request
                    GuardianService._send_student_request_email(guardian, student, pending_request.id)

                    result['request_id'] = pending_request.id
                    result['action'] = 'created_pending'

            return result

        except Exception as e:
            logger.error(f"Error handling nonexistent guardian signup: {str(e)}")
            return {'success': False, 'error': 'Failed to handle guardian signup'}

    @staticmethod
    def _send_student_request_email(guardian: User, student: User, request_id: str) -> bool:
        """
        Send email notification when student requests guardian approval

        Args:
            guardian (User): Guardian user object
            student (User): Student user object
            request_id (str): ID of the request

        Returns:
            bool: True if email sent successfully
        """
        try:
            guardian_name = guardian.profile.get('name', guardian.email) if guardian.profile else guardian.email
            student_name = student.profile.get('name', student.email) if student.profile else student.email

            # Create dashboard link
            dashboard_link = "http://localhost:3000/guardian"

            subject = f"Student Guardian Request - {student_name}"

            text_content = f"""
Hello {guardian_name},

{student_name} has signed up for Tutor Academy and requested to link you as their guardian.

Please review and approve this request in your guardian dashboard:
{dashboard_link}

Student Details:
- Name: {student_name}
- Email: {student.email}
- Grade: {student.profile.get('grade', 'Not specified') if student.profile else 'Not specified'}

Once approved, you'll be able to:
- Monitor their educational progress
- Receive updates about sessions and assignments
- Manage course enrollments
- Communicate with tutors
- View performance reports

Login to approve or decline this request.

Best regards,
The Tutor Academy Team
            """.strip()

            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4338ca; margin-bottom: 10px;">Student Guardian Request</h1>
                    <p style="color: #666; font-size: 16px;">A student has requested your approval to be their guardian</p>
                </div>

                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <p style="margin: 0 0 15px 0; font-size: 16px;">
                        <strong>{student_name}</strong> has signed up for Tutor Academy and requested to link you as their guardian.
                    </p>
                </div>

                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #1565c0; margin-top: 0;">Student Details</h3>
                    <p><strong>Name:</strong> {student_name}</p>
                    <p><strong>Email:</strong> {student.email}</p>
                    <p><strong>Grade:</strong> {student.profile.get('grade', 'Not specified') if student.profile else 'Not specified'}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="{dashboard_link}"
                       style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none;
                              border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                        Review Request
                    </a>
                </div>

                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #1565c0; margin-top: 0;">Once approved, you'll be able to:</h3>
                    <ul style="margin: 10px 0; padding-left: 20px; color: #333;">
                        <li>Monitor their educational progress</li>
                        <li>Receive updates about sessions and assignments</li>
                        <li>Manage course enrollments</li>
                        <li>Communicate with tutors</li>
                        <li>View performance reports</li>
                    </ul>
                </div>

                <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                    Please login to your guardian dashboard to approve or decline this request.
                </p>

                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

                <p style="color: #999; font-size: 12px; text-align: center;">
                    This email was sent from Tutor Academy.
                </p>
            </body>
            </html>
            """

            return send_email(guardian.email, subject, text_content, html_content)

        except Exception as e:
            logger.error(f"Error sending student request email: {str(e)}")
            return False

    @staticmethod
    def create_guardian_invitation(student_id: str, guardian_email: str) -> dict:
        """
        Create a guardian invitation for a student
        
        Args:
            student_id (str): ID of the student
            guardian_email (str): Email address of the guardian
            
        Returns:
            dict: Result containing invitation details or error
        """
        try:
            # Check if student exists
            student = User.query.get(student_id)
            if not student or student.account_type != 'student':
                return {'success': False, 'error': 'Student not found'}
            
            # Check if guardian already exists
            existing_guardian = User.query.filter_by(email=guardian_email, account_type='guardian').first()
            
            if existing_guardian:
                # Guardian already exists, link student to guardian
                return GuardianService._link_existing_guardian(student, existing_guardian)
            else:
                # Create guardian account and send credentials
                return GuardianService._create_guardian_with_credentials(student, guardian_email)
                
        except Exception as e:
            logger.error(f"Error creating guardian invitation: {str(e)}")
            return {'success': False, 'error': 'Failed to create guardian invitation'}
    
    @staticmethod
    def _link_existing_guardian(student: User, guardian: User) -> dict:
        """
        Link student to existing guardian
        
        Args:
            student (User): Student user object
            guardian (User): Guardian user object
            
        Returns:
            dict: Result of linking operation
        """
        try:
            # Update student profile to include guardian
            if not student.profile:
                student.profile = {}
            
            student.profile['guardian_id'] = guardian.id
            student.profile['guardian_email'] = guardian.email
            student.profile['guardian_name'] = guardian.profile.get('name', guardian.email)
            
            # Update guardian profile to include student
            if not guardian.profile:
                guardian.profile = {}
            
            if 'students' not in guardian.profile:
                guardian.profile['students'] = []
            
            # Check if student is already linked
            student_info = {
                'id': student.id,
                'name': student.profile.get('name', student.email),
                'email': student.email,
                'grade': student.profile.get('grade', ''),
                'linked_at': datetime.utcnow().isoformat()
            }
            
            # Remove existing entry if found and add updated one
            guardian.profile['students'] = [
                s for s in guardian.profile['students'] 
                if s.get('id') != student.id
            ]
            guardian.profile['students'].append(student_info)
            
            # Update enrollments to link guardian
            enrollments = Enrollment.query.filter_by(student_id=student.id).all()
            for enrollment in enrollments:
                if not enrollment.guardian_id:
                    enrollment.guardian_id = guardian.id
            
            # Mark profiles as modified so SQLAlchemy knows to save JSON changes
            flag_modified(student, 'profile')
            flag_modified(guardian, 'profile')
            
            db.session.commit()
            
            # Create notification for guardian
            student_name = student.profile.get('name', student.email) if student.profile else student.email
            notification = Notification(
                user_id=guardian.id,
                type='student_linked',
                title='New Student Added',
                message=f'{student_name} has been added to your guardian account and needs your approval.',
                data={
                    'student_id': student.id,
                    'student_name': student_name,
                    'student_email': student.email,
                    'action_required': 'approval'
                }
            )
            db.session.add(notification)
            db.session.commit()
            
            # Send notification email to guardian
            GuardianService._send_student_linked_email(guardian, student)
            
            logger.info(f"Student {student.id} linked to existing guardian {guardian.id}")
            
            return {
                'success': True,
                'message': 'Student linked to existing guardian',
                'guardian_id': guardian.id,
                'action': 'linked_existing'
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error linking student to existing guardian: {str(e)}")
            return {'success': False, 'error': 'Failed to link student to guardian'}
    
    @staticmethod
    def _create_guardian_with_credentials(student: User, guardian_email: str) -> dict:
        """
        Create a new guardian account with auto-generated credentials
        
        Args:
            student (User): Student user object
            guardian_email (str): Email address of the guardian
            
        Returns:
            dict: Result of guardian creation
        """
        try:
            # Generate automatic credentials
            credentials = GuardianService._generate_guardian_credentials()
            
            # Get student info for guardian profile
            student_name = student.profile.get('name', student.email) if student.profile else student.email
            student_address = {
                'street': student.profile.get('street', '') if student.profile else '',
                'city': student.profile.get('city', '') if student.profile else '',
                'state': student.profile.get('state', '') if student.profile else '',
                'zipCode': student.profile.get('zipCode', '') if student.profile else '',
                'country': student.profile.get('country', '') if student.profile else ''
            }
            
            # Extract guardian name fields from student profile  
            guardian_first_name = student.profile.get('guardianFirstName', '') if student.profile else ''
            guardian_last_name = student.profile.get('guardianLastName', '') if student.profile else ''
            guardian_full_name = f"{guardian_first_name} {guardian_last_name}".strip()
            
            if not guardian_full_name:
                guardian_full_name = f"Guardian of {student_name}"
            
            # Create guardian account immediately
            guardian = User(
                email=guardian_email,
                account_type='guardian',
                profile={
                    'firstName': guardian_first_name,
                    'lastName': guardian_last_name,
                    'name': guardian_full_name,
                    'phone': student.profile.get('phone', '') if student.profile else '',
                    'street': student_address.get('street', ''),
                    'city': student_address.get('city', ''),
                    'state': student_address.get('state', ''),
                    'zipCode': student_address.get('zipCode', ''),
                    'country': student_address.get('country', ''),
                    'students': [],
                    'account_created_at': datetime.utcnow().isoformat(),
                    'auto_generated': True
                }
            )
            guardian.set_password(credentials['password'])
            
            db.session.add(guardian)
            db.session.flush()  # Get the guardian ID
            
            # Link student to guardian
            GuardianService._link_student_to_guardian(student.id, guardian.id)
            
            # Create welcome notification for new guardian
            welcome_notification = Notification(
                user_id=guardian.id,
                type='guardian_account_created',
                title='Guardian Account Created',
                message=f'Your guardian account has been created for {student_name}. Please check your email for login credentials.',
                data={
                    'student_id': student.id,
                    'student_name': student_name,
                    'auto_created': True
                }
            )
            db.session.add(welcome_notification)
            
            db.session.commit()
            
            # Send credentials email
            email_sent = GuardianService._send_credentials_email(guardian, student, credentials)
            
            if email_sent:
                logger.info(f"Guardian account created and credentials sent: {guardian.id}")
                return {
                    'success': True,
                    'message': 'Guardian account created and credentials sent',
                    'guardian_id': guardian.id,
                    'action': 'created_account'
                }
            else:
                logger.warning(f"Guardian account created but email failed: {guardian.id}")
                return {
                    'success': True,
                    'message': 'Guardian account created but email failed to send',
                    'guardian_id': guardian.id,
                    'action': 'created_no_email'
                }
                
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating guardian account: {str(e)}")
            return {'success': False, 'error': 'Failed to create guardian account'}
    
    @staticmethod
    def _send_credentials_email(guardian: User, student: User, credentials: dict) -> bool:
        """
        Send guardian credentials email
        
        Args:
            guardian (User): Guardian user object
            student (User): Student user object  
            credentials (dict): Generated credentials
            
        Returns:
            bool: True if email sent successfully
        """
        try:
            student_name = student.profile.get('name', student.email) if student.profile else student.email
            guardian_name = guardian.profile.get('name', guardian.email) if guardian.profile else guardian.email
            
            # Create login link
            login_link = "http://localhost:3000/login"
            
            subject = f"Guardian Account Created - Login Credentials"
            
            text_content = f"""
Hello,

A guardian account has been created for you on Tutor Academy for {student_name}.

Your login credentials:
Username/Email: {guardian.email}
Password: {credentials['password']}

Login here: {login_link}

IMPORTANT: Please change your password after your first login for security.

As a guardian, you can now:
- Monitor {student_name}'s educational progress
- Receive updates about sessions and assignments  
- Manage course enrollments
- Communicate with tutors
- View performance reports

If you have any questions, please contact our support team.

Best regards,
The Tutor Academy Team

---
If you did not expect this account creation, please contact our support team immediately.
            """.strip()
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4338ca; margin-bottom: 10px;">Guardian Account Created</h1>
                    <p style="color: #666; font-size: 16px;">Your account has been set up for monitoring {student_name}'s education</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <h3 style="color: #2c5aa0; margin-top: 0;">Login Credentials</h3>
                    <p style="margin: 10px 0;"><strong>Username/Email:</strong> {guardian.email}</p>
                    <p style="margin: 10px 0;"><strong>Password:</strong> <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 14px;">{credentials['password']}</code></p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{login_link}" 
                       style="background: #4338ca; color: white; padding: 15px 30px; text-decoration: none; 
                              border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                        Login to Your Account
                    </a>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 25px 0;">
                    <p style="margin: 0; color: #856404; font-weight: 500;">
                        🔒 IMPORTANT: Please change your password after your first login for security.
                    </p>
                </div>
                
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #1565c0; margin-top: 0;">As a guardian, you can now:</h3>
                    <ul style="margin: 10px 0; padding-left: 20px; color: #333;">
                        <li>Monitor {student_name}'s educational progress</li>
                        <li>Receive updates about sessions and assignments</li>
                        <li>Manage course enrollments</li>
                        <li>Communicate with tutors</li>
                        <li>View performance reports</li>
                    </ul>
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                    If you have any questions, please contact our support team.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                    If you did not expect this account creation, please contact our support team immediately.<br>
                    This email was sent from Tutor Academy.
                </p>
            </body>
            </html>
            """
            
            return send_email(guardian.email, subject, text_content, html_content)
            
        except Exception as e:
            logger.error(f"Error sending guardian credentials email: {str(e)}")
            return False
    
    @staticmethod
    def _send_invitation_email(invitation: GuardianInvitation, student: User) -> bool:
        """
        Send guardian invitation email
        
        Args:
            invitation (GuardianInvitation): Invitation object
            student (User): Student user object
            
        Returns:
            bool: True if email sent successfully
        """
        try:
            student_name = student.profile.get('name', student.email) if student.profile else student.email
            
            # Create invitation link
            invitation_link = f"http://localhost:3000/guardian/signup?token={invitation.invitation_token}"
            
            subject = f"Guardian Account Invitation - {student_name}"
            
            text_content = f"""
Hello,

{student_name} has signed up for Tutor Academy and listed you as their guardian.

To manage their educational progress and stay informed about their learning journey, please create your guardian account by clicking the link below:

{invitation_link}

As a guardian, you will be able to:
- Monitor your student's progress
- Receive updates about sessions and assignments
- Manage course enrollments
- Communicate with tutors
- View performance reports

This invitation will expire in 7 days.

If you have any questions, please contact our support team.

Best regards,
The Tutor Academy Team

---
If you did not expect this invitation, you can safely ignore this email.
            """.strip()
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #4338ca; margin-bottom: 10px;">Guardian Account Invitation</h1>
                    <p style="color: #666; font-size: 16px;">Join Tutor Academy to support your student's learning journey</p>
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <p style="margin: 0 0 15px 0; font-size: 16px;">
                        <strong>{student_name}</strong> has signed up for Tutor Academy and listed you as their guardian.
                    </p>
                    <p style="margin: 0; color: #666;">
                        Please create your guardian account to stay connected with their educational progress.
                    </p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{invitation_link}" 
                       style="background: #4338ca; color: white; padding: 15px 30px; text-decoration: none; 
                              border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                        Create Guardian Account
                    </a>
                </div>
                
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #1565c0; margin-top: 0;">As a guardian, you will be able to:</h3>
                    <ul style="margin: 10px 0; padding-left: 20px; color: #333;">
                        <li>Monitor your student's progress</li>
                        <li>Receive updates about sessions and assignments</li>
                        <li>Manage course enrollments</li>
                        <li>Communicate with tutors</li>
                        <li>View performance reports</li>
                    </ul>
                </div>
                
                <div style="text-align: center; margin: 25px 0; padding: 15px; background: #fff3cd; border-radius: 6px;">
                    <p style="margin: 0; color: #856404; font-weight: 500;">
                        ⏰ This invitation will expire in 7 days
                    </p>
                </div>
                
                <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
                    If you have any questions, please contact our support team.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                    If you did not expect this invitation, you can safely ignore this email.<br>
                    This email was sent from Tutor Academy.
                </p>
            </body>
            </html>
            """
            
            return send_email(invitation.guardian_email, subject, text_content, html_content)
            
        except Exception as e:
            logger.error(f"Error sending guardian invitation email: {str(e)}")
            return False
    
    @staticmethod
    def _send_student_linked_email(guardian: User, student: User) -> bool:
        """
        Send email notification when student is linked to existing guardian
        
        Args:
            guardian (User): Guardian user object
            student (User): Student user object
            
        Returns:
            bool: True if email sent successfully
        """
        try:
            guardian_name = guardian.profile.get('name', guardian.email) if guardian.profile else guardian.email
            student_name = student.profile.get('name', student.email) if student.profile else student.email
            
            subject = f"New Student Added - {student_name}"
            
            text_content = f"""
Hello {guardian_name},

{student_name} has signed up for Tutor Academy and has been automatically added to your guardian account.

You can now monitor their progress and manage their educational journey through your guardian dashboard.

Student Details:
- Name: {student_name}
- Email: {student.email}
- Grade: {student.profile.get('grade', 'Not specified') if student.profile else 'Not specified'}

Login to your account to get started: http://localhost:3000/login

Best regards,
The Tutor Academy Team
            """.strip()
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4338ca;">New Student Added to Your Account</h2>
                
                <p>Hello <strong>{guardian_name}</strong>,</p>
                
                <p><strong>{student_name}</strong> has signed up for Tutor Academy and has been automatically added to your guardian account.</p>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2c5aa0;">Student Details</h3>
                    <p><strong>Name:</strong> {student_name}</p>
                    <p><strong>Email:</strong> {student.email}</p>
                    <p><strong>Grade:</strong> {student.profile.get('grade', 'Not specified') if student.profile else 'Not specified'}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="http://localhost:3000/login" 
                       style="background: #4338ca; color: white; padding: 12px 24px; text-decoration: none; 
                              border-radius: 6px; display: inline-block; font-weight: 600;">
                        Access Your Dashboard
                    </a>
                </div>
                
                <p>You can now monitor their progress and manage their educational journey through your guardian dashboard.</p>
                
                <p>Best regards,<br>
                <strong>The Tutor Academy Team</strong></p>
            </body>
            </html>
            """
            
            return send_email(guardian.email, subject, text_content, html_content)
            
        except Exception as e:
            logger.error(f"Error sending student linked email: {str(e)}")
            return False
    
    @staticmethod
    def accept_guardian_invitation(invitation_token: str, guardian_data: dict) -> dict:
        """
        Accept a guardian invitation and create guardian account
        
        Args:
            invitation_token (str): Invitation token
            guardian_data (dict): Guardian registration data
            
        Returns:
            dict: Result of invitation acceptance
        """
        try:
            # Find invitation
            invitation = GuardianInvitation.query.filter_by(
                invitation_token=invitation_token,
                status='pending'
            ).first()
            
            if not invitation:
                return {'success': False, 'error': 'Invalid invitation token'}
            
            if invitation.is_expired():
                invitation.mark_expired()
                db.session.commit()
                return {'success': False, 'error': 'Invitation has expired'}
            
            # Check if guardian email already exists
            existing_user = User.query.filter_by(email=invitation.guardian_email).first()
            if existing_user:
                if existing_user.account_type == 'guardian':
                    # Link to existing guardian
                    invitation.mark_accepted(existing_user.id)
                    GuardianService._link_student_to_guardian(invitation.student_id, existing_user.id)
                    db.session.commit()
                    return {
                        'success': True,
                        'message': 'Student linked to existing guardian account',
                        'guardian_id': existing_user.id
                    }
                else:
                    return {'success': False, 'error': 'Email already registered with different account type'}
            
            # Create new guardian account
            guardian = User(
                email=invitation.guardian_email,
                account_type='guardian',
                profile=guardian_data
            )
            guardian.set_password(guardian_data.get('password', ''))
            
            db.session.add(guardian)
            db.session.flush()  # Get the guardian ID
            
            # Accept invitation
            invitation.mark_accepted(guardian.id)
            
            # Link student to guardian
            GuardianService._link_student_to_guardian(invitation.student_id, guardian.id)
            
            # Create welcome notification for new guardian
            student = User.query.get(invitation.student_id)
            student_name = student.profile.get('name', student.email) if student and student.profile else 'Student'
            welcome_notification = Notification(
                user_id=guardian.id,
                type='guardian_welcome',
                title='Welcome to Tutor Academy!',
                message=f'Your guardian account has been created. You can now monitor {student_name}\'s educational progress.',
                data={
                    'student_id': invitation.student_id,
                    'student_name': student_name,
                    'welcome': True
                }
            )
            db.session.add(welcome_notification)
            
            db.session.commit()
            
            logger.info(f"Guardian invitation accepted: {invitation.id}, Guardian created: {guardian.id}")
            
            return {
                'success': True,
                'message': 'Guardian account created successfully',
                'guardian_id': guardian.id
            }
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error accepting guardian invitation: {str(e)}")
            return {'success': False, 'error': 'Failed to accept invitation'}
    
    @staticmethod
    def _link_student_to_guardian(student_id: str, guardian_id: str, commit: bool = False):
        """
        Link student to guardian in database
        
        Args:
            student_id (str): Student ID
            guardian_id (str): Guardian ID
            commit (bool): Whether to commit the transaction immediately
        """
        student = User.query.get(student_id)
        guardian = User.query.get(guardian_id)
        
        if student and guardian:
            # Update student profile
            if not student.profile:
                student.profile = {}
            student.profile['guardian_id'] = guardian_id
            student.profile['guardian_email'] = guardian.email
            student.profile['guardian_name'] = guardian.profile.get('name', guardian.email)
            
            # Update guardian profile
            if not guardian.profile:
                guardian.profile = {}
            if 'students' not in guardian.profile:
                guardian.profile['students'] = []
            
            student_info = {
                'id': student.id,
                'name': student.profile.get('name', student.email),
                'email': student.email,
                'grade': student.profile.get('grade', ''),
                'linked_at': datetime.utcnow().isoformat()
            }
            
            # Remove existing entry if found and add updated one
            guardian.profile['students'] = [
                s for s in guardian.profile['students'] 
                if s.get('id') != student.id
            ]
            guardian.profile['students'].append(student_info)
            
            # Update enrollments
            enrollments = Enrollment.query.filter_by(student_id=student_id).all()
            for enrollment in enrollments:
                enrollment.guardian_id = guardian_id
            
            # Mark profiles as modified so SQLAlchemy knows to save JSON changes
            flag_modified(student, 'profile')
            flag_modified(guardian, 'profile')
            
            # Optional commit for standalone usage
            if commit:
                db.session.commit()
                logger.info(f"Student {student_id} linked to guardian {guardian_id} and committed to database")
    
    @staticmethod
    def get_invitation_details(invitation_token: str) -> dict:
        """
        Get invitation details for frontend display
        
        Args:
            invitation_token (str): Invitation token
            
        Returns:
            dict: Invitation details or error
        """
        try:
            invitation = GuardianInvitation.query.filter_by(
                invitation_token=invitation_token,
                status='pending'
            ).first()
            
            if not invitation:
                return {'success': False, 'error': 'Invalid invitation token'}
            
            if invitation.is_expired():
                return {'success': False, 'error': 'Invitation has expired'}
            
            student = User.query.get(invitation.student_id)
            student_name = student.profile.get('name', student.email) if student and student.profile else 'Unknown Student'
            
            return {
                'success': True,
                'invitation': {
                    'id': invitation.id,
                    'studentName': student_name,
                    'guardianEmail': invitation.guardian_email,
                    'expiresAt': invitation.expires_at.isoformat(),
                    'invitedAt': invitation.invited_at.isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting invitation details: {str(e)}")
            return {'success': False, 'error': 'Failed to get invitation details'}