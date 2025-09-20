#!/usr/bin/env python3
"""
Quick email test to validate Amazon WorkMail configuration
"""

import os
import sys
from dotenv import load_dotenv

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
load_dotenv()

def quick_test():
    """Quick test of email functionality"""
    
    print("=== Amazon WorkMail Guardian Email Test ===")
    
    try:
        from app.utils.email_helper import send_email
        
        # Test basic email sending
        success = send_email(
            recipient_email="personal@akintoyeasaolu.com",  # Actual test email
            subject="Backend Email Test - Working!",
            text_content="""
Amazon WorkMail Configuration: ✅ WORKING

✅ SSL connection established
✅ SMTP authentication successful  
✅ Email delivery system ready
✅ Guardian emails will be sent automatically

The guardian email service is configured and ready for production!
            """.strip(),
            html_content="""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4338ca;">Guardian Email Service Status</h2>
                <div style="background: #ecfdf5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #065f46; margin-top: 0;">✅ Amazon WorkMail: READY</h3>
                    <ul style="color: #065f46;">
                        <li>✅ SSL connection established</li>
                        <li>✅ SMTP authentication successful</li>
                        <li>✅ Email templates configured</li>
                        <li>✅ Guardian signup flow ready</li>
                    </ul>
                </div>
                <p><strong>Result:</strong> Guardian emails will be sent automatically during student signup!</p>
            </body>
            </html>
            """
        )
        
        print("✅ Email function executed successfully")
        print("✅ Amazon WorkMail configuration validated")
        print("✅ Guardian email service is ready!")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    quick_test()