"""
Timezone conversion utilities for session creation and display
Handles conversion between user's local timezone and UTC for storage
"""

import pytz
from datetime import datetime
from typing import Optional

def convert_to_utc(local_time_str: str, timezone_str: str, date_str: str, force_conversion: bool = False) -> str:
    """
    Convert local time to UTC for consistent storage

    Args:
        local_time_str: Time in HH:MM format (e.g., "14:00")
        timezone_str: IANA timezone (e.g., "America/Chicago")
        date_str: Date in YYYY-MM-DD format (e.g., "2025-09-01")
        force_conversion: Force conversion even if timezone is UTC

    Returns:
        UTC time in HH:MM format

    Example:
        convert_to_utc("14:00", "America/Chicago", "2025-09-01") -> "19:00"
    """
    try:
        # Check if timezone is already UTC and no force conversion
        if timezone_str == 'UTC' and not force_conversion:
            print(f"⏰ Time {local_time_str} already in UTC, no conversion needed")
            return local_time_str

        # Create timezone object
        local_tz = pytz.timezone(timezone_str)

        # Parse local datetime
        naive_datetime = datetime.strptime(f"{date_str} {local_time_str}", "%Y-%m-%d %H:%M")

        # Localize to user's timezone
        localized_dt = local_tz.localize(naive_datetime)

        # Convert to UTC
        utc_dt = localized_dt.astimezone(pytz.UTC)

        utc_time = utc_dt.strftime("%H:%M")
        print(f"⏰ Converted {local_time_str} {timezone_str} -> {utc_time} UTC on {date_str}")

        return utc_time

    except Exception as e:
        print(f"Error converting to UTC: {e}")
        return local_time_str  # Return original on error


def convert_from_utc(utc_time_str: str, target_timezone_str: str, date_str: str) -> str:
    """
    Convert UTC time back to user's timezone for display
    
    Args:
        utc_time_str: UTC time in HH:MM format (e.g., "19:00")
        target_timezone_str: IANA timezone (e.g., "America/Chicago")
        date_str: Date in YYYY-MM-DD format (e.g., "2025-09-01")
    
    Returns:
        Local time in HH:MM format
    
    Example:
        convert_from_utc("19:00", "America/Chicago", "2025-09-01") -> "14:00"
    """
    try:
        # Create timezone objects
        utc_tz = pytz.UTC
        target_tz = pytz.timezone(target_timezone_str)
        
        # Parse UTC datetime
        utc_datetime = datetime.strptime(f"{date_str} {utc_time_str}", "%Y-%m-%d %H:%M")
        
        # Localize to UTC
        utc_dt = utc_tz.localize(utc_datetime)
        
        # Convert to target timezone
        local_dt = utc_dt.astimezone(target_tz)
        
        return local_dt.strftime("%H:%M")
    
    except Exception as e:
        print(f"Error converting from UTC: {e}")
        return utc_time_str  # Return original on error


def get_timezone_offset(timezone_str: str, date_str: Optional[str] = None) -> int:
    """
    Get timezone offset in minutes from UTC
    
    Args:
        timezone_str: IANA timezone (e.g., "America/Chicago")
        date_str: Optional date for DST calculation (defaults to today)
    
    Returns:
        Offset in minutes (negative for behind UTC, positive for ahead)
    
    Example:
        get_timezone_offset("America/Chicago", "2025-09-01") -> -300 (CDT is UTC-5)
    """
    try:
        tz = pytz.timezone(timezone_str)
        
        if date_str:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
        else:
            dt = datetime.now()
            
        # Get offset for the specific date (handles DST)
        localized_dt = tz.localize(dt)
        offset_seconds = localized_dt.utcoffset().total_seconds()
        offset_minutes = int(offset_seconds / 60)
        
        return offset_minutes
    
    except Exception as e:
        print(f"Error getting timezone offset: {e}")
        return 0  # Return 0 on error (UTC)


def validate_timezone(timezone_str: str) -> bool:
    """
    Validate that timezone string is a valid IANA timezone
    
    Args:
        timezone_str: Timezone to validate
    
    Returns:
        True if valid, False otherwise
    """
    try:
        pytz.timezone(timezone_str)
        return True
    except pytz.UnknownTimeZoneError:
        return False


def format_timezone_display(timezone_str: str, date_str: Optional[str] = None) -> str:
    """
    Format timezone for user-friendly display

    Args:
        timezone_str: IANA timezone (e.g., "America/Chicago")
        date_str: Optional date for DST calculation

    Returns:
        Human-readable timezone (e.g., "CDT" or "CST")
    """
    try:
        tz = pytz.timezone(timezone_str)

        if date_str:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
        else:
            dt = datetime.now()

        localized_dt = tz.localize(dt)
        return localized_dt.strftime('%Z')  # Returns abbreviation like "CDT"

    except Exception as e:
        print(f"Error formatting timezone display: {e}")
        return timezone_str  # Return original on error


def get_user_timezone_from_request(request) -> str:
    """
    Extract user timezone from Flask request headers

    Args:
        request: Flask request object

    Returns:
        User's timezone string or 'UTC' as fallback
    """
    timezone = request.headers.get('X-Timezone', 'UTC')

    # Validate the timezone
    if validate_timezone(timezone):
        return timezone
    else:
        print(f"Invalid timezone received: {timezone}, using UTC fallback")
        return 'UTC'


def convert_datetime_to_user_timezone(utc_datetime: datetime, user_timezone: str) -> datetime:
    """
    Convert UTC datetime to user's timezone

    Args:
        utc_datetime: Datetime in UTC (naive or aware)
        user_timezone: Target timezone string

    Returns:
        Datetime converted to user's timezone
    """
    try:
        # Ensure datetime is UTC-aware
        if utc_datetime.tzinfo is None:
            utc_dt = pytz.UTC.localize(utc_datetime)
        else:
            utc_dt = utc_datetime.astimezone(pytz.UTC)

        # Convert to user timezone
        user_tz = pytz.timezone(user_timezone)
        user_dt = utc_dt.astimezone(user_tz)

        return user_dt

    except Exception as e:
        print(f"Error converting datetime to user timezone: {e}")
        return utc_datetime


def get_timezone_aware_now(timezone_str: str) -> datetime:
    """
    Get current datetime in specified timezone

    Args:
        timezone_str: Target timezone

    Returns:
        Current datetime in specified timezone
    """
    try:
        tz = pytz.timezone(timezone_str)
        return datetime.now(tz)
    except Exception as e:
        print(f"Error getting timezone-aware now: {e}")
        return datetime.utcnow()


def detect_timezone_conflicts(scheduled_date_str: str, timezone1: str, timezone2: str) -> dict:
    """
    Detect if two timezones would cause date conflicts for the same datetime

    Args:
        scheduled_date_str: ISO datetime string
        timezone1: First timezone to compare
        timezone2: Second timezone to compare

    Returns:
        Dict with conflict information
    """
    try:
        dt = datetime.fromisoformat(scheduled_date_str.replace('Z', '+00:00'))

        # Convert to both timezones
        dt1 = convert_datetime_to_user_timezone(dt, timezone1)
        dt2 = convert_datetime_to_user_timezone(dt, timezone2)

        # Check if dates are different
        date_conflict = dt1.date() != dt2.date()
        hour_difference = abs(dt1.hour - dt2.hour)

        return {
            'has_conflict': date_conflict,
            'date1': dt1.strftime('%Y-%m-%d'),
            'date2': dt2.strftime('%Y-%m-%d'),
            'time1': dt1.strftime('%H:%M'),
            'time2': dt2.strftime('%H:%M'),
            'hour_difference': hour_difference
        }

    except Exception as e:
        print(f"Error detecting timezone conflicts: {e}")
        return {'has_conflict': False, 'error': str(e)}


def validate_date_time_input(date_str: str, time_str: str, timezone_str: str = None) -> dict:
    """
    Validate date and time input with timezone context

    Args:
        date_str: Date in YYYY-MM-DD format
        time_str: Time in HH:MM format
        timezone_str: Optional timezone string

    Returns:
        Dict with validation results and parsed datetime
    """
    result = {
        'valid': False,
        'errors': [],
        'parsed_datetime': None,
        'utc_datetime': None,
        'timezone': timezone_str or 'UTC'
    }

    # Validate date format
    try:
        parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        result['errors'].append('Invalid date format. Use YYYY-MM-DD')
        return result

    # Validate time format
    try:
        parsed_time = datetime.strptime(time_str, '%H:%M').time()
    except ValueError:
        result['errors'].append('Invalid time format. Use HH:MM')
        return result

    # Validate timezone if provided
    if timezone_str and not validate_timezone(timezone_str):
        result['errors'].append(f'Invalid timezone: {timezone_str}')
        return result

    # Combine date and time
    try:
        naive_datetime = datetime.combine(parsed_date, parsed_time)

        # If timezone provided, localize and convert to UTC
        if timezone_str:
            user_tz = pytz.timezone(timezone_str)
            localized_dt = user_tz.localize(naive_datetime)
            utc_dt = localized_dt.astimezone(pytz.UTC)
            result['utc_datetime'] = utc_dt
            result['parsed_datetime'] = localized_dt
        else:
            # Assume UTC if no timezone
            result['parsed_datetime'] = pytz.UTC.localize(naive_datetime)
            result['utc_datetime'] = result['parsed_datetime']

        result['valid'] = True
        return result

    except Exception as e:
        result['errors'].append(f'Error processing datetime: {str(e)}')
        return result


def validate_time_range(start_time: str, end_time: str, date_str: str = None, timezone_str: str = None) -> dict:
    """
    Validate that start time is before end time, accounting for timezone

    Args:
        start_time: Start time in HH:MM format
        end_time: End time in HH:MM format
        date_str: Optional date for DST considerations
        timezone_str: Optional timezone

    Returns:
        Dict with validation results
    """
    result = {
        'valid': False,
        'errors': [],
        'duration_minutes': 0
    }

    # Use today's date if not provided
    if not date_str:
        date_str = datetime.now().strftime('%Y-%m-%d')

    # Validate start time
    start_validation = validate_date_time_input(date_str, start_time, timezone_str)
    if not start_validation['valid']:
        result['errors'].extend([f"Start time: {err}" for err in start_validation['errors']])
        return result

    # Validate end time
    end_validation = validate_date_time_input(date_str, end_time, timezone_str)
    if not end_validation['valid']:
        result['errors'].extend([f"End time: {err}" for err in end_validation['errors']])
        return result

    # Compare times
    start_dt = start_validation['utc_datetime']
    end_dt = end_validation['utc_datetime']

    if start_dt >= end_dt:
        result['errors'].append('Start time must be before end time')
        return result

    # Calculate duration
    duration = end_dt - start_dt
    result['duration_minutes'] = int(duration.total_seconds() / 60)
    result['valid'] = True

    return result


def validate_future_datetime(date_str: str, time_str: str, timezone_str: str = None, min_advance_minutes: int = 0) -> dict:
    """
    Validate that a datetime is in the future

    Args:
        date_str: Date in YYYY-MM-DD format
        time_str: Time in HH:MM format
        timezone_str: Optional timezone
        min_advance_minutes: Minimum minutes in advance required

    Returns:
        Dict with validation results
    """
    result = {
        'valid': False,
        'errors': [],
        'is_future': False,
        'minutes_from_now': 0
    }

    # Validate datetime
    datetime_validation = validate_date_time_input(date_str, time_str, timezone_str)
    if not datetime_validation['valid']:
        result['errors'].extend(datetime_validation['errors'])
        return result

    # Get current time in UTC
    now_utc = datetime.now(pytz.UTC)
    target_utc = datetime_validation['utc_datetime']

    # Check if future
    time_diff = target_utc - now_utc
    result['minutes_from_now'] = int(time_diff.total_seconds() / 60)
    result['is_future'] = time_diff.total_seconds() > 0

    if not result['is_future']:
        result['errors'].append('Date and time must be in the future')
        return result

    # Check minimum advance time
    if result['minutes_from_now'] < min_advance_minutes:
        result['errors'].append(f'Date and time must be at least {min_advance_minutes} minutes in advance')
        return result

    result['valid'] = True
    return result


def sanitize_timezone_input(timezone_input: str) -> str:
    """
    Sanitize and validate timezone input from user

    Args:
        timezone_input: Raw timezone string from user

    Returns:
        Validated timezone string or 'UTC' as fallback
    """
    if not timezone_input or not isinstance(timezone_input, str):
        return 'UTC'

    # Remove extra whitespace
    timezone_input = timezone_input.strip()

    # Validate the timezone
    if validate_timezone(timezone_input):
        return timezone_input

    # Try to map common timezone abbreviations to IANA names
    timezone_mappings = {
        'EST': 'America/New_York',
        'PST': 'America/Los_Angeles',
        'CST': 'America/Chicago',
        'MST': 'America/Denver',
        'GMT': 'UTC',
        'BST': 'Europe/London',
        'CET': 'Europe/Paris',
        'JST': 'Asia/Tokyo',
        'AEST': 'Australia/Sydney'
    }

    mapped_timezone = timezone_mappings.get(timezone_input.upper())
    if mapped_timezone and validate_timezone(mapped_timezone):
        return mapped_timezone

    # Fallback to UTC
    print(f"Invalid timezone '{timezone_input}', using UTC fallback")
    return 'UTC'


def js_to_python_weekday(js_weekday: int) -> int:
    """
    Convert JavaScript weekday format to Python weekday format

    Args:
        js_weekday: JavaScript weekday (0=Sunday, 1=Monday, ..., 6=Saturday)

    Returns:
        Python weekday (0=Monday, 1=Tuesday, ..., 6=Sunday)

    Example:
        js_to_python_weekday(0) -> 6  # Sunday: JS=0, Python=6
        js_to_python_weekday(1) -> 0  # Monday: JS=1, Python=0
        js_to_python_weekday(4) -> 3  # Thursday: JS=4, Python=3
    """
    if not isinstance(js_weekday, int) or js_weekday < 0 or js_weekday > 6:
        print(f"Invalid JavaScript weekday: {js_weekday}, returning Monday")
        return 0  # Default to Monday

    # Convert JS (0=Sunday) to Python (0=Monday)
    # JS: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
    # PY: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
    return (js_weekday - 1) % 7


def python_to_js_weekday(python_weekday: int) -> int:
    """
    Convert Python weekday format to JavaScript weekday format

    Args:
        python_weekday: Python weekday (0=Monday, 1=Tuesday, ..., 6=Sunday)

    Returns:
        JavaScript weekday (0=Sunday, 1=Monday, ..., 6=Saturday)

    Example:
        python_to_js_weekday(6) -> 0  # Sunday: Python=6, JS=0
        python_to_js_weekday(0) -> 1  # Monday: Python=0, JS=1
        python_to_js_weekday(3) -> 4  # Thursday: Python=3, JS=4
    """
    if not isinstance(python_weekday, int) or python_weekday < 0 or python_weekday > 6:
        print(f"Invalid Python weekday: {python_weekday}, returning Monday")
        return 1  # Default to Monday in JS format

    # Convert Python (0=Monday) to JS (0=Sunday)
    # PY: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
    # JS: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
    return (python_weekday + 1) % 7


def standardize_weekday_display(weekday: int, source_format: str = 'python') -> dict:
    """
    Standardize weekday for display and provide both formats

    Args:
        weekday: Weekday number
        source_format: Either 'python' or 'javascript' to indicate input format

    Returns:
        Dict with both formats and display name

    Example:
        standardize_weekday_display(3, 'python') -> {
            'python': 3, 'javascript': 4, 'name': 'Thursday'
        }
    """
    weekday_names = [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    ]

    try:
        if source_format == 'python':
            python_day = weekday
            js_day = python_to_js_weekday(weekday)
            name = weekday_names[python_day] if 0 <= python_day <= 6 else 'Invalid'
        else:  # javascript format
            js_day = weekday
            python_day = js_to_python_weekday(weekday)
            name = weekday_names[python_day] if 0 <= python_day <= 6 else 'Invalid'

        return {
            'python': python_day,
            'javascript': js_day,
            'name': name,
            'valid': True
        }
    except Exception as e:
        print(f"Error standardizing weekday {weekday}: {e}")
        return {
            'python': 0,
            'javascript': 1,
            'name': 'Monday',
            'valid': False,
            'error': str(e)
        }


def convert_local_to_local(time_str: str, source_timezone_str: str, target_timezone_str: str, date_str: str) -> str:
    """
    Convert time from one local timezone to another local timezone

    Args:
        time_str: Time in HH:MM format (e.g., "17:00")
        source_timezone_str: Source IANA timezone (e.g., "America/Chicago")
        target_timezone_str: Target IANA timezone (e.g., "America/New_York")
        date_str: Date in YYYY-MM-DD format (e.g., "2025-09-01")

    Returns:
        Converted time in HH:MM format

    Example:
        convert_local_to_local("17:00", "America/Chicago", "America/New_York", "2025-09-01") -> "18:00"
    """
    try:
        # Create timezone objects
        source_tz = pytz.timezone(source_timezone_str)
        target_tz = pytz.timezone(target_timezone_str)

        # Parse source datetime
        source_datetime = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")

        # Localize to source timezone
        source_dt = source_tz.localize(source_datetime)

        # Convert to target timezone
        target_dt = source_dt.astimezone(target_tz)

        return target_dt.strftime("%H:%M")

    except Exception as e:
        print(f"Error converting local to local: {e}")
        return time_str  # Return original on error


def detect_storage_format(availability_data: dict) -> str:
    """
    Detect if availability times are stored as UTC or local timezone

    Args:
        availability_data: Availability record with time fields

    Returns:
        'utc', 'local', or 'unknown'
    """
    try:
        # Check if explicitly marked in data
        storage_format = availability_data.get('timezone_storage_format')
        if storage_format in ['utc', 'local']:
            return storage_format

        # Enhanced heuristic detection based on creation API analysis
        start_time = availability_data.get('start_time')
        timezone_str = availability_data.get('time_zone', 'UTC')
        created_at = availability_data.get('created_at')

        if not start_time or timezone_str == 'UTC':
            return 'utc'

        # Parse time
        start_hour = int(start_time.split(':')[0])

        # Records created after 2025-09-16 are stored as UTC (confirmed by analysis)
        if created_at:
            try:
                from datetime import datetime
                if isinstance(created_at, str):
                    created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    created_date = created_at

                if created_date >= datetime(2025, 9, 16):
                    return 'utc'
            except:
                pass

        # For US timezones, evening hours (20:00-23:59) indicate UTC storage
        # (converted from afternoon local input like 16:00 → 21:00 UTC)
        if timezone_str.startswith('America/') and 20 <= start_hour <= 23:
            return 'utc'

        # Working hours (8 AM - 5 PM) could indicate local storage (legacy)
        if 8 <= start_hour <= 17:
            return 'local'

        # Very early hours (1 AM - 5 AM) in non-UTC timezone suggest UTC storage
        if 1 <= start_hour <= 5 and timezone_str != 'UTC':
            return 'utc'

        return 'unknown'

    except Exception as e:
        print(f"Error detecting storage format: {e}")
        return 'unknown'


def convert_availability_display_times_v2(availability_data: dict, user_timezone: str = 'UTC') -> dict:
    """
    FIXED: Convert availability times for display in user's timezone (format-aware)
    Args:
        availability_data: Availability record with time fields
        user_timezone: Target timezone for display
    Returns:
        Availability data with additional display time fields
    """
    try:
        # Extract original timezone and times
        original_timezone = availability_data.get('time_zone', 'UTC')
        start_time = availability_data.get('start_time')
        end_time = availability_data.get('end_time')
        instance_date = availability_data.get('instance_date') or availability_data.get('specific_date')

        if not start_time or not end_time:
            return availability_data

        # Use today's date if no specific date provided
        if not instance_date:
            instance_date = datetime.now().strftime('%Y-%m-%d')

        # Detect storage format with strong UTC evidence override
        metadata_format = availability_data.get('timezone_storage_format', 'unknown')
        actual_format = detect_storage_format(availability_data)

        # CRITICAL FIX: Override metadata when evidence strongly suggests UTC storage
        # Check for strong UTC indicators that override metadata
        created_at = availability_data.get('created_at')
        start_hour = int(start_time.split(':')[0]) if start_time else 0

        # Strong evidence for UTC storage (overrides metadata):
        # 1. Records created after 2025-09-16 (confirmed UTC storage)
        # 2. Chicago timezone with evening times (20:00-23:59) suggest UTC from afternoon local input
        strong_utc_evidence = False

        if created_at:
            try:
                if isinstance(created_at, str):
                    created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                else:
                    created_date = created_at
                if created_date >= datetime(2025, 9, 16):
                    strong_utc_evidence = True
                    print(f"🔍 UTC evidence: Created after 2025-09-16 ({created_date})")
            except:
                pass

        # CRITICAL: If timezone is Chicago and times are in evening (20:00-23:59), it's definitely UTC storage
        if original_timezone == 'America/Chicago' and 20 <= start_hour <= 23:
            strong_utc_evidence = True
            print(f"🔍 UTC evidence: Chicago timezone with evening time {start_hour}:xx")

        # Determine final storage format
        if strong_utc_evidence:
            storage_format = 'utc'
            if metadata_format != 'utc':
                print(f"🔄 Overriding metadata for {availability_data.get('id', 'unknown')}: "
                      f"metadata='{metadata_format}' → actual='utc'")
        else:
            storage_format = actual_format

        print(f"🔍 Final storage format for {availability_data.get('id', 'unknown')}: {storage_format}")

        # Convert times based on determined storage format
        if storage_format == 'utc':
            # Times are stored as UTC, convert from UTC to user timezone
            display_start = convert_from_utc(start_time, user_timezone, instance_date)
            display_end = convert_from_utc(end_time, user_timezone, instance_date)
        elif storage_format == 'local':
            # Times are stored in local timezone (original_timezone)
            if user_timezone == original_timezone:
                # No conversion needed - same timezone
                display_start = start_time
                display_end = end_time
            else:
                # Convert from original timezone to user timezone
                display_start = convert_local_to_local(start_time, original_timezone, user_timezone, instance_date)
                display_end = convert_local_to_local(end_time, original_timezone, user_timezone, instance_date)
        else:
            # Unknown format, try legacy detection logic
            print(f"⚠️  Unknown storage format, attempting legacy conversion for {availability_data.get('id', 'unknown')}")
            display_start = convert_from_utc(start_time, user_timezone, instance_date)
            display_end = convert_from_utc(end_time, user_timezone, instance_date)

        # Add display fields to the data
        enhanced_data = availability_data.copy()
        enhanced_data.update({
            'display_start_time': display_start,
            'display_end_time': display_end,
            'display_timezone': user_timezone,
            'original_timezone': original_timezone,
            'storage_format_detected': storage_format,
            'display_time_range': f"{display_start}-{display_end} {format_timezone_display(user_timezone, instance_date)}"
        })

        # Standardize day_of_week for display
        if 'day_of_week' in availability_data:
            day_info = standardize_weekday_display(availability_data['day_of_week'], 'python')
            enhanced_data['day_of_week_standardized'] = day_info

        print(f"✅ Converted {start_time}-{end_time} {original_timezone} -> {display_start}-{display_end} {user_timezone}")
        return enhanced_data

    except Exception as e:
        print(f"Error converting availability display times v2: {e}")
        return availability_data


def convert_availability_display_times_legacy(availability_data: dict, user_timezone: str = 'UTC') -> dict:
    """
    LEGACY: Convert availability times for display in user's timezone (with double conversion bug)
    Args:
        availability_data: Availability record with time fields
        user_timezone: Target timezone for display
    Returns:
        Availability data with additional display time fields
    """
    try:
        # Extract original timezone and times
        original_timezone = availability_data.get('time_zone', 'UTC')
        start_time = availability_data.get('start_time')
        end_time = availability_data.get('end_time')
        instance_date = availability_data.get('instance_date') or availability_data.get('specific_date')

        if not start_time or not end_time:
            return availability_data

        # Use today's date if no specific date provided
        if not instance_date:
            instance_date = datetime.now().strftime('%Y-%m-%d')

        # BUG: This assumes times are stored as UTC, but they're actually local
        display_start = convert_from_utc(start_time, user_timezone, instance_date)
        display_end = convert_from_utc(end_time, user_timezone, instance_date)

        # Add display fields to the data
        enhanced_data = availability_data.copy()
        enhanced_data.update({
            'display_start_time': display_start,
            'display_end_time': display_end,
            'display_timezone': user_timezone,
            'original_timezone': original_timezone,
            'display_time_range': f"{display_start}-{display_end} {format_timezone_display(user_timezone, instance_date)}"
        })

        # Standardize day_of_week for display
        if 'day_of_week' in availability_data:
            day_info = standardize_weekday_display(availability_data['day_of_week'], 'python')
            enhanced_data['day_of_week_standardized'] = day_info

        return enhanced_data

    except Exception as e:
        print(f"Error converting availability display times: {e}")
        return availability_data


def convert_availability_display_times(availability_data: dict, user_timezone: str = 'UTC') -> dict:
    """
    Convert availability times for display in user's timezone
    Uses feature flag to switch between legacy and fixed conversion logic

    Args:
        availability_data: Availability record with time fields
        user_timezone: Target timezone for display
    Returns:
        Availability data with additional display time fields
    """
    try:
        # Check feature flag - always prefer the fixed version for new implementation
        from flask import current_app
        timezone_fix_enabled = True  # Force enable the fix
        try:
            if current_app:
                timezone_fix_enabled = current_app.config.get('TIMEZONE_FIX_ENABLED', True)
        except:
            timezone_fix_enabled = True

        if timezone_fix_enabled:
            print(f"🚀 Using FIXED timezone conversion for {availability_data.get('id', 'unknown')}")
            return convert_availability_display_times_v2(availability_data, user_timezone)
        else:
            print(f"🔄 Using LEGACY timezone conversion for {availability_data.get('id', 'unknown')}")
            return convert_availability_display_times_legacy(availability_data, user_timezone)
    except Exception as e:
        # Fallback to fixed version for safety
        print(f"Feature flag check failed, using fixed version: {e}")
        return convert_availability_display_times_v2(availability_data, user_timezone)


def validate_and_convert_weekday_input(weekday_input: any, expected_format: str = 'javascript') -> dict:
    """
    Validate and convert weekday input from frontend

    Args:
        weekday_input: Weekday value from frontend (could be string, int, or list)
        expected_format: Expected input format ('javascript' or 'python')

    Returns:
        Dict with validation results and converted values
    """
    result = {
        'valid': False,
        'python_weekdays': [],
        'javascript_weekdays': [],
        'names': [],
        'errors': []
    }

    try:
        # Handle different input types
        if isinstance(weekday_input, (list, tuple)):
            weekdays = [int(w) for w in weekday_input if str(w).isdigit()]
        elif isinstance(weekday_input, (int, str)):
            weekdays = [int(weekday_input)] if str(weekday_input).isdigit() else []
        else:
            result['errors'].append(f"Invalid weekday input type: {type(weekday_input)}")
            return result

        if not weekdays:
            result['errors'].append("No valid weekday values provided")
            return result

        # Process each weekday
        for weekday in weekdays:
            if expected_format == 'javascript':
                if 0 <= weekday <= 6:
                    python_day = js_to_python_weekday(weekday)
                    js_day = weekday
                else:
                    result['errors'].append(f"Invalid JavaScript weekday: {weekday}")
                    continue
            else:  # python format
                if 0 <= weekday <= 6:
                    python_day = weekday
                    js_day = python_to_js_weekday(weekday)
                else:
                    result['errors'].append(f"Invalid Python weekday: {weekday}")
                    continue

            day_info = standardize_weekday_display(python_day, 'python')
            result['python_weekdays'].append(python_day)
            result['javascript_weekdays'].append(js_day)
            result['names'].append(day_info['name'])

        result['valid'] = len(result['python_weekdays']) > 0
        return result

    except Exception as e:
        result['errors'].append(f"Error processing weekday input: {str(e)}")
        return result


def convert_12h_to_24h(time_12h: str) -> str:
    """
    Convert 12-hour time format to 24-hour format

    Args:
        time_12h: Time in 12-hour format (e.g., "7:00 PM", "11:30 AM")

    Returns:
        Time in 24-hour format (e.g., "19:00", "11:30")
    """
    try:
        # Handle various formats
        time_12h = time_12h.strip().upper()

        # Parse time with AM/PM
        if 'AM' in time_12h or 'PM' in time_12h:
            dt = datetime.strptime(time_12h, '%I:%M %p')
            return dt.strftime('%H:%M')
        else:
            # Assume it's already 24-hour format
            return time_12h.split()[0]  # Remove any extra text
    except Exception as e:
        print(f"Error converting 12h to 24h time: {e}")
        return "00:00"  # Default fallback


def smart_parse_session_datetime(payload_data: dict, user_timezone: str) -> dict:
    """
    Intelligently parse session datetime considering user intent and Zoom API requirements

    This function addresses the timezone issue where users select a date + time but
    the frontend sends midnight UTC, causing incorrect session scheduling.

    Args:
        payload_data: Session creation payload containing:
            - scheduledDate: ISO datetime string (may be midnight UTC for date-only selections)
            - displayStartTime: User's intended start time (e.g., "7:00 PM")
            - displayEndTime: User's intended end time (e.g., "8:00 PM")
            - userTimezone: User's timezone (e.g., "America/Chicago")
        user_timezone: Sanitized user timezone string

    Returns:
        Dict containing:
            - utc_datetime: Proper UTC datetime for database storage
            - zoom_start_time: ISO string with timezone offset for Zoom API
            - zoom_timezone: Timezone for Zoom API
            - display_timezone: Timezone for user display
            - original_intent: Description of detected user intent
    """
    result = {
        'utc_datetime': None,
        'zoom_start_time': None,
        'zoom_timezone': user_timezone,
        'display_timezone': user_timezone,
        'original_intent': 'unknown',
        'errors': []
    }

    try:
        scheduled_date = payload_data.get('scheduledDate', '')
        display_start_time = payload_data.get('displayStartTime', '')
        display_end_time = payload_data.get('displayEndTime', '')
        user_tz_from_payload = payload_data.get('userTimezone', user_timezone)

        print(f"🔍 Smart parsing session datetime:")
        print(f"   scheduledDate: {scheduled_date}")
        print(f"   displayStartTime: {display_start_time}")
        print(f"   userTimezone: {user_tz_from_payload}")

        # Parse the scheduled date
        if scheduled_date.endswith('Z'):
            # Remove Z suffix for processing
            scheduled_date = scheduled_date[:-1]

        parsed_dt = datetime.fromisoformat(scheduled_date)

        # Check if this looks like a date-only selection (midnight time)
        is_midnight_selection = (parsed_dt.hour == 0 and parsed_dt.minute == 0 and
                               parsed_dt.second == 0 and display_start_time)

        if is_midnight_selection:
            # User selected a date + display time - this is the problematic scenario
            result['original_intent'] = 'date_plus_display_time'

            # Extract date and use display time
            date_part = parsed_dt.strftime('%Y-%m-%d')
            time_24h = convert_12h_to_24h(display_start_time)

            print(f"   🎯 Detected date-only selection with display time")
            print(f"   📅 Date: {date_part}")
            print(f"   ⏰ Display time: {display_start_time} -> {time_24h}")

            # Create local datetime string
            local_datetime_str = f"{date_part}T{time_24h}:00"

            # Create timezone-aware datetime
            user_tz = pytz.timezone(user_tz_from_payload)
            local_dt = datetime.fromisoformat(local_datetime_str)
            localized_dt = user_tz.localize(local_dt)

            # Convert to UTC for storage
            utc_dt = localized_dt.astimezone(pytz.UTC)
            result['utc_datetime'] = utc_dt.replace(tzinfo=None)  # Naive UTC for database

            # Create timezone-aware ISO string for Zoom
            result['zoom_start_time'] = localized_dt.isoformat()  # "2025-09-24T19:00:00-05:00"
            result['zoom_timezone'] = user_tz_from_payload

            print(f"   ✅ Local time: {localized_dt.isoformat()}")
            print(f"   ✅ UTC storage: {result['utc_datetime'].isoformat()}")
            print(f"   ✅ Zoom format: {result['zoom_start_time']}")

        else:
            # Time already included or no display time - process normally
            result['original_intent'] = 'datetime_with_time'

            # Handle timezone offset in original string
            if '+' in scheduled_date[-6:] or '-' in scheduled_date[-6:]:
                # Timezone offset already present
                full_dt = datetime.fromisoformat(payload_data['scheduledDate'])
                if full_dt.tzinfo:
                    utc_dt = full_dt.astimezone(pytz.UTC)
                    result['utc_datetime'] = utc_dt.replace(tzinfo=None)
                    result['zoom_start_time'] = payload_data['scheduledDate']
                else:
                    # No timezone info, treat as user timezone
                    user_tz = pytz.timezone(user_tz_from_payload)
                    localized_dt = user_tz.localize(parsed_dt)
                    utc_dt = localized_dt.astimezone(pytz.UTC)
                    result['utc_datetime'] = utc_dt.replace(tzinfo=None)
                    result['zoom_start_time'] = localized_dt.isoformat()
            else:
                # No timezone offset, assume user timezone
                user_tz = pytz.timezone(user_tz_from_payload)
                localized_dt = user_tz.localize(parsed_dt)
                utc_dt = localized_dt.astimezone(pytz.UTC)
                result['utc_datetime'] = utc_dt.replace(tzinfo=None)
                result['zoom_start_time'] = localized_dt.isoformat()

            result['zoom_timezone'] = user_tz_from_payload

            print(f"   ⏰ Normal datetime processing completed")
            print(f"   ✅ UTC storage: {result['utc_datetime'].isoformat()}")
            print(f"   ✅ Zoom format: {result['zoom_start_time']}")

        return result

    except Exception as e:
        error_msg = f"Error in smart datetime parsing: {str(e)}"
        print(f"❌ {error_msg}")
        result['errors'].append(error_msg)

        # Fallback to original parsing logic
        try:
            parsed_dt = datetime.fromisoformat(scheduled_date.replace('Z', ''))
            result['utc_datetime'] = parsed_dt
            result['zoom_start_time'] = parsed_dt.isoformat() + 'Z'
            result['zoom_timezone'] = 'UTC'
            result['original_intent'] = 'fallback_parsing'
        except Exception as fallback_error:
            result['errors'].append(f"Fallback parsing failed: {str(fallback_error)}")

        return result