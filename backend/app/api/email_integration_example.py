"""
Example integration of email functionality with Flask routes
This shows how to integrate the email helper into your existing API endpoints.
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User, Session
from app.utils.email_helper import (
    send_simple_email,
    send_welcome_email, 
    send_session_reminder,
    send_email,
    get_email_template
)
from datetime import datetime, timedelta
import uuid

@api_bp.route('/send-welcome-email', methods=['POST'])
@jwt_required()
def send_welcome_email_endpoint():
    """Send welcome email to a new user"""
    try:
        data = request.get_json()
        user_id = data.get('userId')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Send welcome email
        success = send_welcome_email(user.email, user.profile.get('name', user.email))
        
        if success:
            return jsonify({'message': 'Welcome email sent successfully'}), 200
        else:
            return jsonify({'error': 'Failed to send welcome email'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/send-session-reminder', methods=['POST'])
@jwt_required()
def send_session_reminder_endpoint():
    """Send session reminder email"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        
        if not session_id:
            return jsonify({'error': 'Session ID is required'}), 400
        
        session = Session.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Send reminder to all enrolled students
        success_count = 0
        total_students = len(session.students)
        
        for student in session.students:
            # Get tutor information
            tutor = User.query.get(session.tutor_id)
            tutor_name = tutor.profile.get('name', tutor.email) if tutor else 'N/A'
            
            # Prepare session details
            session_details = {
                'title': session.title or session.topic or 'Tutoring Session',
                'date': session.scheduled_date.strftime('%A, %B %d, %Y') if session.scheduled_date else 'TBD',
                'time': session.scheduled_date.strftime('%I:%M %p') if session.scheduled_date else 'TBD',
                'duration': session.duration or 60,
                'tutor_name': tutor_name,
                'meeting_id': session.meeting_id or f"123-456-{session.id[-3:]}",
                'meeting_link': session.meeting_link or f"https://zoom.us/j/123456{session.id[-3:]}",
                'meeting_password': session.meeting_password or 'tutorpass123'
            }
            
            # Send reminder email
            success = send_session_reminder(
                student.email,
                student.profile.get('name', student.email),
                session_details
            )
            
            if success:
                success_count += 1
        
        return jsonify({
            'message': f'Session reminders sent to {success_count} out of {total_students} students',
            'success_count': success_count,
            'total_students': total_students
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/send-custom-email', methods=['POST'])
@jwt_required()
def send_custom_email_endpoint():
    """Send a custom email to specified recipients"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Only admins and tutors can send custom emails
        if current_user.account_type not in ['admin', 'tutor']:
            return jsonify({'error': 'Insufficient permissions'}), 403
        
        data = request.get_json()
        recipients = data.get('recipients', [])
        subject = data.get('subject')
        text_content = data.get('textContent')
        html_content = data.get('htmlContent')
        
        if not recipients or not subject or not text_content:
            return jsonify({'error': 'Recipients, subject, and text content are required'}), 400
        
        # Send emails to all recipients
        success_count = 0
        failed_recipients = []
        
        for recipient_email in recipients:
            success = send_email(
                recipient_email=recipient_email,
                subject=subject,
                text_content=text_content,
                html_content=html_content
            )
            
            if success:
                success_count += 1
            else:
                failed_recipients.append(recipient_email)
        
        response_data = {
            'message': f'Emails sent to {success_count} out of {len(recipients)} recipients',
            'success_count': success_count,
            'total_recipients': len(recipients)
        }
        
        if failed_recipients:
            response_data['failed_recipients'] = failed_recipients
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/send-password-reset', methods=['POST'])
def send_password_reset_email():
    """Send password reset email"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if user:
            # Generate reset token (implement your own token generation logic)
            reset_token = str(uuid.uuid4())
            
            # Store token with expiration (implement your own storage logic)
            # For example, you might store it in a database table or cache
            # user.reset_token = reset_token
            # user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
            # db.session.commit()
            
            # Create reset link
            reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
            
            # Get password reset email template
            subject, text_content, html_content = get_email_template(
                'password_reset',
                user_name=user.profile.get('name', user.email),
                reset_link=reset_link
            )
            
            # Send password reset email
            success = send_email(email, subject, text_content, html_content)
            
            if success:
                return jsonify({'message': 'Password reset email sent successfully'}), 200
            else:
                return jsonify({'error': 'Failed to send password reset email'}), 500
        
        # Always return success for security (don't reveal if email exists)
        return jsonify({'message': 'If the email exists, a password reset link will be sent'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/send-session-confirmation', methods=['POST'])
@jwt_required()
def send_session_confirmation():
    """Send session confirmation email after booking"""
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        student_id = data.get('studentId')
        
        if not session_id or not student_id:
            return jsonify({'error': 'Session ID and Student ID are required'}), 400
        
        session = Session.query.get(session_id)
        student = User.query.get(student_id)
        
        if not session or not student:
            return jsonify({'error': 'Session or student not found'}), 404
        
        # Get tutor information
        tutor = User.query.get(session.tutor_id)
        tutor_name = tutor.profile.get('name', tutor.email) if tutor else 'N/A'
        
        subject = f"Session Confirmation: {session.title or 'Tutoring Session'}"
        
        text_content = f"""
        Hi {student.profile.get('name', student.email)},

        Your tutoring session has been confirmed!

        Session Details:
        - Subject: {session.title or session.topic or 'N/A'}
        - Date: {session.scheduled_date.strftime('%A, %B %d, %Y') if session.scheduled_date else 'TBD'}
        - Time: {session.scheduled_date.strftime('%I:%M %p') if session.scheduled_date else 'TBD'}
        - Duration: {session.duration or 60} minutes
        - Tutor: {tutor_name}

        Meeting Information:
        - Meeting ID: {session.meeting_id or f"123-456-{session.id[-3:]}"}
        - Meeting Link: {session.meeting_link or f"https://zoom.us/j/123456{session.id[-3:]}"}
        - Password: {session.meeting_password or 'tutorpass123'}

        Please join the session 5 minutes before the scheduled time.

        Best regards,
        The Tutor Academy Team
        """
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4338ca;">Session Confirmed!</h2>
                
                <p>Hi <strong>{student.profile.get('name', student.email)}</strong>,</p>
                
                <p>Your tutoring session has been confirmed!</p>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #2c5aa0;">Session Details</h3>
                    <p><strong>Subject:</strong> {session.title or session.topic or 'N/A'}</p>
                    <p><strong>Date:</strong> {session.scheduled_date.strftime('%A, %B %d, %Y') if session.scheduled_date else 'TBD'}</p>
                    <p><strong>Time:</strong> {session.scheduled_date.strftime('%I:%M %p') if session.scheduled_date else 'TBD'}</p>
                    <p><strong>Duration:</strong> {session.duration or 60} minutes</p>
                    <p><strong>Tutor:</strong> {tutor_name}</p>
                </div>
                
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="margin-top: 0; color: #1565c0;">Meeting Information</h4>
                    <p><strong>Meeting ID:</strong> {session.meeting_id or f"123-456-{session.id[-3:]}"}</p>
                    <p><strong>Meeting Link:</strong> <a href="{session.meeting_link or f'https://zoom.us/j/123456{session.id[-3:]}'}" style="color: #1565c0;">Join Meeting</a></p>
                    <p><strong>Password:</strong> {session.meeting_password or 'tutorpass123'}</p>
                </div>
                
                <p><strong>Please join the session 5 minutes before the scheduled time.</strong></p>
                
                <p>Best regards,<br>
                <strong>The Tutor Academy Team</strong></p>
            </div>
        </body>
        </html>
        """
        
        success = send_email(student.email, subject, text_content, html_content)
        
        if success:
            return jsonify({'message': 'Session confirmation email sent successfully'}), 200
        else:
            return jsonify({'error': 'Failed to send confirmation email'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/test-email-system', methods=['POST'])
@jwt_required()
def test_email_system():
    """Test endpoint to verify email system is working"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        # Only admins can test the email system
        if current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        test_email = data.get('testEmail', current_user.email)
        
        # Send test email
        success = send_simple_email(
            recipient_email=test_email,
            subject="Email System Test - Tutor Academy",
            text_content=f"""
            Hello!

            This is a test email from the Tutor Academy email system.

            Test Details:
            - Sent at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            - Sent by: {current_user.email}
            - Test recipient: {test_email}

            If you receive this email, the email system is working correctly!

            Best regards,
            The Tutor Academy System
            """
        )
        
        if success:
            return jsonify({
                'message': 'Test email sent successfully',
                'recipient': test_email
            }), 200
        else:
            return jsonify({'error': 'Failed to send test email'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500