#!/usr/bin/env python3
"""
Simple email setup test script
Run this script to test if your email configuration is working correctly.
"""

import os
import sys
from dotenv import load_dotenv

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

def check_environment_variables():
    """Check if all required environment variables are set"""
    required_vars = ['SENDER_EMAIL', 'SENDER_PASSWORD', 'SMTP_SERVER', 'SMTP_PORT']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nPlease check your .env file and ensure all required variables are set.")
        return False
    
    print("✅ All required environment variables are set.")
    return True

def test_email_configuration():
    """Test the email configuration without sending an actual email"""
    try:
        from app.utils.email_helper import EmailConfig
        
        config = EmailConfig()
        print(f"✅ Email configuration loaded successfully:")
        print(f"   - SMTP Server: {config.smtp_server}")
        print(f"   - SMTP Port: {config.smtp_port}")
        print(f"   - Sender Email: {config.sender_email}")
        print(f"   - SMTP Username: {config.auth_username}")
        print(f"   - Sender Name: {config.sender_name}")
        return True
        
    except Exception as e:
        print(f"❌ Email configuration error: {str(e)}")
        return False

def test_smtp_connection():
    """Test SMTP connection without sending an email"""
    try:
        import smtplib
        import ssl
        from app.utils.email_helper import EmailConfig
        
        config = EmailConfig()
        context = ssl.create_default_context()
        
        print("🔄 Testing SMTP connection...")
        
        with smtplib.SMTP(config.smtp_server, config.smtp_port) as server:
            server.starttls(context=context)
            server.login(config.auth_username, config.sender_password)
            print("✅ SMTP connection successful!")
            return True
            
    except Exception as e:
        print(f"❌ SMTP connection failed: {str(e)}")
        print("\nCommon solutions:")
        print("- Check your email and password are correct")
        print("- Ensure 2FA is enabled and you're using an app password")
        print("- Verify SMTP server and port settings")
        return False

def send_test_email():
    """Send a test email"""
    try:
        from app.utils.email_helper import send_simple_email
        
        # Get test recipient email
        test_email = input("\nEnter your email address to receive a test email: ").strip()
        
        if not test_email:
            print("❌ No email address provided.")
            return False
        
        print(f"🔄 Sending test email to {test_email}...")
        
        success = send_simple_email(
            recipient_email=test_email,
            subject="Email Setup Test - Tutor Academy",
            text_content="""
Hello!

This is a test email from your Tutor Academy email system.

If you receive this email, your email configuration is working correctly!

Best regards,
The Tutor Academy System

---
This is an automated test email. Please do not reply.
            """.strip()
        )
        
        if success:
            print(f"✅ Test email sent successfully to {test_email}!")
            print("📧 Please check your inbox (and spam folder) for the test email.")
            return True
        else:
            print("❌ Failed to send test email.")
            return False
            
    except Exception as e:
        print(f"❌ Error sending test email: {str(e)}")
        return False

def main():
    """Main test function"""
    print("=" * 60)
    print("📧 EMAIL SETUP TEST")
    print("=" * 60)
    
    # Step 1: Check environment variables
    print("\n1. Checking environment variables...")
    if not check_environment_variables():
        print("\n💡 Please create a .env file based on .env.example and configure your email settings.")
        return
    
    # Step 2: Test configuration loading
    print("\n2. Testing email configuration...")
    if not test_email_configuration():
        return
    
    # Step 3: Test SMTP connection
    print("\n3. Testing SMTP connection...")
    if not test_smtp_connection():
        return
    
    # Step 4: Send test email (optional)
    print("\n4. Email functionality test...")
    response = input("Would you like to send a test email? (y/n): ").strip().lower()
    
    if response in ['y', 'yes']:
        if send_test_email():
            print("\n🎉 Email setup test completed successfully!")
            print("Your email system is ready to use.")
        else:
            print("\n❌ Test email failed. Please check your configuration.")
    else:
        print("\n✅ SMTP connection test passed!")
        print("Your email system should be working correctly.")
    
    print("\n" + "=" * 60)
    print("Test completed. Check the results above.")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Test interrupted by user.")
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        print("Please check your configuration and try again.")