# Zoom Integration Setup Guide

This document explains how to set up and configure Zoom integration for the course management system.

## Overview

The system includes comprehensive Zoom integration that automatically creates meetings for course sessions. The integration is implemented in the backend to ensure security and proper API credential management.

## Features

- ✅ **Automatic Meeting Creation**: Zoom meetings are created automatically when sessions are scheduled
- ✅ **Backend Security**: All Zoom API calls are made from the backend, keeping credentials secure
- ✅ **Graceful Fallback**: Sessions are created even if Zoom integration fails or is not configured
- ✅ **Meeting Management**: Full CRUD operations for Zoom meetings
- ✅ **Session Integration**: Meeting details are automatically stored with each session

## Backend Implementation

### Zoom Service (`app/services/zoom_service.py`)

The ZoomService class handles all Zoom API interactions:

- **Authentication**: Server-to-Server OAuth with account credentials
- **Meeting Management**: Create, read, update, delete meetings
- **Error Handling**: Graceful fallback when credentials are missing
- **Security**: Token caching and automatic refresh

### API Endpoints (`app/api/zoom.py`)

Available endpoints for Zoom integration:

- `GET /api/zoom/status` - Check integration status
- `POST /api/zoom/meetings` - Create a meeting
- `GET /api/zoom/meetings/{id}` - Get meeting details
- `PATCH /api/zoom/meetings/{id}` - Update meeting
- `DELETE /api/zoom/meetings/{id}` - Delete meeting
- `GET /api/zoom/meetings` - List meetings
- `POST /api/zoom/sessions/meeting` - Create session-specific meeting

### Session Integration (`app/api/courses.py`)

The batch session creation endpoint automatically:

1. Creates a Zoom meeting for each session (if configured)
2. Stores meeting details in the session record
3. Continues with session creation even if Zoom fails

## Setup Instructions

### 1. Create Zoom App

1. Go to [Zoom Marketplace](https://marketplace.zoom.us/)
2. Sign in with your Zoom account
3. Click "Develop" → "Build App"
4. Choose "Server-to-Server OAuth" app type
5. Fill in the app information:
   - App Name: "Course Management System"
   - Company Name: Your organization
   - Contact Email: Your email
   - Description: "Learning management system with session scheduling"

### 2. Configure App Permissions

Add the following scopes to your Zoom app:

- `meeting:write` - Create meetings
- `meeting:read` - Read meeting details
- `meeting:update` - Update meetings
- `meeting:delete` - Delete meetings
- `user:read` - Read user information

### 3. Get Credentials

From your Zoom app dashboard, copy:

- **Account ID**
- **Client ID** 
- **Client Secret**

### 4. Configure Environment Variables

Add these to your `.env` file:

```env
# Zoom Integration (Backend)
ZOOM_ACCOUNT_ID=your_actual_zoom_account_id
ZOOM_CLIENT_ID=your_actual_zoom_client_id
ZOOM_CLIENT_SECRET=your_actual_zoom_client_secret
```

**Important**: 
- Remove the `#` comment characters
- Replace the placeholder values with your actual credentials
- Never commit real credentials to version control

### 5. Restart Backend

Restart your Flask backend after adding the environment variables:

```bash
cd backend
python app.py
```

## Testing Integration

### Test Zoom Status

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/zoom/status
```

Expected response when configured:
```json
{
  "configured": true,
  "status": {
    "success": true,
    "message": "Zoom credentials are valid",
    "configured": true,
    "user": {
      "id": "zoom_user_id",
      "email": "your@email.com",
      "account_id": "account_id"
    }
  }
}
```

Expected response when not configured:
```json
{
  "configured": false,
  "status": {
    "success": false,
    "error": "Zoom credentials not configured",
    "configured": false
  }
}
```

### Test Session Creation

Create a session through the normal UI flow. Check the session details to see if Zoom meeting information is populated:

- Meeting ID
- Join URL
- Host Start URL
- Meeting Password

## Frontend Integration

### Session Display

The frontend automatically displays Zoom meeting details in session cards when available:

- **Meeting ID**: For manual entry into Zoom app
- **Join URL**: Direct link for participants
- **Start URL**: Host link for tutors
- **Password**: Meeting password if required

### API Usage

The frontend can use the Zoom API through the `API.zoom` object:

```javascript
// Check Zoom status
const status = await API.zoom.getStatus();

// Create a manual meeting
const meeting = await API.zoom.createMeeting({
  topic: "Manual Meeting",
  start_time: "2025-08-20T10:00:00Z",
  duration: 60
});
```

## Troubleshooting

### Common Issues

1. **"Zoom integration not configured"**
   - Check environment variables are set correctly
   - Ensure no typos in variable names
   - Restart backend after setting variables

2. **"Invalid Zoom credentials"**
   - Verify Account ID, Client ID, and Client Secret
   - Check app permissions in Zoom marketplace
   - Ensure app is activated

3. **"Failed to obtain access token"**
   - Check internet connection
   - Verify Zoom app is approved and published
   - Check for any IP restrictions in Zoom settings

### Debug Mode

Enable debug logging by adding to your environment:

```env
FLASK_ENV=development
FLASK_DEBUG=1
```

This will show detailed error messages for Zoom API calls.

### Manual Testing

Test the Zoom service directly:

```python
from app.services.zoom_service import zoom_service

# Check configuration
print(f"Configured: {zoom_service.is_configured()}")

# Validate credentials
result = zoom_service.validate_credentials()
print(f"Validation: {result}")

# Create test meeting
meeting = zoom_service.create_meeting({
    'topic': 'Test Meeting',
    'start_time': '2025-08-20T10:00:00Z',
    'duration': 60
})
print(f"Meeting: {meeting}")
```

## Security Considerations

- ✅ **Backend Only**: Zoom credentials are never exposed to frontend
- ✅ **Environment Variables**: Credentials stored securely in environment
- ✅ **Token Caching**: Access tokens are cached and refreshed automatically
- ✅ **Error Handling**: No sensitive information leaked in error messages
- ✅ **Access Control**: Only admins and tutors can manage meetings

## Production Deployment

For production deployment:

1. Use secure environment variable management (AWS Secrets Manager, etc.)
2. Enable HTTPS for all API calls
3. Set up monitoring for Zoom API rate limits
4. Configure backup meeting creation methods
5. Implement audit logging for meeting creation/deletion

## Support

If you need help with Zoom integration:

1. Check the troubleshooting section above
2. Review Zoom API documentation
3. Verify your Zoom app configuration
4. Check backend logs for specific error messages