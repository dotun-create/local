# Email System Setup Guide

This guide will help you set up the email system for sending automated emails from your tutoring platform.

## 1. Installation

First, ensure you have the required Python packages. The email helper uses standard library modules, so no additional packages are needed for basic functionality.

```bash
# If you want to use python-dotenv for environment variables
pip install python-dotenv
```

## 2. Environment Configuration

### Step 1: Create your .env file

Copy the example environment file and customize it:

```bash
cp .env.example .env
```

### Step 2: Configure Email Provider

#### Option A: Gmail Setup (Recommended for development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Copy the 16-character password

3. **Update your .env file**:
```env
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SENDER_EMAIL=your-email@gmail.com
SENDER_PASSWORD=your-16-character-app-password
SENDER_NAME=Tutor Academy
```

#### Option B: Outlook/Hotmail Setup

1. **Enable App Passwords** in your Microsoft account
2. **Update your .env file**:
```env
SMTP_SERVER=smtp-mail.outlook.com
SMTP_PORT=587
SENDER_EMAIL=your-email@outlook.com
SENDER_PASSWORD=your-app-password
SENDER_NAME=Tutor Academy
```

#### Option C: Amazon WorkMail Setup

1. **Set up Amazon WorkMail Organization**:
   - Go to AWS Console → Amazon WorkMail
   - Create a new organization or use an existing one
   - Add your domain and verify it
   - Create a user account for sending emails

2. **Update your .env file**:
```env
SMTP_SERVER=smtp.mail.YOUR-AWS-REGION.awsapps.com
SMTP_PORT=465
SMTP_USE_SSL=true
SENDER_EMAIL=your-workmail-email@yourdomain.com
SENDER_PASSWORD=your-workmail-password
SENDER_NAME=Tutor Academy
```

**Common AWS Regions**:
- US East (N. Virginia): `us-east-1`
- US West (Oregon): `us-west-2`
- Europe (Ireland): `eu-west-1`
- Asia Pacific (Sydney): `ap-southeast-2`

#### Option D: Custom SMTP Server

```env
SMTP_SERVER=mail.yourdomain.com
SMTP_PORT=587
SMTP_USE_SSL=false
SENDER_EMAIL=noreply@yourdomain.com
SENDER_PASSWORD=your-smtp-password
SENDER_NAME=Your Company Name
```

## 3. Load Environment Variables in Flask

Update your Flask app to load environment variables:

```python
# app/__init__.py
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Your existing app configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    
    return app
```

## 4. Basic Usage Examples

### Simple Email

```python
from app.utils.email_helper import send_simple_email

# Send a basic text email
success = send_simple_email(
    recipient_email="user@example.com",
    subject="Welcome to Tutor Academy",
    text_content="Thank you for joining our platform!"
)

if success:
    print("Email sent successfully!")
else:
    print("Failed to send email")
```

### Rich HTML Email

```python
from app.utils.email_helper import send_email

# Send email with both text and HTML content
success = send_email(
    recipient_email="user@example.com",
    subject="Session Confirmation",
    text_content="Your session is confirmed for tomorrow at 2 PM.",
    html_content="""
    <h2>Session Confirmed!</h2>
    <p>Your tutoring session is scheduled for:</p>
    <ul>
        <li><strong>Date:</strong> Tomorrow</li>
        <li><strong>Time:</strong> 2:00 PM</li>
        <li><strong>Duration:</strong> 1 hour</li>
    </ul>
    """
)
```

### Pre-built Templates

```python
from app.utils.email_helper import send_welcome_email, send_session_reminder

# Send welcome email to new users
send_welcome_email("newuser@example.com", "John Doe")

# Send session reminder
session_details = {
    'title': 'Math Tutoring',
    'date': 'March 15, 2024',
    'time': '2:00 PM',
    'duration': 60,
    'tutor_name': 'Dr. Smith',
    'meeting_id': '123-456-789',
    'meeting_link': 'https://zoom.us/j/123456789',
    'meeting_password': 'math123'
}

send_session_reminder("student@example.com", "Jane Doe", session_details)
```

## 5. Integration with Flask Routes

Here's how to integrate the email helper into your Flask routes:

```python
# app/api/auth.py
from app.utils.email_helper import send_welcome_email, get_email_template, send_email

@api_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    # Your user creation logic here
    new_user = create_user(data)
    
    # Send welcome email
    success = send_welcome_email(new_user.email, new_user.name)
    
    if success:
        print(f"Welcome email sent to {new_user.email}")
    else:
        print(f"Failed to send welcome email to {new_user.email}")
    
    return jsonify({'message': 'User created successfully'})

@api_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    user = User.query.filter_by(email=email).first()
    if user:
        # Generate reset token (implement your token logic)
        reset_token = generate_reset_token(user.id)
        reset_link = f"http://yourapp.com/reset-password?token={reset_token}"
        
        # Get password reset template
        subject, text_content, html_content = get_email_template(
            'password_reset',
            user_name=user.name,
            reset_link=reset_link
        )
        
        # Send password reset email
        success = send_email(email, subject, text_content, html_content)
        
        if success:
            return jsonify({'message': 'Password reset email sent'})
        else:
            return jsonify({'error': 'Failed to send email'}), 500
    
    return jsonify({'message': 'If email exists, reset link will be sent'})
```

## 6. Testing Your Email Setup

Create a test script to verify your email configuration:

```python
# test_email.py
from app.utils.email_helper import send_simple_email

def test_email_setup():
    # Test with your own email address
    test_recipient = "your-email@example.com"
    
    success = send_simple_email(
        recipient_email=test_recipient,
        subject="Email Setup Test",
        text_content="If you receive this email, your setup is working correctly!"
    )
    
    if success:
        print("✅ Email setup is working correctly!")
    else:
        print("❌ Email setup failed. Check your configuration.")

if __name__ == "__main__":
    test_email_setup()
```

## 7. Security Best Practices

1. **Use App Passwords**: Never use your main email password
2. **Environment Variables**: Store credentials in environment variables, never in code
3. **Rate Limiting**: Implement rate limiting for email sending to prevent abuse
4. **Input Validation**: Always validate email addresses before sending
5. **Error Handling**: Implement proper error handling and logging

## 8. Production Considerations

### For Production Deployment:

1. **Use a Dedicated Email Service**:
   - Amazon WorkMail (recommended for AWS environments)
   - Amazon SES (for high-volume transactional emails)
   - SendGrid
   - Mailgun
   - Postmark

2. **Email Service Example (SendGrid)**:
```python
# Alternative: Using SendGrid for production
import sendgrid
from sendgrid.helpers.mail import Mail

def send_email_sendgrid(recipient, subject, content):
    sg = sendgrid.SendGridAPIClient(api_key=os.getenv('SENDGRID_API_KEY'))
    
    message = Mail(
        from_email='noreply@yourdomain.com',
        to_emails=recipient,
        subject=subject,
        html_content=content
    )
    
    try:
        response = sg.send(message)
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False
```

3. **Environment Variables for Production**:

**Amazon WorkMail (Recommended)**:
```env
# Production Amazon WorkMail settings
SMTP_SERVER=smtp.mail.your-aws-region.awsapps.com
SMTP_PORT=465
SMTP_USE_SSL=true
SENDER_EMAIL=noreply@yourdomain.com
SENDER_PASSWORD=your-workmail-password
SENDER_NAME=Your Company Name
```

**SendGrid Alternative**:
```env
# Production SendGrid settings
SMTP_SERVER=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USE_SSL=false
SENDER_EMAIL=noreply@yourdomain.com
SENDER_PASSWORD=your-sendgrid-api-key
SENDER_NAME=Your Company Name
```

## 9. Troubleshooting

### Common Issues:

1. **Authentication Failed**:
   - Check if 2FA is enabled and you're using an app password
   - Verify email and password are correct

2. **Connection Timeout**:
   - Check SMTP server and port settings
   - Verify firewall settings

3. **Emails Going to Spam**:
   - Set up SPF, DKIM, and DMARC records
   - Use a professional sender name
   - Avoid spam trigger words

4. **Gmail Specific Issues**:
   - Enable "Less secure app access" (not recommended)
   - Use OAuth2 for better security (advanced)

### Debug Mode:

Enable debug logging to troubleshoot issues:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 10. Advanced Features

### Async Email Sending (using Celery):

```python
from celery import Celery
from app.utils.email_helper import send_email

@celery.task
def send_email_async(recipient, subject, text_content, html_content=None):
    return send_email(recipient, subject, text_content, html_content)

# Usage
send_email_async.delay("user@example.com", "Subject", "Content")
```

### Email Templates with Jinja2:

```python
from jinja2 import Template

def render_email_template(template_string, **kwargs):
    template = Template(template_string)
    return template.render(**kwargs)

# Usage
html_template = """
<h1>Hello {{ user_name }}!</h1>
<p>Your session on {{ date }} has been confirmed.</p>
"""

html_content = render_email_template(
    html_template,
    user_name="John Doe",
    date="March 15, 2024"
)
```

This setup provides a robust, scalable email system for your tutoring platform!