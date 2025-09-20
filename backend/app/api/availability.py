from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User, Availability, Session
from app import db
from app.utils.response_utils import (
    create_success_response, create_error_response,
    create_not_found_response, create_forbidden_response,
    create_validation_error_response, create_conflict_response
)
from app.schemas.availability_schemas import (
    TutorAvailabilityResponse, AvailabilityCreateRequest,
    AvailabilityUpdateRequest, AvailabilityListResponse
)
from app.services.availability_service import AvailabilityService
import uuid
from datetime import datetime

# COMMENTED OUT - Route conflict resolved. Using recurring_availability.py route instead
# This old endpoint only returns single slots in weekly format and misses recurring instances
@api_bp.route('/tutors/<string:tutor_id>/availability', methods=['GET'])
@jwt_required()
def get_tutor_availability(tutor_id):
    """Get tutor's availability schedule"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user:
            return create_not_found_response("User")

        # Check if current user can access this tutor's availability
        if not current_user.has_role('admin') and current_user_id != tutor_id:
            return create_forbidden_response()

        # Verify tutor exists and has tutor role
        tutor = User.query.get(tutor_id)
        if not tutor or not tutor.has_role('tutor'):
            return create_not_found_response("Tutor")

        # Get query parameters for date filtering
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')

        # Build query for availability records
        query = Availability.query.filter_by(tutor_id=tutor_id)

        # Apply date filtering if parameters are provided
        if start_date_str or end_date_str:
            try:
                if start_date_str:
                    start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                    # Filter for records that have specific_date >= start_date or no specific_date (recurring)
                    query = query.filter(
                        (Availability.specific_date >= start_date) |
                        (Availability.specific_date.is_(None))
                    )

                if end_date_str:
                    end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                    # Filter for records that have specific_date <= end_date or no specific_date (recurring)
                    query = query.filter(
                        (Availability.specific_date <= end_date) |
                        (Availability.specific_date.is_(None))
                    )

            except ValueError as date_error:
                return create_validation_error_response([
                    {"field": "date", "message": f"Invalid date format. Use YYYY-MM-DD. {str(date_error)}"}
                ])

        availability_records = query.all()

        # Group by day of week and organize the data
        weekly_availability = {
            'monday': {'available': False, 'timeSlots': []},
            'tuesday': {'available': False, 'timeSlots': []},
            'wednesday': {'available': False, 'timeSlots': []},
            'thursday': {'available': False, 'timeSlots': []},
            'friday': {'available': False, 'timeSlots': []},
            'saturday': {'available': False, 'timeSlots': []},
            'sunday': {'available': False, 'timeSlots': []}
        }

        # Map day numbers to day names
        day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

        for record in availability_records:
            day_name = day_names[record.day_of_week]

            if record.available:
                weekly_availability[day_name]['available'] = True
                weekly_availability[day_name]['timeSlots'].append({
                    'id': record.id,
                    'time': f"{record.start_time}-{record.end_time}",
                    'startTime': record.start_time,
                    'endTime': record.end_time,
                    'course': record.course_id,  # Course assignment
                    'timeZone': record.time_zone,
                    'specificDate': record.specific_date.isoformat() if record.specific_date else None
                })

        return create_success_response(
            data={
                'availability': weekly_availability,
                'tutor_id': tutor_id
            },
            message="Tutor availability retrieved successfully"
        )

    except Exception as e:
        return create_error_response(
            message="Failed to retrieve tutor availability",
            error_code="FETCH_ERROR",
            details={"exception": str(e)},
            status_code=500
        )

@api_bp.route('/tutors/<string:tutor_id>/availability', methods=['POST', 'PUT'])
@jwt_required()
def save_tutor_availability(tutor_id):
    """Save or update tutor's availability schedule"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if current user can update this tutor's availability
        if current_user.account_type not in ['admin'] and current_user_id != tutor_id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Verify tutor exists and has tutor role
        tutor = User.query.get(tutor_id)
        if not tutor or not tutor.has_role('tutor'):
            return jsonify({'error': 'User does not have tutor role'}), 404

        data = request.get_json()
        if not data or 'availability' not in data:
            return jsonify({'error': 'Availability data is required'}), 400
        
        availability_data = data['availability']
        
        # Validate the data structure
        day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        for day_name in day_names:
            if day_name not in availability_data:
                return jsonify({'error': f'Missing availability data for {day_name}'}), 400
        
        # Extract user timezone information
        from timezone_utils import get_user_timezone_from_request
        user_timezone = get_user_timezone_from_request(request)
        browser_locale = request.headers.get('X-Browser-Locale', 'en-US')

        # Begin transaction - delete existing availability and create new ones
        try:
            # Delete existing availability records for this tutor
            Availability.query.filter_by(tutor_id=tutor_id).delete()

            # Create new availability records
            created_records = []
            for day_index, day_name in enumerate(day_names):
                day_data = availability_data[day_name]

                # If day is marked as available and has time slots
                if day_data.get('available', False) and day_data.get('timeSlots'):
                    for time_slot in day_data['timeSlots']:
                        # Parse time slot
                        if 'time' in time_slot:
                            # Format: "09:00-10:00"
                            start_time, end_time = time_slot['time'].split('-')
                        elif 'startTime' in time_slot and 'endTime' in time_slot:
                            start_time = time_slot['startTime']
                            end_time = time_slot['endTime']
                        else:
                            continue  # Skip invalid time slots

                        # Validate time format (HH:MM)
                        if not _validate_time_format(start_time) or not _validate_time_format(end_time):
                            return jsonify({'error': f'Invalid time format for {day_name}. Use HH:MM format'}), 400

                        # Validate that start time is before end time
                        if start_time >= end_time:
                            return jsonify({'error': f'Start time must be before end time for {day_name}'}), 400

                        # Create availability record
                        availability_record = Availability(
                            id=f"availability_{uuid.uuid4().hex[:8]}",
                            tutor_id=tutor_id,
                            day_of_week=day_index,
                            start_time=start_time,
                            end_time=end_time,
                            available=True,
                            time_zone=time_slot.get('timeZone', user_timezone),
                            created_timezone=user_timezone,
                            browser_timezone=user_timezone,
                            course_id=time_slot.get('course') if time_slot.get('course') else None
                        )

                        db.session.add(availability_record)
                        created_records.append(availability_record)
            
            # Commit the transaction
            db.session.commit()

            # Invalidate cache for this tutor
            AvailabilityService.invalidate_cache(tutor_id=tutor_id)

            return create_success_response(
                data={
                    'records_created': len(created_records),
                    'tutor_id': tutor_id
                },
                message='Availability saved successfully'
            )
            
        except Exception as e:
            db.session.rollback()
            raise e
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/tutors/<string:tutor_id>/availability/day/<string:day>', methods=['POST'])
@jwt_required()
def update_day_availability(tutor_id, day):
    """Update availability for a specific day"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check access permissions
        if current_user.account_type not in ['admin'] and current_user_id != tutor_id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Verify tutor exists and has tutor role
        tutor = User.query.get(tutor_id)
        if not tutor or not tutor.has_role('tutor'):
            return jsonify({'error': 'User does not have tutor role'}), 404

        # Validate day parameter
        day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        if day not in day_names:
            return jsonify({'error': 'Invalid day name'}), 400
        
        day_index = day_names.index(day)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Request data is required'}), 400
        
        # Extract user timezone information
        from timezone_utils import get_user_timezone_from_request
        user_timezone = get_user_timezone_from_request(request)
        browser_locale = request.headers.get('X-Browser-Locale', 'en-US')

        # Delete existing records for this day
        Availability.query.filter_by(tutor_id=tutor_id, day_of_week=day_index).delete()

        # Add new time slots if available is True and timeSlots are provided
        created_records = []
        if data.get('available', False) and data.get('timeSlots'):
            for time_slot in data['timeSlots']:
                # Parse time slot
                if 'time' in time_slot:
                    start_time, end_time = time_slot['time'].split('-')
                elif 'startTime' in time_slot and 'endTime' in time_slot:
                    start_time = time_slot['startTime']
                    end_time = time_slot['endTime']
                else:
                    continue

                # Validate and create record
                if _validate_time_format(start_time) and _validate_time_format(end_time) and start_time < end_time:
                    availability_record = Availability(
                        id=f"availability_{uuid.uuid4().hex[:8]}",
                        tutor_id=tutor_id,
                        day_of_week=day_index,
                        start_time=start_time,
                        end_time=end_time,
                        available=True,
                        time_zone=time_slot.get('timeZone', user_timezone),
                        created_timezone=user_timezone,
                        browser_timezone=user_timezone,
                        course_id=time_slot.get('course') if time_slot.get('course') else None
                    )

                    db.session.add(availability_record)
                    created_records.append(availability_record)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Availability updated for {day}',
            'day': day,
            'recordsCreated': len(created_records)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/availability/<string:availability_id>', methods=['PUT'])
@jwt_required()
def update_availability(availability_id):
    """Update a specific availability slot"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get the availability record
        availability = Availability.query.get(availability_id)
        if not availability:
            return jsonify({'error': 'Availability slot not found'}), 404
        
        # Check access permissions
        if current_user.account_type not in ['admin'] and current_user_id != availability.tutor_id:
            return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        update_option = data.get('updateOption', 'single')  # 'single', 'future', or 'all'
        
        # Check for conflicts with existing sessions
        if 'start_time' in data or 'end_time' in data:
            # Check if there are booked sessions that would be affected
            sessions = Session.query.filter_by(availability_id=availability_id).all()
            if sessions:
                # Check if the new time would conflict with booked sessions
                for session in sessions:
                    session_time = session.scheduled_date.strftime('%H:%M')
                    new_start = data.get('start_time', availability.start_time)
                    new_end = data.get('end_time', availability.end_time)
                    
                    if session_time < new_start or session_time >= new_end:
                        return jsonify({
                            'error': 'Cannot update time slot - conflicts with booked sessions',
                            'conflicts': len(sessions)
                        }), 400
        
        # Handle recurring slot updates
        updated_count = 0
        if availability.is_recurring and update_option != 'single':
            # Find related slots based on update option
            if update_option == 'all':
                # Update all instances in the recurring series
                if availability.parent_availability_id:
                    # This is a child, find parent and all siblings
                    parent_id = availability.parent_availability_id
                    related_slots = Availability.query.filter_by(parent_availability_id=parent_id).all()
                    parent = Availability.query.get(parent_id)
                    if parent:
                        related_slots.append(parent)
                else:
                    # This is the parent, find all children
                    related_slots = Availability.query.filter_by(parent_availability_id=availability.id).all()
                    related_slots.append(availability)
            elif update_option == 'future':
                # Update this and future instances only
                if availability.date:
                    related_slots = Availability.query.filter(
                        Availability.tutor_id == availability.tutor_id,
                        Availability.date >= availability.date
                    )
                    if availability.parent_availability_id:
                        related_slots = related_slots.filter_by(parent_availability_id=availability.parent_availability_id)
                    else:
                        related_slots = related_slots.filter(
                            (Availability.parent_availability_id == availability.id) |
                            (Availability.id == availability.id)
                        )
                    related_slots = related_slots.all()
                else:
                    related_slots = [availability]
            else:
                related_slots = [availability]
            
            # Update all related slots
            for slot in related_slots:
                # Check for session conflicts for each slot
                slot_sessions = Session.query.filter_by(availability_id=slot.id).all()
                if slot_sessions and ('start_time' in data or 'end_time' in data):
                    continue  # Skip slots with conflicts
                
                # Update slot fields
                if 'start_time' in data:
                    slot.start_time = data['start_time']
                if 'end_time' in data:
                    slot.end_time = data['end_time']
                if 'available' in data:
                    slot.available = data['available']
                if 'course_id' in data:
                    slot.course_id = data.get('course_id')
                if 'time_zone' in data:
                    slot.time_zone = data['time_zone']
                
                updated_count += 1
        else:
            # Update single slot
            if 'start_time' in data:
                availability.start_time = data['start_time']
            if 'end_time' in data:
                availability.end_time = data['end_time']
            if 'available' in data:
                availability.available = data['available']
            if 'course_id' in data:
                availability.course_id = data.get('course_id')
            if 'time_zone' in data:
                availability.time_zone = data['time_zone']
            
            updated_count = 1
        
        db.session.commit()
        
        # Extract user timezone from request headers
        from timezone_utils import get_user_timezone_from_request
        user_timezone = get_user_timezone_from_request(request)

        return jsonify({
            'message': f'Updated {updated_count} availability slot(s)',
            'updatedCount': updated_count,
            'availability': availability.to_dict(user_timezone=user_timezone)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/tutors/<string:tutor_id>/availability/<string:availability_id>', methods=['DELETE'])
@jwt_required()
def delete_availability(tutor_id, availability_id):
    """Delete a specific availability slot"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check access permissions
        if current_user.account_type not in ['admin'] and current_user_id != tutor_id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Find the availability record
        availability = Availability.query.filter_by(id=availability_id, tutor_id=tutor_id).first()
        
        if not availability:
            return jsonify({'error': 'Availability slot not found'}), 404
        
        # Check if there are any booked sessions for this availability
        booked_sessions = Session.query.filter_by(availability_id=availability_id).all()
        
        if booked_sessions:
            return jsonify({
                'error': 'Cannot delete availability with booked sessions',
                'bookedSessions': len(booked_sessions)
            }), 400
        
        # Delete the availability
        db.session.delete(availability)
        db.session.commit()
        
        return jsonify({
            'message': 'Availability deleted successfully',
            'deletedId': availability_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/tutors/<string:tutor_id>/availability/bulk', methods=['DELETE'])
@jwt_required()
def delete_multiple_availabilities(tutor_id):
    """Delete multiple availability slots"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check access permissions
        if current_user.account_type not in ['admin'] and current_user_id != tutor_id:
            return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        availability_ids = data.get('availability_ids', [])
        delete_option = data.get('deleteOption', 'single')  # 'single' or 'series'
        
        if not availability_ids:
            return jsonify({'error': 'No availability IDs provided'}), 400
        
        deleted_count = 0
        failed_deletions = []
        
        for availability_id in availability_ids:
            try:
                availability = Availability.query.filter_by(id=availability_id, tutor_id=tutor_id).first()
                
                if not availability:
                    failed_deletions.append({
                        'id': availability_id,
                        'reason': 'Not found'
                    })
                    continue
                
                # Check for booked sessions
                booked_sessions = Session.query.filter_by(availability_id=availability_id).all()
                
                if booked_sessions:
                    failed_deletions.append({
                        'id': availability_id,
                        'reason': f'{len(booked_sessions)} booked sessions'
                    })
                    continue
                
                # If delete_option is 'series' and this is a recurring slot, delete all instances
                if delete_option == 'series' and availability.is_recurring:
                    # Delete all slots with the same parent_availability_id
                    if availability.parent_availability_id:
                        # This is a child instance, find all siblings
                        related_slots = Availability.query.filter_by(
                            parent_availability_id=availability.parent_availability_id,
                            tutor_id=tutor_id
                        ).all()
                    else:
                        # This is the parent, find all children
                        related_slots = Availability.query.filter_by(
                            parent_availability_id=availability.id,
                            tutor_id=tutor_id
                        ).all()
                        related_slots.append(availability)  # Include the parent itself
                    
                    for slot in related_slots:
                        # Check each slot for booked sessions
                        if not Session.query.filter_by(availability_id=slot.id).first():
                            db.session.delete(slot)
                            deleted_count += 1
                else:
                    # Delete single instance
                    db.session.delete(availability)
                    deleted_count += 1
                    
            except Exception as e:
                failed_deletions.append({
                    'id': availability_id,
                    'reason': str(e)
                })
        
        db.session.commit()
        
        return jsonify({
            'message': f'Deleted {deleted_count} availability slots',
            'deletedCount': deleted_count,
            'failedDeletions': failed_deletions
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/availability/<string:availability_id>/conflicts', methods=['GET'])
@jwt_required()
def check_availability_conflicts(availability_id):
    """Check for conflicts before editing or deleting an availability slot"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get the availability record
        availability = Availability.query.get(availability_id)
        if not availability:
            return jsonify({'error': 'Availability slot not found'}), 404
        
        # Check access permissions
        if current_user.account_type not in ['admin'] and current_user_id != availability.tutor_id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Check for booked sessions
        sessions = Session.query.filter_by(availability_id=availability_id).all()
        
        conflicts = {
            'hasConflicts': len(sessions) > 0,
            'bookedSessions': len(sessions),
            'sessions': []
        }
        
        for session in sessions:
            conflicts['sessions'].append({
                'id': session.id,
                'title': session.title,
                'scheduledDate': session.scheduled_date.isoformat() if session.scheduled_date else None,
                'studentCount': len(session.students),
                'status': session.status
            })
        
        # Check if this is part of a recurring series
        if availability.is_recurring:
            conflicts['isRecurring'] = True
            conflicts['recurringInfo'] = {
                'pattern': availability.recurrence_pattern,
                'endDate': availability.recurrence_end_date.isoformat() if availability.recurrence_end_date else None
            }
            
            # Count related slots in the series
            if availability.parent_availability_id:
                # This is a child instance
                related_count = Availability.query.filter_by(
                    parent_availability_id=availability.parent_availability_id
                ).count()
                conflicts['recurringInfo']['totalInstances'] = related_count + 1  # Include parent
            else:
                # This is the parent
                related_count = Availability.query.filter_by(
                    parent_availability_id=availability.id
                ).count()
                conflicts['recurringInfo']['totalInstances'] = related_count + 1  # Include self
        else:
            conflicts['isRecurring'] = False
        
        return jsonify(conflicts), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/tutors/<string:tutor_id>/availability/timeslot', methods=['POST'])
@jwt_required()
def add_single_timeslot(tutor_id):
    """Add a single time slot without requiring full weekly availability"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check access permissions
        if current_user.account_type not in ['admin'] and current_user_id != tutor_id:
            return jsonify({'error': 'Access denied'}), 403
        
        # Verify tutor exists and has tutor role
        tutor = User.query.get(tutor_id)
        if not tutor or not tutor.has_role('tutor'):
            return jsonify({'error': 'User does not have tutor role'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request data is required'}), 400

        # Extract user timezone information first
        from timezone_utils import get_user_timezone_from_request
        user_timezone = get_user_timezone_from_request(request)
        browser_locale = request.headers.get('X-Browser-Locale', 'en-US')

        # Handle both nested timeSlot format and flat format from frontend
        if 'timeSlot' in data:
            # Nested format
            time_slot = data['timeSlot']
        else:
            # Flat format - map frontend fields to expected format
            time_slot = {
                'startTime': data.get('startTime'),
                'endTime': data.get('endTime'),
                'specificDate': data.get('date'),  # Frontend sends 'date', backend expects 'specificDate'
                'course': data.get('courseId'),    # Frontend sends 'courseId', backend expects 'course'
                'timeZone': data.get('timeZone', user_timezone)
            }

        # Validate required fields
        required_fields = ['startTime', 'endTime']
        for field in required_fields:
            if not time_slot.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400

        start_time = time_slot['startTime']
        end_time = time_slot['endTime']

        # Determine day of week and specific_date first
        day_of_week = None
        specific_date = None

        if 'specificDate' in time_slot and time_slot['specificDate']:
            try:
                specific_date = datetime.fromisoformat(time_slot['specificDate'].replace('Z', '+00:00')).date()
                day_of_week = specific_date.weekday()  # 0=Monday, 6=Sunday
            except ValueError:
                return jsonify({'error': 'Invalid date format for specificDate'}), 400
        else:
            # If no specific date, we need a day parameter or current day logic
            day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
            day_name = data.get('day')
            if day_name and day_name in day_names:
                day_of_week = day_names.index(day_name)
            else:
                return jsonify({'error': 'Either specificDate or day parameter is required'}), 400

        # Use timezone-aware validation
        from timezone_utils import validate_time_range

        # Get the date string for the timeslot
        validation_date = specific_date.isoformat() if specific_date else datetime.now().strftime('%Y-%m-%d')

        # Validate time range with timezone context
        time_validation = validate_time_range(start_time, end_time, validation_date, user_timezone)
        if not time_validation['valid']:
            return jsonify({
                'error': 'Invalid time range',
                'details': time_validation['errors']
            }), 400

        # Create the availability record
        availability_record = Availability(
            id=f"availability_{uuid.uuid4().hex[:8]}",
            tutor_id=tutor_id,
            day_of_week=day_of_week,
            start_time=start_time,
            end_time=end_time,
            available=True,
            time_zone=time_slot.get('timeZone', user_timezone),
            created_timezone=user_timezone,
            browser_timezone=user_timezone,
            course_id=time_slot.get('course') if time_slot.get('course') else None,
            specific_date=specific_date
        )
        
        db.session.add(availability_record)
        db.session.commit()
        
        return jsonify({
            'message': 'Time slot added successfully',
            'timeslot': availability_record.to_dict(user_timezone=user_timezone),
            'tutorId': tutor_id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def _validate_time_format(time_str):
    """Validate time format (HH:MM)"""
    try:
        if not time_str or len(time_str) != 5:
            return False
        
        parts = time_str.split(':')
        if len(parts) != 2:
            return False
        
        # Ensure hour is 2 digits and minute is 2 digits
        hour_str, minute_str = parts
        if len(hour_str) != 2 or len(minute_str) != 2:
            return False
        
        hour = int(hour_str)
        minute = int(minute_str)
        
        return 0 <= hour <= 23 and 0 <= minute <= 59
    except (ValueError, AttributeError):
        return False