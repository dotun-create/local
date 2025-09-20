#!/usr/bin/env python3
"""
Comprehensive email diagnosis script for Amazon SES
"""

import os
import sys
import smtplib
import ssl
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def diagnose_email_setup():
    """Diagnose all aspects of email setup"""
    print("=" * 60)
    print("🔍 COMPREHENSIVE EMAIL DIAGNOSIS")
    print("=" * 60)
    
    # 1. Environment Variables Check
    print("\n1. 📋 Environment Variables:")
    env_vars = {
        'SENDER_EMAIL': os.getenv('SENDER_EMAIL'),
        'SENDER_NAME': os.getenv('SENDER_NAME'),
        'SMTP_SERVER': os.getenv('SMTP_SERVER'),
        'SMTP_PORT': os.getenv('SMTP_PORT'),
        'SMTP_USERNAME': os.getenv('SMTP_USERNAME'),
        'SENDER_PASSWORD': os.getenv('SENDER_PASSWORD'),
        'SMTP_USE_SSL': os.getenv('SMTP_USE_SSL')
    }
    
    for key, value in env_vars.items():
        if value:
            if key == 'SENDER_PASSWORD':
                print(f"   ✅ {key}: {'*' * len(value)} (hidden)")
            elif key == 'SMTP_USERNAME' and len(value) > 10:
                print(f"   ✅ {key}: {value[:4]}...{value[-4:]} (AWS format)")
            else:
                print(f"   ✅ {key}: {value}")
        else:
            print(f"   ❌ {key}: NOT SET")
    
    # 2. Configuration Validation
    print("\n2. 🔧 Configuration Validation:")
    
    # Check if domain looks like AWS service
    smtp_server = env_vars['SMTP_SERVER']
    if smtp_server:
        if 'email-smtp' in smtp_server:
            print("   ✅ SMTP server configured for Amazon SES")
            service_type = 'SES'
        elif 'awsapps.com' in smtp_server:
            print("   ✅ SMTP server configured for Amazon WorkMail")
            service_type = 'WorkMail'
        else:
            print("   ⚠️  SMTP server is not Amazon SES or WorkMail")
            service_type = 'Other'
    else:
        print("   ❌ SMTP server not configured")
        service_type = None
    
    # Check username format based on service type
    username = env_vars['SMTP_USERNAME']
    if service_type == 'SES':
        if username and (username.startswith('AKIA') or username.startswith('ASIA')):
            print("   ✅ SMTP username looks correct for SES (AWS format)")
        else:
            print("   ❌ SES username should start with AKIA")
            print("      Current username:", username)
    elif service_type == 'WorkMail':
        if username and '@' in username:
            print("   ✅ SMTP username looks correct for WorkMail (email format)")
        else:
            print("   ❌ WorkMail username should be full email address")
            print("      Current username:", username)
    else:
        print("   ⚠️  Cannot validate username format for unknown service")
    
    # Check email format
    email = env_vars['SENDER_EMAIL']
    if email and '@' in email and '.' in email:
        domain = email.split('@')[1]
        print(f"   ✅ Email format looks valid")
        print(f"   📧 Domain: {domain}")
    else:
        print("   ❌ Email format looks invalid")
    
    # 3. SMTP Connection Test
    print("\n3. 🔌 SMTP Connection Test:")
    
    if not all([env_vars['SMTP_SERVER'], env_vars['SMTP_PORT'], env_vars['SMTP_USERNAME'], env_vars['SENDER_PASSWORD']]):
        print("   ❌ Missing required environment variables")
        return False
    
    try:
        context = ssl.create_default_context()
        use_ssl = env_vars.get('SMTP_USE_SSL', 'false').lower() == 'true'
        
        if use_ssl:
            # Use SSL connection (WorkMail, port 465)
            print("   🔄 Connecting with SSL...")
            with smtplib.SMTP_SSL(env_vars['SMTP_SERVER'], int(env_vars['SMTP_PORT']), context=context) as server:
                print("   ✅ SSL connection established")
                
                print("   🔄 Attempting authentication...")
                server.login(env_vars['SMTP_USERNAME'], env_vars['SENDER_PASSWORD'])
                print("   ✅ SMTP authentication successful!")
        else:
            # Use STARTTLS connection (SES, port 587)
            print("   🔄 Connecting with STARTTLS...")
            with smtplib.SMTP(env_vars['SMTP_SERVER'], int(env_vars['SMTP_PORT'])) as server:
                server.starttls(context=context)
                print("   ✅ TLS connection established")
                
                print("   🔄 Attempting authentication...")
                server.login(env_vars['SMTP_USERNAME'], env_vars['SENDER_PASSWORD'])
                print("   ✅ SMTP authentication successful!")
        
        print("\n🎉 EMAIL SETUP IS WORKING!")
        return True
            
    except smtplib.SMTPAuthenticationError as e:
        print(f"   ❌ Authentication failed: {e}")
        print("\n🔍 Troubleshooting Authentication:")
        if service_type == 'WorkMail':
            print("   1. Verify user exists in WorkMail organization")
            print("   2. Verify password is the WorkMail user password")
            print("   3. Check if user account is enabled in WorkMail")
            print("   4. Verify domain is configured in WorkMail console")
            print("   5. Ensure SMTP access is enabled for the user")
        elif service_type == 'SES':
            print("   1. Verify SMTP username is the full AWS-generated string (starts with AKIA)")
            print("   2. Verify SMTP password is correct")
            print("   3. Check if SES is in the correct region (eu-west-1)")
            print("   4. Verify domain/email is verified in SES console")
        else:
            print("   1. Verify username and password are correct")
            print("   2. Check SMTP server and port settings")
            print("   3. Verify SSL/TLS configuration")
        return False
        
    except smtplib.SMTPException as e:
        print(f"   ❌ SMTP error: {e}")
        return False
        
    except Exception as e:
        print(f"   ❌ Unexpected error: {e}")
        return False
    
    # 4. AWS Service Checklist
    print(f"\n4. ☁️  AWS {service_type or 'Service'} Checklist:")
    if service_type == 'WorkMail':
        print("   Please verify in AWS WorkMail Console:")
        print("   □ WorkMail organization exists in eu-west-1")
        print("   □ Domain 'troupe.academy' is verified and enabled")
        print("   □ User 'internal' exists and is enabled")
        print("   □ User password matches SENDER_PASSWORD")
        print("   □ SMTP access is enabled for the user")
        print("   □ DNS records are properly configured")
    elif service_type == 'SES':
        print("   Please verify in AWS SES Console:")
        print("   □ Domain 'troupe.academy' is verified")
        print("   □ Email 'internal@troupe.academy' is verified")  
        print("   □ SMTP credentials are generated and active")
        print("   □ Account is out of sandbox mode (or recipient is verified)")
        print("   □ Region is set to eu-west-1")
    else:
        print("   Please verify email service configuration")
    
    return False

if __name__ == "__main__":
    try:
        success = diagnose_email_setup()
        
        if success:
            print("\n" + "=" * 60)
            print("✅ DIAGNOSIS COMPLETE: Email setup is working!")
            print("Guardian emails should now be sent successfully.")
            print("=" * 60)
        else:
            print("\n" + "=" * 60)  
            print("❌ DIAGNOSIS COMPLETE: Issues found above.")
            print("Please fix the issues and run this script again.")
            print("=" * 60)
            
    except KeyboardInterrupt:
        print("\n\n❌ Diagnosis interrupted by user.")
    except Exception as e:
        print(f"\n❌ Unexpected error during diagnosis: {str(e)}")