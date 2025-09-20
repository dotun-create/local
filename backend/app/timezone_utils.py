"""
Timezone utilities for handling datetime conversions and validation
"""
from datetime import datetime, timedelta
import pytz
import re
from typing import Dict, List, Optional, Tuple
from dateutil.parser import parse as dateutil_parse
import logging

logger = logging.getLogger(__name__)

def validate_timezone(timezone_str: str) -> bool:
    """
    Validate if a timezone string is valid

    Args:
        timezone_str: Timezone string to validate

    Returns:
        bool: True if valid timezone, False otherwise
    """
    if not timezone_str:
        return False

    try:
        pytz.timezone(timezone_str)
        return True
    except pytz.exceptions.UnknownTimeZoneError:
        return False

def convert_datetime_to_user_timezone(dt: datetime, user_timezone: str) -> datetime:
    """
    Convert a UTC datetime to user's timezone

    Args:
        dt: UTC datetime (can be naive or timezone-aware)
        user_timezone: Target timezone string

    Returns:
        datetime: Converted datetime in user's timezone
    """
    if not dt:
        return dt

    if not validate_timezone(user_timezone):
        user_timezone = 'UTC'

    try:
        # Ensure datetime is timezone-aware UTC
        if dt.tzinfo is None:
            # Assume naive datetime is UTC
            utc_dt = pytz.UTC.localize(dt)
        elif dt.tzinfo != pytz.UTC:
            # Convert to UTC first
            utc_dt = dt.astimezone(pytz.UTC)
        else:
            utc_dt = dt

        # Convert to user timezone
        user_tz = pytz.timezone(user_timezone)
        return utc_dt.astimezone(user_tz)

    except Exception as e:
        logger.warning(f"Failed to convert datetime {dt} to timezone {user_timezone}: {e}")
        return dt

def smart_parse_session_datetime(data: Dict, user_timezone: str = 'UTC') -> Dict:
    """
    Smart parsing of session datetime with proper timezone handling

    This function correctly handles user intent:
    - When user says "4:00 PM", they mean 4:00 PM in their local time
    - We convert that to UTC for storage
    - We preserve the original timezone for display

    Args:
        data: Dictionary containing session data with scheduledDate
        user_timezone: User's timezone for interpreting the input

    Returns:
        Dict containing:
        - utc_datetime: UTC datetime for database storage
        - display_timezone: Timezone for display purposes
        - zoom_start_time: ISO string for Zoom API
        - zoom_timezone: Timezone for Zoom API
        - errors: List of validation errors
    """
    errors = []

    try:
        scheduled_date_str = data.get('scheduledDate')
        if not scheduled_date_str:
            errors.append("Missing scheduledDate")
            return {'errors': errors}

        # Validate user timezone
        if not validate_timezone(user_timezone):
            logger.warning(f"Invalid user timezone {user_timezone}, defaulting to UTC")
            user_timezone = 'UTC'

        # Parse the datetime string
        try:
            # Handle various datetime formats
            parsed_dt = dateutil_parse(scheduled_date_str)
        except Exception as e:
            errors.append(f"Invalid datetime format: {scheduled_date_str}")
            return {'errors': errors}

        # Determine the timezone context
        user_tz = pytz.timezone(user_timezone)

        # Handle timezone-aware vs naive datetimes
        if parsed_dt.tzinfo is None:
            # Naive datetime - interpret as user's local time
            # This is the key fix: user says "4:00 PM" = 4:00 PM in their timezone
            local_dt = user_tz.localize(parsed_dt)
        else:
            # Already timezone-aware
            local_dt = parsed_dt

        # Convert to UTC for storage (this is what goes in the database)
        utc_dt = local_dt.astimezone(pytz.UTC).replace(tzinfo=None)

        # Prepare Zoom API format (timezone-aware ISO string)
        zoom_start_time = local_dt.isoformat()

        # Map common timezone names to Zoom-compatible ones
        zoom_timezone_map = {
            'US/Eastern': 'America/New_York',
            'US/Central': 'America/Chicago',
            'US/Mountain': 'America/Denver',
            'US/Pacific': 'America/Los_Angeles',
            'Europe/London': 'Europe/London',
            'Europe/Paris': 'Europe/Paris',
            'Asia/Tokyo': 'Asia/Tokyo',
        }

        zoom_timezone = zoom_timezone_map.get(user_timezone, user_timezone)

        return {
            'utc_datetime': utc_dt,
            'display_timezone': user_timezone,
            'zoom_start_time': zoom_start_time,
            'zoom_timezone': zoom_timezone,
            'errors': []
        }

    except Exception as e:
        logger.error(f"Error in smart_parse_session_datetime: {e}")
        errors.append(f"Datetime parsing error: {str(e)}")
        return {'errors': errors}

def validate_future_datetime(date_str: str, time_str: str, timezone_str: str,
                           min_advance_minutes: int = 5) -> Dict:
    """
    Validate that a datetime is in the future with minimum advance booking

    Args:
        date_str: Date string (YYYY-MM-DD)
        time_str: Time string (HH:MM)
        timezone_str: Timezone string
        min_advance_minutes: Minimum minutes in advance required

    Returns:
        Dict with 'valid' boolean and 'errors' list
    """
    errors = []

    try:
        # Validate timezone
        if not validate_timezone(timezone_str):
            errors.append(f"Invalid timezone: {timezone_str}")
            return {'valid': False, 'errors': errors}

        tz = pytz.timezone(timezone_str)

        # Parse datetime
        dt_str = f"{date_str} {time_str}"
        parsed_dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")

        # Localize to timezone
        local_dt = tz.localize(parsed_dt)

        # Convert to UTC for comparison
        utc_dt = local_dt.astimezone(pytz.UTC)

        # Check if in future
        now_utc = datetime.now(pytz.UTC)
        min_required_time = now_utc + timedelta(minutes=min_advance_minutes)

        if utc_dt <= min_required_time:
            minutes_until = (utc_dt - now_utc).total_seconds() / 60
            errors.append(f"Session must be scheduled at least {min_advance_minutes} minutes in advance. "
                         f"Only {minutes_until:.1f} minutes until selected time.")
            return {'valid': False, 'errors': errors}

        return {'valid': True, 'errors': []}

    except Exception as e:
        errors.append(f"Validation error: {str(e)}")
        return {'valid': False, 'errors': errors}

def get_user_timezone_from_request(request) -> str:
    """
    Extract user timezone from request headers or return default

    Args:
        request: Flask request object

    Returns:
        str: User timezone or 'UTC' as default
    """
    # Check X-Timezone header first
    timezone = request.headers.get('X-Timezone')
    if timezone and validate_timezone(timezone):
        return timezone

    # Check X-Browser-Timezone header
    browser_tz = request.headers.get('X-Browser-Timezone')
    if browser_tz and validate_timezone(browser_tz):
        return browser_tz

    # Default to UTC
    return 'UTC'

def format_datetime_for_display(dt: datetime, timezone_str: str,
                               include_timezone: bool = True) -> str:
    """
    Format datetime for user display

    Args:
        dt: Datetime to format (assumed UTC if naive)
        timezone_str: Target timezone for display
        include_timezone: Whether to include timezone abbreviation

    Returns:
        str: Formatted datetime string
    """
    if not dt:
        return ""

    try:
        # Convert to user timezone
        display_dt = convert_datetime_to_user_timezone(dt, timezone_str)

        # Format
        if include_timezone:
            return display_dt.strftime("%Y-%m-%d %I:%M %p %Z")
        else:
            return display_dt.strftime("%Y-%m-%d %I:%M %p")

    except Exception as e:
        logger.warning(f"Failed to format datetime {dt} for timezone {timezone_str}: {e}")
        return str(dt)

def get_common_timezones() -> List[Dict[str, str]]:
    """
    Get list of common timezones for UI dropdowns

    Returns:
        List of dicts with 'value' and 'label' keys
    """
    common_timezones = [
        {'value': 'UTC', 'label': 'UTC'},
        {'value': 'US/Eastern', 'label': 'Eastern Time (US)'},
        {'value': 'US/Central', 'label': 'Central Time (US)'},
        {'value': 'US/Mountain', 'label': 'Mountain Time (US)'},
        {'value': 'US/Pacific', 'label': 'Pacific Time (US)'},
        {'value': 'Europe/London', 'label': 'London'},
        {'value': 'Europe/Paris', 'label': 'Paris'},
        {'value': 'Europe/Berlin', 'label': 'Berlin'},
        {'value': 'Asia/Tokyo', 'label': 'Tokyo'},
        {'value': 'Asia/Shanghai', 'label': 'Shanghai'},
        {'value': 'Australia/Sydney', 'label': 'Sydney'},
    ]

    return common_timezones

def debug_timezone_conversion(user_input: str, user_timezone: str) -> Dict:
    """
    Debug helper to show timezone conversion steps

    Args:
        user_input: User's datetime input
        user_timezone: User's timezone

    Returns:
        Dict with conversion steps for debugging
    """
    try:
        # Parse user input
        parsed = dateutil_parse(user_input)
        user_tz = pytz.timezone(user_timezone)

        # Show the conversion steps
        if parsed.tzinfo is None:
            localized = user_tz.localize(parsed)
        else:
            localized = parsed

        utc_converted = localized.astimezone(pytz.UTC)

        return {
            'user_input': user_input,
            'user_timezone': user_timezone,
            'parsed_naive': str(parsed),
            'localized_to_user_tz': str(localized),
            'converted_to_utc': str(utc_converted),
            'utc_for_storage': str(utc_converted.replace(tzinfo=None)),
            'interpretation': f"User meant {user_input} in {user_timezone} timezone"
        }
    except Exception as e:
        return {'error': str(e)}