# Amazon WorkMail Email Setup Guide

## Configuration Complete ✅
The backend has been configured to use Amazon WorkMail with:
- **Email Address**: internal@troupe.academy
- **Region**: eu-west-1 
- **SMTP Server**: smtp.mail.eu-west-1.awsapps.com
- **Port**: 465 (SSL/TLS)
- **Authentication**: Full email address as username

## Key Differences from SES
| Setting | WorkMail | SES |
|---------|----------|-----|
| SMTP Server | smtp.mail.{region}.awsapps.com | email-smtp.{region}.amazonaws.com |
| Port | 465 (SSL) | 587 (STARTTLS) |
| SSL | true | false |
| Username | Full email address | AWS-generated AKIA key |
| Password | User's WorkMail password | SMTP-specific password |

## Required Amazon WorkMail Setup Steps

### 1. Create WorkMail Organization
1. Go to [AWS WorkMail Console](https://eu-west-1.console.aws.amazon.com/workmail/)
2. Create a new organization in `eu-west-1`
3. Choose domain: `troupe.academy`
4. Complete domain verification (add DNS records)

### 2. Create User Account
1. In WorkMail console → "Users"
2. Create user: `internal`
3. Set password (this becomes your SENDER_PASSWORD)
4. Enable the account

### 3. Configure Domain
1. Verify `troupe.academy` domain ownership
2. Configure MX, TXT, and CNAME DNS records
3. Enable the domain for email routing

### 4. Update Backend Configuration
Your `.env` file should have:
```env
# Email Configuration (Amazon WorkMail)
SENDER_EMAIL=internal@troupe.academy
SENDER_NAME=Trouper Academy
SMTP_SERVER=smtp.mail.eu-west-1.awsapps.com
SMTP_PORT=465
SMTP_USE_SSL=true
SMTP_USERNAME=internal@troupe.academy
SENDER_PASSWORD=your-workmail-user-password
```

### 5. Test Configuration
Run the diagnosis script:
```bash
cd backend
python diagnose_email.py
```

## Current Status
- ✅ SMTP configuration updated for WorkMail
- ✅ SSL/TLS settings configured
- ✅ Email helper configured for WorkMail
- ⏳ Awaiting WorkMail organization setup
- ⏳ Awaiting domain verification
- ⏳ Awaiting user account creation

## Guardian Email Flow
Once configured, when a student signs up:
1. Student account is created ✅
2. Guardian account is auto-created with random password ✅  
3. Email sent to guardian via WorkMail from `internal@troupe.academy` 📧
4. Guardian receives professional email with login credentials

## WorkMail Benefits
- **Professional**: Full email hosting solution
- **Integration**: Native AWS service integration  
- **Security**: Advanced security features and compliance
- **Management**: Full email administration capabilities
- **Mobile**: Mobile device management support

## Cost Considerations
- WorkMail: ~$4/user/month + storage
- SES: Pay-per-email (~$0.10 per 1000 emails)
- WorkMail better for full email hosting, SES better for transactional emails

## Troubleshooting
- Ensure domain is fully verified in WorkMail
- Check DNS propagation for domain records
- Verify user account is enabled and password is correct
- Confirm SMTP access is enabled for the user
- Check AWS region matches (eu-west-1)

## Security Notes
- Enable MFA for WorkMail admin accounts
- Configure strong password policies
- Set up email retention policies
- Enable logging and monitoring
- Consider IP restrictions for admin access