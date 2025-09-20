"""
Example usage of the email helper functions
"""

from app.utils.email_helper import (
    send_simple_email, 
    send_email, 
    send_welcome_email, 
    send_session_reminder,
    get_email_template
)

def example_basic_email():
    """Example of sending a basic text email"""
    recipient = "student@example.com"
    subject = "Session Confirmation"
    text = """
    Hi there,

    Your tutoring session has been confirmed for tomorrow at 2:00 PM.

    Best regards,
    Tutor Academy Team
    """
    
    success = send_simple_email(recipient, subject, text)
    print(f"Basic email sent: {success}")

def example_html_email():
    """Example of sending an email with HTML content"""
    recipient = "tutor@example.com"
    subject = "New Student Enrollment"
    
    text_content = """
    Hi John,

    A new student has enrolled in your Mathematics course.

    Student: Jane Doe
    Course: Advanced Calculus
    Start Date: March 15, 2024

    Please prepare for the first session.

    Best regards,
    Tutor Academy Team
    """
    
    html_content = """
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4338ca;">New Student Enrollment</h2>
            
            <p>Hi <strong>John</strong>,</p>
            
            <p>A new student has enrolled in your Mathematics course.</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2c5aa0;">Enrollment Details</h3>
                <p><strong>Student:</strong> Jane Doe</p>
                <p><strong>Course:</strong> Advanced Calculus</p>
                <p><strong>Start Date:</strong> March 15, 2024</p>
            </div>
            
            <p>Please prepare for the first session.</p>
            
            <p>Best regards,<br>
            <strong>Tutor Academy Team</strong></p>
        </div>
    </body>
    </html>
    """
    
    success = send_email(recipient, subject, text_content, html_content)
    print(f"HTML email sent: {success}")

def example_email_with_attachments():
    """Example of sending an email with attachments"""
    recipient = "student@example.com"
    subject = "Course Materials"
    text_content = "Please find attached the course materials for this week."
    
    # List of file paths to attach
    attachments = [
        "/path/to/assignment.pdf",
        "/path/to/reading_list.docx"
    ]
    
    success = send_email(
        recipient, 
        subject, 
        text_content, 
        attachments=attachments
    )
    print(f"Email with attachments sent: {success}")

def example_welcome_email():
    """Example of sending a welcome email"""
    recipient = "newuser@example.com"
    user_name = "Alice Johnson"
    
    success = send_welcome_email(recipient, user_name)
    print(f"Welcome email sent: {success}")

def example_session_reminder():
    """Example of sending a session reminder"""
    recipient = "student@example.com"
    user_name = "Bob Smith"
    
    session_details = {
        'title': 'Physics Tutoring Session',
        'date': 'March 20, 2024',
        'time': '3:00 PM EST',
        'duration': 60,
        'tutor_name': 'Dr. Sarah Wilson',
        'meeting_id': '123-456-789',
        'meeting_link': 'https://zoom.us/j/123456789',
        'meeting_password': 'physics123'
    }
    
    success = send_session_reminder(recipient, user_name, session_details)
    print(f"Session reminder sent: {success}")

def example_template_email():
    """Example of using email templates"""
    recipient = "user@example.com"
    
    # Get password reset template
    subject, text_content, html_content = get_email_template(
        'password_reset',
        user_name='John Doe',
        reset_link='https://tutoracademy.com/reset-password?token=abc123'
    )
    
    success = send_email(recipient, subject, text_content, html_content)
    print(f"Template email sent: {success}")

def example_bulk_email():
    """Example of sending emails to multiple recipients"""
    recipients = [
        "student1@example.com",
        "student2@example.com", 
        "student3@example.com"
    ]
    
    subject = "Class Announcement"
    text_content = "Tomorrow's class has been moved to 4:00 PM."
    
    for recipient in recipients:
        success = send_simple_email(recipient, subject, text_content)
        print(f"Email to {recipient}: {success}")

def example_email_with_cc_bcc():
    """Example of sending email with CC and BCC"""
    recipient = "student@example.com"
    subject = "Grade Report"
    text_content = "Please find your grade report attached."
    
    cc_emails = ["tutor@example.com"]
    bcc_emails = ["admin@example.com"]
    
    success = send_email(
        recipient,
        subject,
        text_content,
        cc_emails=cc_emails,
        bcc_emails=bcc_emails
    )
    print(f"Email with CC/BCC sent: {success}")

if __name__ == "__main__":
    print("Email Helper Examples")
    print("=" * 50)
    
    # Uncomment the examples you want to test
    # Make sure to set up your .env file first!
    
    # example_basic_email()
    # example_html_email()
    # example_welcome_email()
    # example_session_reminder()
    # example_template_email()
    # example_bulk_email()
    # example_email_with_cc_bcc()
    
    print("Remember to set up your .env file with proper email credentials!")