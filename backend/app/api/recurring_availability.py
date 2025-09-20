"""
API endpoints for recurring availability management

This module provides REST API endpoints for:
- Creating recurring availability patterns
- Managing recurring availability series  
- Checking for session conflicts
- Updating/deleting recurring series
- Managing exception dates
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from typing import Dict, Any

from app.services.recurring_availability_service import RecurringAvailabilityService
from app.models import User, Availability, AvailabilityException
from app import db

# Import timezone utilities
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../..'))
from timezone_utils import convert_to_utc, convert_from_utc, validate_timezone

# Create blueprint for recurring availability routes
recurring_availability_bp = Blueprint('recurring_availability', __name__)


@recurring_availability_bp.route('/availability/recurring', methods=['POST'])
def create_recurring_availability():
    """
    Create a new recurring availability pattern
    
    Expected JSON payload:
    {
        "tutorId": "tutor_12345",
        "dayOfWeek": 1,  # Monday
        "startTime": "09:00",
        "endTime": "10:00", 
        "recurrenceType": "weekly",
        "recurrenceDays": [1, 2, 3, 4, 5],  # Mon-Fri
        "recurrenceEndDate": "2024-12-31T23:59:59",  # Optional
        "courseId": "course_123",  # Optional
        "timeZone": "UTC"
    }
    
    Returns:
        JSON response with success status and generated availability IDs
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['tutorId', 'startTime', 'endTime']
        missing_fields = []
        for field in required_fields:
            if field not in data or not data[field]:
                missing_fields.append(field)
        
        # Check for recurrence days (either dayOfWeek or recurrenceDays required)
        if 'recurrenceDays' not in data or not data['recurrenceDays']:
            if 'dayOfWeek' not in data:
                missing_fields.append('recurrenceDays (or dayOfWeek)')
        
        if missing_fields:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing_fields)}',
                'missingFields': missing_fields
            }), 400
        
        # Extract timezone information from headers first, then fallback to data payload
        user_timezone = request.headers.get('X-Timezone', data.get('timeZone', 'UTC'))
        browser_locale = request.headers.get('X-Browser-Locale', 'en-US')
        
        # Sanitize and validate timezone
        from timezone_utils import sanitize_timezone_input, validate_time_range
        user_timezone = sanitize_timezone_input(user_timezone)

        if not validate_timezone(user_timezone):
            return jsonify({
                'success': False,
                'error': f'Invalid timezone: {user_timezone}'
            }), 400
        
        # Parse start date if provided, otherwise use today
        start_date = None
        if data.get('startDate'):
            try:
                start_date = datetime.fromisoformat(data['startDate']).date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid startDate format. Use YYYY-MM-DD',
                    'field': 'startDate',
                    'providedValue': data.get('startDate')
                }), 400
        
        # CRITICAL FIX: Frontend already sends Python weekday format - no conversion needed!
        # Previous assumption that frontend sends JavaScript format was incorrect

        # Validate recurrenceDays are valid Python weekdays (0-6)
        recurrence_days_input = data.get('recurrenceDays', [])

        # Ensure it's a list
        if not isinstance(recurrence_days_input, list):
            return jsonify({
                'success': False,
                'error': 'recurrenceDays must be a list',
                'field': 'recurrenceDays',
                'providedValue': recurrence_days_input
            }), 400

        # Validate each weekday value
        python_recurrence_days = []
        for day in recurrence_days_input:
            if not isinstance(day, int) or not (0 <= day <= 6):
                return jsonify({
                    'success': False,
                    'error': f'Invalid weekday value: {day}. Must be 0-6 (Python format: 0=Monday, 6=Sunday)',
                    'field': 'recurrenceDays',
                    'providedValue': recurrence_days_input
                }), 400
            python_recurrence_days.append(day)

        # Handle dayOfWeek - use first day from recurrenceDays if dayOfWeek not provided
        day_of_week = data.get('dayOfWeek')
        if day_of_week is None and python_recurrence_days:
            day_of_week = python_recurrence_days[0]  # Use first day from recurrenceDays
        elif day_of_week is not None:
            # Validate dayOfWeek is also in Python format
            if not isinstance(day_of_week, int) or not (0 <= day_of_week <= 6):
                return jsonify({
                    'success': False,
                    'error': f'Invalid dayOfWeek value: {day_of_week}. Must be 0-6 (Python format: 0=Monday, 6=Sunday)',
                    'field': 'dayOfWeek',
                    'providedValue': day_of_week
                }), 400

        # FIXED: Add comprehensive logging for debugging (no conversion happening)
        current_app.logger.info(f"✅ WEEKDAY VALIDATION (Python format):")
        current_app.logger.info(f"   Frontend recurrenceDays (Python format): {recurrence_days_input}")
        current_app.logger.info(f"   Validated recurrenceDays (Python format): {python_recurrence_days}")
        current_app.logger.info(f"   Frontend dayOfWeek (Python format): {data.get('dayOfWeek')}")
        current_app.logger.info(f"   Final dayOfWeek (Python format): {day_of_week}")

        # Convert to day names for clear logging
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        if python_recurrence_days:
            day_name_list = [day_names[d] for d in python_recurrence_days]
            current_app.logger.info(f"   Weekday names: {day_name_list}")
        if day_of_week is not None:
            current_app.logger.info(f"   Primary day: {day_names[day_of_week]}")

        # Validate converted day_of_week is a valid Python weekday (0-6, Monday=0, Sunday=6)
        if not isinstance(day_of_week, int) or not (0 <= day_of_week <= 6):
            return jsonify({
                'success': False,
                'error': 'Invalid dayOfWeek after conversion. Must be an integer between 0-6 (Monday=0, Sunday=6 in Python format)',
                'field': 'dayOfWeek',
                'providedValue': day_of_week,
                'originalValue': data.get('dayOfWeek')
            }), 400

        current_app.logger.info(f"🔄 Weekday conversion: Frontend {data.get('recurrenceDays')} -> Python {python_recurrence_days}")
        current_app.logger.info(f"🔄 Day of week conversion: Frontend {data.get('dayOfWeek')} -> Python {day_of_week}")
        
        # Parse optional end date
        recurrence_end_date = None
        if data.get('recurrenceEndDate'):
            recurrence_end_date = datetime.fromisoformat(
                data['recurrenceEndDate'].replace('Z', '+00:00')
            )
        
        # Validate time range with timezone context
        date_str = data['startDate'] if data.get('startDate') else datetime.now().strftime('%Y-%m-%d')

        time_validation = validate_time_range(data['startTime'], data['endTime'], date_str, user_timezone)
        if not time_validation['valid']:
            return jsonify({
                'success': False,
                'error': 'Invalid time range',
                'details': time_validation['errors']
            }), 400

        # Convert user's local times to UTC for storage
        utc_start_time = convert_to_utc(data['startTime'], user_timezone, date_str)
        utc_end_time = convert_to_utc(data['endTime'], user_timezone, date_str)
        
        # Store original times for display purposes
        original_start_time = data['startTime']
        original_end_time = data['endTime']
        
        # FIXED: Handle new UTC-first approach with original timezone tracking
        # Extract original timezone from frontend (new approach)
        original_user_timezone = data.get('originalTimezone', user_timezone)
        storage_timezone = data.get('timeZone', 'UTC')  # Frontend now sends 'UTC'

        # If frontend is sending UTC times with originalTimezone
        if storage_timezone == 'UTC' and 'originalTimezone' in data:
            # Times are already in UTC from frontend conversion
            final_start_time = data['startTime']  # Already UTC
            final_end_time = data['endTime']      # Already UTC
            final_timezone = 'UTC'               # Store as UTC
            current_app.logger.info(f"🌍 Using frontend UTC times: {final_start_time}-{final_end_time} UTC (original: {original_user_timezone})")
        else:
            # Legacy: Convert user local times to UTC (old behavior)
            final_start_time = utc_start_time
            final_end_time = utc_end_time
            final_timezone = 'UTC'  # Always store as UTC now
            current_app.logger.info(f"🌍 Converting local times to UTC: {data['startTime']}-{data['endTime']} {user_timezone} -> {final_start_time}-{final_end_time} UTC")

        # Create recurring availability with timezone-aware data
        result = RecurringAvailabilityService.create_recurring_availability(
            tutor_id=data['tutorId'],
            day_of_week=day_of_week,                  # ✅ Use computed day_of_week
            start_time=final_start_time,              # ✅ UTC time for storage
            end_time=final_end_time,                  # ✅ UTC time for storage
            start_date=start_date,
            recurrence_type=data.get('recurrenceType', 'weekly'),
            recurrence_days=python_recurrence_days or [day_of_week],  # ✅ Use converted Python format weekdays
            recurrence_end_date=recurrence_end_date,
            course_id=data.get('courseId'),
            time_zone=final_timezone,                 # ✅ Always UTC for storage
            original_timezone=original_user_timezone, # ✅ Track user's original timezone
            original_start_time=original_start_time,  # ✅ User's local time
            original_end_time=original_end_time       # ✅ User's local time
        )
        
        if result['success']:
            # FIXED: Add comprehensive response validation and debugging info
            enhanced_result = {
                **result,
                'debug_info': {
                    'request_data': {
                        'original_recurrence_days_python': data.get('recurrenceDays', []),
                        'original_day_of_week_python': data.get('dayOfWeek'),
                        'original_start_date': data.get('startDate')
                    },
                    'validated_data': {
                        'python_recurrence_days': python_recurrence_days,
                        'python_day_of_week': day_of_week,
                        'stored_start_date': start_date.isoformat() if start_date else None
                    },
                    'validation_checks': {
                        'start_date_stored': start_date is not None,
                        'weekday_format': 'python_native',
                        'conversion_skipped': True,
                        'boundary_enforcement_enabled': True
                    }
                }
            }

            # FIXED: Add response logging for audit trail
            current_app.logger.info(f"✅ PATTERN CREATION SUCCESS:")
            current_app.logger.info(f"   Pattern ID: {result['parent_availability_id']}")
            current_app.logger.info(f"   Python weekdays (no conversion): {python_recurrence_days}")
            current_app.logger.info(f"   Start date boundary: {start_date}")
            current_app.logger.info(f"   End date boundary: {recurrence_end_date}")

            # Log weekday names for clarity
            if python_recurrence_days:
                day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                weekday_names = [day_names[d] for d in python_recurrence_days]
                current_app.logger.info(f"   Weekday names: {weekday_names}")

            return jsonify(enhanced_result), 201
        else:
            # PHASE 4: Enhanced error response with debugging context
            enhanced_error = {
                **result,
                'debug_context': {
                    'request_weekdays': data.get('recurrenceDays', []),
                    'conversion_attempted': python_recurrence_days if 'python_recurrence_days' in locals() else None,
                    'start_date_provided': data.get('startDate'),
                    'timezone_used': user_timezone
                }
            }

            current_app.logger.error(f"❌ PATTERN CREATION FAILED:")
            current_app.logger.error(f"   Error: {result.get('error')}")
            current_app.logger.error(f"   Request data: {data}")

            return jsonify(enhanced_error), 400
            
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': f'Invalid data format: {str(e)}',
            'type': 'validation_error',
            'requestData': data
        }), 400
    except ImportError as e:
        return jsonify({
            'success': False,
            'error': f'Missing timezone utilities: {str(e)}',
            'type': 'import_error'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}',
            'type': 'server_error',
            'requestData': data
        }), 500


@recurring_availability_bp.route('/availability/recurring/<availability_id>', methods=['PUT'])
def update_recurring_series(availability_id):
    """
    Update a recurring availability series
    
    Expected JSON payload:
    {
        "startTime": "10:00",
        "endTime": "11:00",
        "updateFutureOnly": true,
        "courseId": "course_456"
    }
    """
    try:
        data = request.get_json()
        
        # Filter valid update fields
        valid_fields = ['start_time', 'end_time', 'course_id', 'time_zone', 'available']
        updates = {}
        
        field_mapping = {
            'startTime': 'start_time',
            'endTime': 'end_time',
            'courseId': 'course_id',
            'timeZone': 'time_zone',
            'available': 'available'
        }
        
        for frontend_field, backend_field in field_mapping.items():
            if frontend_field in data:
                updates[backend_field] = data[frontend_field]
        
        if not updates:
            return jsonify({
                'success': False,
                'error': 'No valid fields to update'
            }), 400
        
        update_future_only = data.get('updateFutureOnly', True)
        
        result = RecurringAvailabilityService.update_recurring_series(
            parent_availability_id=availability_id,
            updates=updates,
            update_future_only=update_future_only
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@recurring_availability_bp.route('/availability/recurring/<availability_id>', methods=['DELETE'])
def delete_recurring_series(availability_id):
    """
    Delete a recurring availability series
    
    Query parameters:
        deleteFutureOnly: boolean (default: true)
    """
    try:
        delete_future_only = request.args.get('deleteFutureOnly', 'true').lower() == 'true'
        
        result = RecurringAvailabilityService.delete_recurring_series(
            parent_availability_id=availability_id,
            delete_future_only=delete_future_only
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@recurring_availability_bp.route('/availability/<availability_id>/conflicts', methods=['GET'])
def check_availability_conflicts(availability_id):
    """
    Check for session conflicts on a specific availability slot
    """
    try:
        result = RecurringAvailabilityService.check_slot_conflicts(availability_id)
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@recurring_availability_bp.route('/availability/recurring/<availability_id>/exceptions', methods=['POST'])
def add_exception_date(availability_id):
    """
    Add an exception date to skip in the recurring pattern
    
    Expected JSON payload:
    {
        "exceptionDate": "2024-03-15"
    }
    """
    try:
        data = request.get_json()
        
        if 'exceptionDate' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: exceptionDate'
            }), 400
        
        result = RecurringAvailabilityService.add_exception_date(
            parent_availability_id=availability_id,
            exception_date=data['exceptionDate']
        )
        
        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@recurring_availability_bp.route('/tutors/<tutor_id>/availability', methods=['GET'])
@jwt_required()
def get_tutor_availability_with_conflicts(tutor_id):
    """
    Get all availability for a tutor with conflict information

    Query parameters:
        startDate: ISO date string (default: today)
        endDate: ISO date string (default: 3 months from today)
        pattern_id: Filter by specific recurring pattern ID (optional, for testing)
    """
    try:
        # Authentication and authorization checks (matching old availability.py route)
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if current user can access this tutor's availability
        if current_user.account_type not in ['admin'] and current_user_id != tutor_id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Verify tutor exists and has tutor role
        tutor = User.query.get(tutor_id)
        if not tutor or not tutor.has_role('tutor'):
            return jsonify({'error': 'User does not have tutor role'}), 404

        # Parse date parameters
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')
        pattern_id = request.args.get('pattern_id')  # Optional filter for testing

        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str).date()
        else:
            start_date = datetime.utcnow().date()

        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str).date()
        else:
            end_date = start_date + timedelta(days=90)  # 3 months

        # Extract user timezone for timezone-aware responses
        from timezone_utils import get_user_timezone_from_request
        user_timezone = get_user_timezone_from_request(request)

        # Get availability with conflict information
        availability_data = RecurringAvailabilityService.get_availability_with_conflicts(
            tutor_id=tutor_id,
            start_date=start_date,
            end_date=end_date,
            user_timezone=user_timezone,
            pattern_id=pattern_id  # Pass pattern filter
        )
        
        return jsonify({
            'success': True,
            'availability': availability_data,
            'dateRange': {
                'startDate': start_date.isoformat(),
                'endDate': end_date.isoformat()
            }
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': f'Invalid date format: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@recurring_availability_bp.route('/availability/<availability_id>/single', methods=['PUT'])
def update_single_availability_instance(availability_id):
    """
    Update a single availability instance (not the entire series)
    
    Expected JSON payload:
    {
        "startTime": "10:00",
        "endTime": "11:00",
        "available": true,
        "courseId": "course_456",
        "editScope": "single" // or "series"
    }
    """
    try:
        data = request.get_json()
        edit_scope = data.get('editScope', 'single')
        
        print(f"📅 Single instance edit request - Availability ID: {availability_id}, Edit Scope: {edit_scope}")
        
        # Get the availability instance
        availability = Availability.query.get(availability_id)
        if not availability:
            return jsonify({
                'success': False,
                'error': 'Availability slot not found'
            }), 404
        
        # Extract user timezone for logging and responses
        from timezone_utils import get_user_timezone_from_request
        user_timezone = get_user_timezone_from_request(request)

        print(f"📅 Found availability: {availability.to_dict(user_timezone=user_timezone)}")
        
        # Check if it's editable (no sessions booked)
        if not availability.is_editable():
            return jsonify({
                'success': False,
                'error': 'Cannot edit availability slot with existing sessions'
            }), 400
        
        # Update allowed fields
        field_mapping = {
            'startTime': 'start_time',
            'endTime': 'end_time', 
            'courseId': 'course_id',
            'timeZone': 'time_zone',
            'available': 'available'
        }
        
        updated_fields = []
        for frontend_field, backend_field in field_mapping.items():
            if frontend_field in data:
                setattr(availability, backend_field, data[frontend_field])
                updated_fields.append(frontend_field)
        
        if updated_fields:
            availability.updated_at = datetime.utcnow()
            db.session.commit()
            
            # Create descriptive message based on edit scope
            if edit_scope == 'single':
                message = 'Single time slot updated successfully'
            else:
                message = 'Time slot updated successfully'
            
            print(f"📅 Successfully updated availability {availability_id}: {updated_fields}")
            
            # Extract user timezone for response
            from timezone_utils import get_user_timezone_from_request
            user_timezone = get_user_timezone_from_request(request)

            return jsonify({
                'success': True,
                'message': message,
                'updatedFields': updated_fields,
                'editScope': edit_scope,
                'availability': availability.to_dict(user_timezone=user_timezone)
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'No valid fields to update'
            }), 400
            
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500


@recurring_availability_bp.route('/availability/<availability_id>/single', methods=['DELETE'])
def delete_single_availability_instance(availability_id):
    """
    Delete a single availability instance (not the entire series)
    Handles both real availability IDs and virtual instance IDs
    """
    try:
        print(f"🗑️ Single instance delete request - Availability ID: {availability_id}")

        # Check if this is a virtual instance ID (format: base_id_date)
        base_availability_id = availability_id
        instance_date = None

        if '_' in availability_id and len(availability_id.split('_')[-1]) == 10:  # Check for date suffix
            # This appears to be a virtual instance ID
            parts = availability_id.rsplit('_', 1)
            if len(parts) == 2:
                base_availability_id = parts[0]
                instance_date = parts[1]
                print(f"🔍 Detected virtual instance: base_id={base_availability_id}, date={instance_date}")

        availability = Availability.query.get(base_availability_id)
        if not availability:
            return jsonify({
                'success': False,
                'error': 'Availability slot not found',
                'details': f'ID {base_availability_id} does not exist'
            }), 404
        
        # Extract user timezone for logging
        from timezone_utils import get_user_timezone_from_request
        user_timezone = get_user_timezone_from_request(request)

        print(f"🗑️ Found availability to delete: {availability.to_dict(user_timezone=user_timezone)}")

        # If this is a virtual instance, handle it differently
        if instance_date:
            # For virtual instances of recurring patterns
            if availability.is_recurring:
                try:
                    # Parse the instance date to create a proper Date object
                    exception_date = datetime.strptime(instance_date, '%Y-%m-%d').date()

                    # Check if an exception already exists for this date
                    existing_exception = AvailabilityException.query.filter_by(
                        parent_availability_id=base_availability_id,
                        exception_date=exception_date
                    ).first()

                    if existing_exception:
                        return jsonify({
                            'success': True,
                            'message': f'Instance on {instance_date} was already removed',
                            'action': 'already_excepted'
                        }), 200

                    # Create a new deletion exception
                    exception = AvailabilityException.create_deletion_exception(
                        parent_availability_id=base_availability_id,
                        exception_date=exception_date,
                        created_by=None,  # Will be updated when JWT authentication is added
                        reason=f'Virtual instance deleted for date {instance_date}'
                    )

                    db.session.add(exception)
                    db.session.commit()

                    return jsonify({
                        'success': True,
                        'message': f'Removed instance on {instance_date} from recurring pattern',
                        'action': 'exception_added',
                        'exception_id': exception.id
                    }), 200

                except ValueError as e:
                    return jsonify({
                        'success': False,
                        'error': f'Invalid date format in instance ID: {instance_date}',
                        'details': str(e)
                    }), 400
            else:
                # Non-recurring with instance_date shouldn't happen
                return jsonify({
                    'success': False,
                    'error': 'Invalid operation: Cannot delete instance of non-recurring slot'
                }), 400
        else:
            # For real availability slots (not virtual instances)
            # Check if it's editable (no sessions booked)
            if not availability.is_editable():
                return jsonify({
                    'success': False,
                    'error': 'Cannot delete availability slot with existing sessions'
                }), 400

            # Delete the actual availability record
            db.session.delete(availability)
            db.session.commit()

            return jsonify({
                'success': True,
                'message': 'Availability slot deleted successfully',
                'action': 'deleted'
            }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@recurring_availability_bp.route('/tutors/<tutor_id>/availability/instances', methods=['GET'])
@jwt_required()
def get_tutor_availability_instances(tutor_id):
    """
    Get tutor's availability with specific date instances generated from recurring patterns

    Query parameters:
        startDate: ISO date string (default: today)
        endDate: ISO date string (default: 90 days from start)
        daysAhead: Number of days to generate instances for (default: 90)
    """
    try:
        # Authentication and authorization checks
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return jsonify({'error': 'User not found'}), 404

        # Check if current user can access this tutor's availability
        if current_user.account_type not in ['admin'] and current_user_id != tutor_id:
            return jsonify({'error': 'Access denied'}), 403

        # Verify tutor exists and has tutor role
        tutor = User.query.get(tutor_id)
        if not tutor or not tutor.has_role('tutor'):
            return jsonify({'error': 'User does not have tutor role'}), 404

        # Parse query parameters with strict date boundary validation
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')
        days_ahead = int(request.args.get('daysAhead', 90))

        start_date = None
        end_date = None

        try:
            if start_date_str:
                start_date = datetime.fromisoformat(start_date_str).date()
            if end_date_str:
                end_date = datetime.fromisoformat(end_date_str).date()
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': f'Invalid date format. Use YYYY-MM-DD format. Error: {str(e)}'
            }), 400

        # Validate date range logic
        if start_date and end_date and start_date > end_date:
            return jsonify({
                'success': False,
                'error': 'Start date cannot be after end date'
            }), 400

        # Set defaults with proper boundary handling
        if not start_date:
            start_date = datetime.utcnow().date()
        if not end_date:
            end_date = start_date + timedelta(days=days_ahead)

        # Log the strict date boundaries being enforced
        current_app.logger.info(f"📅 Enforcing strict date boundaries: {start_date} to {end_date} (inclusive)")

        # Extract user timezone from headers for display conversion
        user_timezone = request.headers.get('X-Timezone', 'UTC')
        from timezone_utils import sanitize_timezone_input, convert_availability_display_times, python_to_js_weekday
        user_timezone = sanitize_timezone_input(user_timezone)

        current_app.logger.info(f"🌐 Display conversion using user timezone: {user_timezone}")

        # Get availability instances with generated dates
        availability_instances = RecurringAvailabilityService.get_availability_with_date_instances(
            tutor_id=tutor_id,
            start_date=start_date,
            end_date=end_date,
            days_ahead=days_ahead,
            user_timezone=user_timezone
        )

        # FIXED: Enhance each availability instance with proper timezone display conversion
        enhanced_instances = []
        for instance in availability_instances:
            try:
                # Convert availability data to dict if it's an object
                if hasattr(instance, 'to_dict'):
                    instance_data = instance.to_dict()
                else:
                    instance_data = instance

                # FIXED: Add timezone-converted display times using the improved function
                enhanced_instance = convert_availability_display_times(instance_data, user_timezone)

                # Standardize day_of_week for frontend compatibility (convert Python to JavaScript format)
                if 'day_of_week' in enhanced_instance and enhanced_instance['day_of_week'] is not None:
                    enhanced_instance['dayOfWeek'] = python_to_js_weekday(enhanced_instance['day_of_week'])  # Frontend expects 'dayOfWeek'
                    enhanced_instance['day_of_week_js'] = enhanced_instance['dayOfWeek']  # Alias for consistency
                    enhanced_instance['day_of_week_python'] = enhanced_instance['day_of_week']  # Keep original for reference

                enhanced_instances.append(enhanced_instance)

            except Exception as e:
                current_app.logger.error(f"Error enhancing instance {instance.get('id', 'unknown')}: {str(e)}")
                # Still add the instance without enhancement to avoid data loss
                enhanced_instances.append(instance)

        return jsonify({
            'success': True,
            'availability': enhanced_instances,
            'dateRange': {
                'startDate': start_date.isoformat() if start_date else None,
                'endDate': end_date.isoformat() if end_date else None,
                'daysAhead': days_ahead
            },
            'userTimezone': user_timezone
        }), 200

    except ValueError as e:
        return jsonify({
            'success': False,
            'error': f'Invalid date format: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500
