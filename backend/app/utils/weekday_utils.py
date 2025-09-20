"""
Weekday Conversion Utilities

This module provides standardized conversion between different weekday formats:
- JavaScript/Frontend: 0=Sunday, 1=Monday, ..., 6=Saturday
- Python/Backend: 0=Monday, 1=Tuesday, ..., 6=Sunday

Ensures consistent day-of-week handling across the entire application.
"""

from typing import List, Dict, Union, Any
from flask import current_app


def js_to_python_weekday(js_weekday: int) -> int:
    """
    Convert JavaScript weekday format to Python weekday format

    Args:
        js_weekday: JavaScript format (0=Sunday, 1=Monday, ..., 6=Saturday)

    Returns:
        Python format (0=Monday, 1=Tuesday, ..., 6=Sunday)

    Examples:
        js_to_python_weekday(0) -> 6  # Sunday: JS=0, Python=6
        js_to_python_weekday(1) -> 0  # Monday: JS=1, Python=0
        js_to_python_weekday(4) -> 3  # Thursday: JS=4, Python=3
    """
    if not isinstance(js_weekday, int) or js_weekday < 0 or js_weekday > 6:
        raise ValueError(f"Invalid JavaScript weekday: {js_weekday}. Must be 0-6.")

    # Convert: JS Sunday(0) -> Python Sunday(6), JS Monday(1) -> Python Monday(0), etc.
    python_weekday = (js_weekday - 1) % 7

    current_app.logger.debug(f"🔄 Weekday conversion: JS {js_weekday} -> Python {python_weekday}")
    return python_weekday


def python_to_js_weekday(python_weekday: int) -> int:
    """
    Convert Python weekday format to JavaScript weekday format

    Args:
        python_weekday: Python format (0=Monday, 1=Tuesday, ..., 6=Sunday)

    Returns:
        JavaScript format (0=Sunday, 1=Monday, ..., 6=Saturday)

    Examples:
        python_to_js_weekday(6) -> 0  # Sunday: Python=6, JS=0
        python_to_js_weekday(0) -> 1  # Monday: Python=0, JS=1
        python_to_js_weekday(3) -> 4  # Thursday: Python=3, JS=4
    """
    if not isinstance(python_weekday, int) or python_weekday < 0 or python_weekday > 6:
        raise ValueError(f"Invalid Python weekday: {python_weekday}. Must be 0-6.")

    # Convert: Python Monday(0) -> JS Monday(1), Python Sunday(6) -> JS Sunday(0), etc.
    js_weekday = (python_weekday + 1) % 7

    current_app.logger.debug(f"🔄 Weekday conversion: Python {python_weekday} -> JS {js_weekday}")
    return js_weekday


def validate_and_convert_weekday_input(
    weekdays: Union[List[int], List[str], int, str],
    input_format: str = 'javascript'
) -> Dict[str, Any]:
    """
    Validate and convert weekday input to Python format

    Args:
        weekdays: Single weekday or list of weekdays to convert
        input_format: 'javascript' or 'python' - the format of input weekdays

    Returns:
        Dict with validation results and converted weekdays
        {
            'valid': bool,
            'python_weekdays': List[int],
            'original_input': Any,
            'input_format': str,
            'errors': List[str]
        }
    """
    result = {
        'valid': False,
        'python_weekdays': [],
        'original_input': weekdays,
        'input_format': input_format,
        'errors': []
    }

    try:
        # Normalize input to list
        if isinstance(weekdays, (int, str)):
            weekday_list = [weekdays]
        elif isinstance(weekdays, list):
            weekday_list = weekdays
        else:
            result['errors'].append(f"Invalid weekdays type: {type(weekdays)}. Must be int, str, or list.")
            return result

        # Convert and validate each weekday
        converted_weekdays = []
        for weekday in weekday_list:
            try:
                # Convert to int if string
                if isinstance(weekday, str):
                    weekday = int(weekday)

                # Validate range
                if not isinstance(weekday, int) or weekday < 0 or weekday > 6:
                    result['errors'].append(f"Invalid weekday value: {weekday}. Must be 0-6.")
                    continue

                # Convert based on input format
                if input_format.lower() == 'javascript':
                    python_weekday = js_to_python_weekday(weekday)
                elif input_format.lower() == 'python':
                    python_weekday = weekday  # Already in Python format
                else:
                    result['errors'].append(f"Invalid input_format: {input_format}. Must be 'javascript' or 'python'.")
                    return result

                converted_weekdays.append(python_weekday)

            except ValueError as e:
                result['errors'].append(f"Error converting weekday {weekday}: {str(e)}")

        if not result['errors'] and converted_weekdays:
            result['valid'] = True
            result['python_weekdays'] = sorted(list(set(converted_weekdays)))  # Remove duplicates and sort

            current_app.logger.info(f"✅ Weekday conversion successful:")
            current_app.logger.info(f"   Input ({input_format}): {weekdays}")
            current_app.logger.info(f"   Output (python): {result['python_weekdays']}")

    except Exception as e:
        result['errors'].append(f"Unexpected error during weekday conversion: {str(e)}")

    return result


def get_weekday_names(weekdays: List[int], format_type: str = 'python') -> List[str]:
    """
    Get human-readable weekday names for a list of weekdays

    Args:
        weekdays: List of weekday numbers
        format_type: 'python' or 'javascript' - format of input weekdays

    Returns:
        List of weekday names (e.g., ['Monday', 'Tuesday'])
    """
    # Mapping for both formats
    if format_type.lower() == 'python':
        weekday_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    elif format_type.lower() == 'javascript':
        weekday_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    else:
        raise ValueError(f"Invalid format_type: {format_type}. Must be 'python' or 'javascript'.")

    try:
        return [weekday_names[day] for day in weekdays if 0 <= day <= 6]
    except IndexError as e:
        raise ValueError(f"Invalid weekday numbers: {weekdays}. Must be 0-6 for {format_type} format.")


# Convenience functions for common use cases
def convert_js_weekdays_to_python(js_weekdays: List[int]) -> List[int]:
    """Convert a list of JavaScript weekdays to Python format"""
    validation = validate_and_convert_weekday_input(js_weekdays, 'javascript')
    if not validation['valid']:
        raise ValueError(f"Invalid JavaScript weekdays: {validation['errors']}")
    return validation['python_weekdays']


def convert_python_weekdays_to_js(python_weekdays: List[int]) -> List[int]:
    """Convert a list of Python weekdays to JavaScript format"""
    try:
        return [python_to_js_weekday(day) for day in python_weekdays]
    except ValueError as e:
        raise ValueError(f"Invalid Python weekdays: {str(e)}")