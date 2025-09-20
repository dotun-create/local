# Amazon SES Email Setup Guide

## Configuration Complete ✅
The backend has been configured to use Amazon SES with:
- **Email Address**: internal@troupe.com
- **Region**: eu-west-1 
- **SMTP Server**: email-smtp.eu-west-1.amazonaws.com
- **Port**: 587 (STARTTLS)

## Required AWS Setup Steps

### 1. Verify Email Domain in SES
1. Go to [AWS SES Console](https://eu-west-1.console.aws.amazon.com/ses/)
2. Select "Verified identities" in the left sidebar
3. Click "Create identity"
4. Choose "Domain" and enter: `troupe.com`
5. Follow DNS verification steps (add TXT records to your domain)

### 2. Create SMTP Credentials
1. In SES Console, go to "SMTP settings"
2. Click "Create SMTP credentials"
3. Copy the generated:
   - **SMTP Username**
   - **SMTP Password**

### 3. Update Backend Configuration
Replace `your-ses-smtp-password-here` in `/backend/.env` with your actual SMTP password:
```env
SENDER_PASSWORD=your-actual-ses-smtp-password
```

### 4. Request Production Access (if needed)
- By default, SES is in "sandbox mode"
- In sandbox mode, you can only send to verified email addresses
- To send to any email address, request production access in the SES console

### 5. Test Email Configuration
Run the test script:
```bash
cd backend
python test_email_setup.py
```

## Current Status
- ✅ SMTP configuration added to .env
- ✅ Email helper configured for Amazon SES
- ⏳ Awaiting AWS SES domain verification
- ⏳ Awaiting SMTP credentials setup

## Guardian Email Flow
Once configured, when a student signs up:
1. Student account is created ✅
2. Guardian account is auto-created with random password ✅  
3. Email sent to guardian with login credentials via SES 📧
4. Guardian receives email with account details and login link

## Security Notes
- Keep SMTP credentials secure
- Consider using IAM roles instead of SMTP for production
- Enable logging and monitoring in SES console
- Set up bounce and complaint handling

## Troubleshooting
- Check SES sending statistics for delivery issues
- Verify domain/email identity status
- Check CloudWatch logs for detailed error messages
- Ensure sending limits aren't exceeded