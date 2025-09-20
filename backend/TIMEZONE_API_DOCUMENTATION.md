# Timezone Handling API Documentation

## Overview

The Troupedev application implements comprehensive timezone handling to ensure that session times are correctly interpreted, stored, and displayed across different user timezones. This document outlines the timezone handling implementation and API contract.

## Problem Solved

**Critical Bug Fixed**: Sessions created at "4:00 PM" in the user's local timezone were incorrectly showing as "9:00 PM" due to improper timezone conversion.

**Root Cause**: The backend was treating timezone-converted times as local times instead of properly handling user intent.

**Solution**: Implemented smart timezone parsing that correctly interprets user input in their local timezone, stores as UTC, and converts back for display.

## API Contract

### Frontend Requirements

The frontend must send timezone information in request headers:

```javascript
headers: {
  'X-Timezone': 'US/Eastern',        // User's timezone (required)
  'X-Browser-Locale': 'en-US'        // Browser locale (optional)
}
```

### Backend Processing

The backend automatically:
1. Extracts timezone from `X-Timezone` header
2. Interprets datetime input in user's timezone
3. Converts to UTC for database storage
4. Returns timezone-aware responses

## Session Creation API

### Endpoint: `POST /api/sessions`

#### Request Headers
```
Authorization: Bearer <token>
Content-Type: application/json
X-Timezone: US/Eastern
X-Browser-Locale: en-US
```

#### Request Body
```json
{
  "title": "Math Tutoring Session",
  "scheduledDate": "2025-09-18T16:00:00",  // 4:00 PM in user's timezone
  "duration": 60,
  "courseId": "course_12345",
  "tutorId": "user_67890"
}
```

#### Timezone Processing
1. **User Input**: `"2025-09-18T16:00:00"` (4:00 PM)
2. **User Timezone**: `"US/Eastern"` (from X-Timezone header)
3. **Interpretation**: 4:00 PM Eastern Time
4. **UTC Storage**: `"2025-09-18T20:00:00"` (8:00 PM UTC)
5. **Display**: Returns as 4:00 PM when requested by same user

#### Response
```json
{
  "session": {
    "id": "session_abc123",
    "title": "Math Tutoring Session",
    "scheduledDate": "2025-09-18T16:00:00-04:00",  // User's timezone
    "timezone": "US/Eastern",
    "displayTimezone": "US/Eastern",
    "createdTimezone": "US/Eastern",
    "duration": 60
  },
  "message": "Session created successfully"
}
```

## Batch Session Creation API

### Endpoint: `POST /api/courses/{courseId}/sessions/batch`

Same timezone handling applies to batch creation. Each session in the batch is processed with the user's timezone from the header.

#### Request Body
```json
{
  "sessions": [
    {
      "title": "Session 1",
      "scheduledDate": "2025-09-18T16:00:00",
      "tutorId": "user_67890"
    },
    {
      "title": "Session 2",
      "scheduledDate": "2025-09-19T16:00:00",
      "tutorId": "user_67890"
    }
  ]
}
```

## Session Retrieval API

### Endpoint: `GET /api/sessions`

Sessions are returned with timezone conversion based on the requesting user's timezone.

#### Response Format
```json
{
  "sessions": [
    {
      "id": "session_abc123",
      "scheduledDate": "2025-09-18T16:00:00-04:00",  // User's timezone
      "timezone": "US/Eastern",                       // Session's timezone
      "displayTimezone": "US/Eastern",               // Timezone for display
      "createdTimezone": "US/Eastern"                // Creator's timezone
    }
  ]
}
```

## Timezone Utilities Reference

### Smart Parsing Function

```python
from app.timezone_utils import smart_parse_session_datetime

result = smart_parse_session_datetime(
    data={'scheduledDate': '2025-09-18T16:00:00'},
    user_timezone='US/Eastern'
)

# Returns:
{
    'utc_datetime': datetime(2025, 9, 18, 20, 0),  # For database storage
    'display_timezone': 'US/Eastern',               # For UI display
    'zoom_start_time': '2025-09-18T16:00:00-04:00', # For Zoom API
    'zoom_timezone': 'America/New_York',            # Zoom-compatible timezone
    'errors': []                                    # Validation errors
}
```

### Validation Function

```python
from app.timezone_utils import validate_future_datetime

result = validate_future_datetime(
    date_str='2025-09-18',
    time_str='16:00',
    timezone_str='US/Eastern',
    min_advance_minutes=5
)

# Returns:
{
    'valid': True,
    'errors': []
}
```

## Supported Timezones

Common timezone values supported:

- `UTC` - Coordinated Universal Time
- `US/Eastern` - Eastern Time (US)
- `US/Central` - Central Time (US)
- `US/Mountain` - Mountain Time (US)
- `US/Pacific` - Pacific Time (US)
- `Europe/London` - London
- `Europe/Paris` - Paris
- `Europe/Berlin` - Berlin
- `Asia/Tokyo` - Tokyo
- `Asia/Shanghai` - Shanghai
- `Australia/Sydney` - Sydney

## Error Handling

### Invalid Timezone
```json
{
  "error": "Invalid date/time format",
  "details": ["Invalid timezone: InvalidZone"]
}
```

### Past Date
```json
{
  "error": "Invalid booking time",
  "details": ["Session must be scheduled at least 5 minutes in advance"]
}
```

### Invalid Date Format
```json
{
  "error": "Invalid date/time format",
  "details": ["Invalid datetime format: not-a-date"]
}
```

## Testing

### Test Scenario: Eastern Time User
```bash
# User creates session at 4:00 PM Eastern
curl -X POST http://localhost:5000/api/sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -H "X-Timezone: US/Eastern" \
  -d '{
    "title": "Test Session",
    "scheduledDate": "2025-09-18T16:00:00"
  }'

# Expected: Session stored as 20:00 UTC, displayed as 16:00 Eastern
```

### Validation Test
```bash
# Run comprehensive timezone tests
cd backend
python test_timezone_fix.py
```

## Best Practices

### Frontend Development
1. Always send `X-Timezone` header with user's detected timezone
2. Use `Intl.DateTimeFormat().resolvedOptions().timeZone` to detect timezone
3. Display times in user's local timezone
4. Handle timezone-aware datetime strings properly

### Backend Development
1. Always store datetime in UTC in the database
2. Use `smart_parse_session_datetime` for session creation
3. Convert to user timezone for API responses
4. Validate timezones using `validate_timezone`

### Database Schema
- `scheduled_date`: Always stored as naive UTC datetime
- `timezone`: Session's timezone for reference
- `created_timezone`: Creator's timezone when session was made
- `browser_timezone`: Browser's detected timezone

## Migration Notes

This timezone fix is backward compatible:
- Existing sessions continue to work
- No database migration required
- Gradual rollout possible

## Debug Utilities

For debugging timezone issues:

```python
from app.timezone_utils import debug_timezone_conversion

debug_info = debug_timezone_conversion(
    user_input='2025-09-18T16:00:00',
    user_timezone='US/Eastern'
)
print(debug_info)
```

This will show the complete conversion chain from user input to storage format.