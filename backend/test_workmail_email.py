#!/usr/bin/env python3
"""
Test script for sending email using Amazon WorkMail configuration
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.utils.email_helper import send_simple_email

def test_workmail_email():
    """Send a test email to verify Amazon WorkMail configuration"""
    
    print("Testing Amazon WorkMail configuration...")
    print("=" * 50)
    
    # Test email details
    recipient = "personal@akintoyeasaolu.com"
    subject = "Hello"
    text_content = """
    Hello!
    
    This is a test email from your Tutor Academy application using Amazon WorkMail.
    
    If you receive this email, your Amazon WorkMail integration is working correctly!
    
    Best regards,
    Tutor Academy Team
    """
    
    print(f"Sending test email to: {recipient}")
    print(f"Subject: {subject}")
    print(f"Using SMTP server: {os.getenv('SMTP_SERVER', 'Not configured')}")
    print(f"Using SMTP port: {os.getenv('SMTP_PORT', 'Not configured')}")
    print(f"Using SSL: {os.getenv('SMTP_USE_SSL', 'Not configured')}")
    print(f"Sender email: {os.getenv('SENDER_EMAIL', 'Not configured')}")
    print("-" * 50)
    
    try:
        # Send the test email
        success = send_simple_email(recipient, subject, text_content.strip())
        
        if success:
            print("✅ SUCCESS: Test email sent successfully!")
            print(f"Check your inbox at {recipient}")
        else:
            print("❌ FAILED: Test email could not be sent.")
            print("Check your Amazon WorkMail configuration in .env file")
            
    except Exception as e:
        print(f"❌ ERROR: An exception occurred: {str(e)}")
        print("Please check your Amazon WorkMail credentials and configuration")
    
    print("=" * 50)

if __name__ == "__main__":
    test_workmail_email()