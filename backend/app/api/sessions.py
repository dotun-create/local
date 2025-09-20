from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from app.api import api_bp
from app.models import User, Course, Module, Session, Enrollment, Lesson, StudentCreditAllocation, CreditTransaction, Availability
from app.utils.currency import get_currency_from_country
from app import db
import uuid
import re
from datetime import datetime

def extract_parent_availability_id(availability_id):
    """
    Extract parent availability ID from virtual concatenated availability ID.

    Virtual availability IDs follow the pattern: availability_xxxxx_YYYY-MM-DD
    where xxxxx is the parent availability ID and YYYY-MM-DD is the date.

    Args:
        availability_id (str): The availability ID, which might be virtual or real

    Returns:
        str: The parent availability ID (for virtual IDs) or the original ID (for real IDs)
        None: If availability_id is None or empty

    Examples:
        extract_parent_availability_id("availability_cee2288b_2025-09-23") -> "availability_cee2288b"
        extract_parent_availability_id("availability_abc12345") -> "availability_abc12345"
        extract_parent_availability_id(None) -> None
    """
    if not availability_id:
        return None

    # Pattern: "availability_" + hex_string + "_" + YYYY-MM-DD
    # Virtual IDs are concatenated with date, real IDs are standalone
    virtual_pattern = re.compile(r'^availability_[a-f0-9]+_\d{4}-\d{2}-\d{2}$')

    if virtual_pattern.match(availability_id):
        # This is a virtual ID, extract the parent by removing the date suffix
        parent_id = availability_id.rsplit('_', 1)[0]  # Remove last "_YYYY-MM-DD" part
        return parent_id

    # This is already a real availability ID, return as-is
    return availability_id

@api_bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_sessions():
    """Get sessions based on user role"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        lesson_id = request.args.get('lessonId')
        course_id = request.args.get('courseId')
        
        query = Session.query
        
        # Apply session-specific filters first (before any joins)
        if status:
            query = query.filter_by(status=status)
        
        if lesson_id:
            query = query.filter_by(lesson_id=lesson_id)
            
        if course_id:
            query = query.filter_by(course_id=course_id)
        
        # Then apply user role filters (which may involve joins)
        # Check if user has tutor role (not just account_type for dual role support)
        user_roles = current_user.roles or []
        has_tutor_role = 'tutor' in user_roles

        if has_tutor_role or current_user.account_type == 'tutor':
            # Get user's availability IDs for sessions linked to their timeslots
            user_availability_ids = db.session.query(Availability.id).filter_by(tutor_id=current_user_id)

            # Show sessions where:
            # 1. User is directly assigned as tutor, OR
            # 2. Session is linked to user's availability records
            query = query.filter(
                db.or_(
                    Session.tutor_id == current_user_id,
                    Session.availability_id.in_(user_availability_ids)
                )
            )
        elif current_user.account_type == 'student':
            if lesson_id:
                # Check if student is enrolled in the course containing this lesson
                lesson = Lesson.query.get(lesson_id)
                if lesson and lesson.module and lesson.module.course:
                    course_id = lesson.module.course.id
                    enrollment = Enrollment.query.filter_by(
                        student_id=current_user_id, 
                        course_id=course_id, 
                        status='active'
                    ).first()
                    if enrollment:
                        # Student is enrolled in the course, show sessions for this lesson
                        query = query.filter_by(lesson_id=lesson_id)
                    else:
                        # Student not enrolled in course, show no sessions
                        query = query.filter(Session.id == None)
                else:
                    # Invalid lesson, show no sessions
                    query = query.filter(Session.id == None)
            elif course_id:
                # Check if student is enrolled in this specific course
                enrollment = Enrollment.query.filter_by(
                    student_id=current_user_id, 
                    course_id=course_id, 
                    status='active'
                ).first()
                if enrollment:
                    query = query.filter_by(course_id=course_id)
                else:
                    query = query.filter(Session.id == None)
            else:
                # Show all sessions for courses student is enrolled in
                enrolled_courses = db.session.query(Enrollment.course_id).filter_by(
                    student_id=current_user_id, 
                    status='active'
                )
                query = query.filter(Session.course_id.in_(enrolled_courses))
        elif current_user.account_type != 'admin':
            # Guardians can see sessions for their students
            enrolled_students = db.session.query(Enrollment.student_id).filter_by(guardian_id=current_user_id)
            query = query.join(Session.students).filter(User.id.in_(enrolled_students))
        
        sessions = query.order_by(Session.scheduled_date.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Extract user timezone for consistent date display
        user_timezone = request.headers.get('X-Timezone', 'UTC')

        return jsonify({
            'sessions': [session.to_dict(user_timezone=user_timezone) for session in sessions.items],
            'totalSessions': sessions.total,
            'totalPages': sessions.pages,
            'currentPage': page,
            'hasNext': sessions.has_next,
            'hasPrev': sessions.has_prev
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions/<string:session_id>', methods=['GET'])
@jwt_required()
def get_session(session_id):
    """Get specific session"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        session = Session.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Check access permissions
        has_access = (
            current_user.account_type == 'admin' or
            session.tutor_id == current_user_id or
            current_user in session.students
        )
        
        if not has_access:
            return jsonify({'error': 'Access denied'}), 403
        
        # Extract user timezone for consistent date display
        user_timezone = request.headers.get('X-Timezone', 'UTC')

        session_data = session.to_dict(user_timezone=user_timezone)
        # Include enrolled students for tutors/admins
        if current_user.account_type in ['tutor', 'admin']:
            session_data['enrolledStudents'] = [
                {'id': student.id, 'name': student.profile.get('name', student.email)}
                for student in session.students
            ]
        
        return jsonify({'session': session_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions', methods=['POST'])
@jwt_required()
def create_session():
    """Create new session"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type not in ['admin', 'tutor']:
            return jsonify({'error': 'Admin or tutor access required'}), 403
        
        data = request.get_json()
        required_fields = ['title', 'scheduledDate']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Extract timezone information from request headers first
        user_timezone = request.headers.get('X-Timezone', 'UTC')
        browser_locale = request.headers.get('X-Browser-Locale', 'en-US')

        # Smart timezone parsing with proper user intent detection
        from app.timezone_utils import smart_parse_session_datetime, validate_future_datetime

        # Use smart parsing to handle timezone correctly
        parse_result = smart_parse_session_datetime(data, user_timezone)

        if parse_result['errors']:
            return jsonify({
                'error': 'Invalid date/time format',
                'details': parse_result['errors']
            }), 400

        # Validate that the datetime is in the future (require 5 minutes advance booking)
        scheduled_date = parse_result['utc_datetime']
        future_validation = validate_future_datetime(
            scheduled_date.strftime('%Y-%m-%d'),
            scheduled_date.strftime('%H:%M'),
            'UTC',
            min_advance_minutes=5
        )
        if not future_validation['valid']:
            return jsonify({
                'error': 'Invalid booking time',
                'details': future_validation['errors']
            }), 400
        
        # Set tutor_id (admin can assign any tutor, tutors create for themselves)
        tutor_id = data.get('tutorId', current_user_id)
        if current_user.account_type == 'tutor' and tutor_id != current_user_id:
            return jsonify({'error': 'Tutors can only create sessions for themselves'}), 403
        

        # Determine currency from course if not provided explicitly
        session_currency = data.get('currency', 'GBP')
        if data.get('courseId') and not data.get('currency'):
            course = Course.query.get(data.get('courseId'))
            if course:
                session_currency = course.currency or get_currency_from_country(course.country)
        
        # Extract parent availability ID from virtual concatenated IDs
        raw_availability_id = data.get('availability_id')
        actual_availability_id = extract_parent_availability_id(raw_availability_id)

        session = Session(
            id=f"session_{uuid.uuid4().hex[:8]}",
            course_id=data.get('courseId'),
            module_id=data.get('moduleId'),
            lesson_id=data.get('lessonId'),
            tutor_id=tutor_id,
            availability_id=actual_availability_id,  # Use extracted parent availability ID
            title=data['title'],
            description=data.get('description'),
            scheduled_date=scheduled_date,
            timezone=parse_result['display_timezone'],  # Store session timezone
            created_timezone=user_timezone,  # Store creator's timezone
            browser_timezone=user_timezone,  # Store browser's timezone (same as user for now)
            duration=data.get('duration', 60),
            meeting_link=data.get('meetingLink'),
            topic=data.get('topic'),
            max_students=data.get('maxStudents', 5),
            price=data.get('price', 0.0),
            currency=session_currency
        )

        db.session.add(session)
        db.session.commit()

        # NEW: Automatically create Zoom meeting
        zoom_success = False
        zoom_error = None

        try:
            from app.services.zoom_service import zoom_service
            from flask import current_app

            if (zoom_service.is_configured() and
                current_app.config.get('ZOOM_AUTO_CREATE_MEETINGS', True)):
                # Get course information for meeting context
                course_data = {}
                if session.course_id:
                    course = Course.query.get(session.course_id)
                    if course:
                        course_data = {
                            'title': course.title,
                            'subject': course.subject
                        }

                # Prepare session data for Zoom meeting creation with proper timezone
                session_data = {
                    'title': session.title,
                    'scheduledDate': parse_result['zoom_start_time'] or (session.scheduled_date.isoformat() + 'Z'),
                    'duration': session.duration,
                    'timezone': parse_result['zoom_timezone'],
                    'topic': session.topic or session.title
                }

                # Create Zoom meeting
                zoom_result = zoom_service.create_course_session_meeting(course_data, session_data)

                if zoom_result.get('success'):
                    # Update session with Zoom meeting details
                    session.meeting_id = zoom_result.get('meeting_id')
                    session.meeting_link = zoom_result.get('join_url')
                    session.meeting_password = zoom_result.get('password')
                    session.meeting_start_url = zoom_result.get('start_url')
                    session.meeting_uuid = zoom_result.get('uuid')

                    db.session.commit()
                    zoom_success = True
                else:
                    zoom_error = zoom_result.get('error', 'Unknown Zoom API error')

        except Exception as e:
            zoom_error = str(e)
            # Log error but don't fail session creation
            print(f"Warning: Failed to create Zoom meeting for session {session.id}: {e}")

        # Prepare response
        response_data = {
            'session': session.to_dict(user_timezone=user_timezone),
            'message': 'Session created successfully',
            'zoom_integration': {
                'enabled': zoom_service.is_configured() if 'zoom_service' in locals() else False,
                'success': zoom_success,
                'meeting_created': zoom_success
            }
        }

        # Add Zoom error info if there was an issue (for debugging)
        if zoom_error and not zoom_success:
            response_data['zoom_integration']['error'] = zoom_error
            response_data['message'] += ' (Zoom meeting creation failed - can be added manually)'

        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions/<string:session_id>', methods=['PUT'])
@jwt_required()
def update_session(session_id):
    """Update session"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        session = Session.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Check permissions (admin, or tutor who owns the session)
        if (current_user.account_type != 'admin' and 
            session.tutor_id != current_user_id):
            return jsonify({'error': 'Access denied'}), 403
        
        data = request.get_json()
        
        # Update allowed fields
        updatable_fields = [
            'title', 'description', 'scheduled_date', 'duration', 
            'status', 'meeting_link', 'topic', 'max_students', 'price', 'currency'
        ]
        
        for field in updatable_fields:
            if field in data:
                if field == 'scheduled_date':
                    try:
                        scheduled_date = datetime.fromisoformat(data['scheduledDate'].replace('Z', '+00:00'))
                        session.scheduled_date = scheduled_date
                    except ValueError:
                        return jsonify({'error': 'Invalid date format'}), 400
                elif field == 'scheduledDate':
                    continue  # Already handled above
                else:
                    setattr(session, field, data[field])
        
        db.session.commit()
        
        return jsonify({
            'session': session.to_dict(),
            'message': 'Session updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions/<string:session_id>', methods=['DELETE'])
@jwt_required()
def delete_session(session_id):
    """Delete session"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        session = Session.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Check permissions (admin, or tutor who owns the session)
        if (current_user.account_type != 'admin' and 
            session.tutor_id != current_user_id):
            return jsonify({'error': 'Access denied'}), 403
        
        db.session.delete(session)
        db.session.commit()
        
        return jsonify({'message': 'Session deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions/<string:session_id>/enroll', methods=['POST'])
@jwt_required()
def enroll_in_session(session_id):
    """Enroll student in session"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        session = Session.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        data = request.get_json()
        student_id = data.get('studentId', current_user_id)
        
        # Check if student exists
        student = User.query.filter_by(id=student_id, account_type='student').first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Check if already enrolled
        if student in session.students:
            return jsonify({'error': 'Already enrolled in this session'}), 400
        
        # Check capacity using new session methods
        if not session.can_accept_enrollment():
            if session.is_full():
                return jsonify({
                    'error': 'Session is full',
                    'details': {
                        'enrollmentCount': session.get_enrollment_count(),
                        'maxStudents': session.max_students,
                        'capacityStatus': session.get_capacity_status()
                    }
                }), 400
            else:
                return jsonify({
                    'error': 'Session cannot accept new enrollments',
                    'details': {
                        'sessionStatus': session.status,
                        'capacityStatus': session.get_capacity_status()
                    }
                }), 400
        
        # Calculate credits required (assuming 1 credit = 1 currency unit)
        credits_required = session.price if session.price > 0 else 0
        
        # Check if credits are required for this session
        if credits_required > 0:
            # Find student's credit allocation
            allocation = StudentCreditAllocation.query.filter_by(student_id=student_id).first()
            
            if not allocation:
                return jsonify({
                    'error': f'No credit allocation found for student. {credits_required} credits required for this session.'
                }), 400
            
            # Check if student has enough credits
            if allocation.remaining_credits < credits_required:
                return jsonify({
                    'error': f'Insufficient credits. Required: {credits_required}, Available: {allocation.remaining_credits}'
                }), 400
            
            # Use the credits
            if not allocation.use_credits(credits_required):
                return jsonify({'error': 'Failed to use credits'}), 400
            
            # Create credit transaction
            transaction = CreditTransaction(
                guardian_id=allocation.guardian_id,
                student_id=student_id,
                allocation_id=allocation.id,
                transaction_type='session_enrollment',
                credits=credits_required,
                description=f'Session enrollment: {session.title}',
                related_session_id=session.id
            )
            db.session.add(transaction)
        
        session.students.append(student)
        db.session.commit()
        
        return jsonify({
            'message': f'Enrolled in session successfully! {credits_required} credits used.' if credits_required > 0 else 'Enrolled in session successfully!',
            'session': session.to_dict(current_student_id=student_id),
            'credits_used': credits_required,
            'remaining_credits': allocation.remaining_credits if credits_required > 0 else None
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions/<string:session_id>/unenroll', methods=['POST'])
@jwt_required()
def unenroll_from_session(session_id):
    """Unenroll student from session"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        session = Session.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        data = request.get_json()
        student_id = data.get('studentId', current_user_id)
        
        student = User.query.get(student_id)
        if not student or student not in session.students:
            return jsonify({'error': 'Student not enrolled in this session'}), 404
        
        session.students.remove(student)
        db.session.commit()
        
        return jsonify({
            'message': 'Unenrolled from session successfully',
            'session': session.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions/<string:session_id>/cancel-enrollment', methods=['POST'])
@jwt_required()
def cancel_session_enrollment(session_id):
    """Cancel student enrollment and refund credits"""
    try:
        from datetime import datetime, timedelta
        
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        session = Session.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        data = request.get_json()
        student_id = data.get('studentId', current_user_id)
        
        # Check if student exists
        student = User.query.filter_by(id=student_id, account_type='student').first()
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        # Check if student is enrolled
        if student not in session.students:
            return jsonify({'error': 'Student is not enrolled in this session'}), 400
        
        # Check 24-hour cancellation rule
        now = datetime.utcnow()
        session_time = session.scheduled_date
        hours_until_session = (session_time - now).total_seconds() / 3600
        
        if hours_until_session < 24:
            return jsonify({
                'error': f'Cannot cancel session. Must cancel at least 24 hours before session starts. Only {hours_until_session:.1f} hours remaining.'
            }), 400
        
        # Calculate credits to refund
        credits_to_refund = session.price if session.price > 0 else 0
        
        # Find and update student's credit allocation
        allocation = StudentCreditAllocation.query.filter_by(student_id=student_id).first()
        
        if credits_to_refund > 0 and allocation:
            # Refund credits
            allocation.remaining_credits += credits_to_refund
            allocation.used_credits -= credits_to_refund
            
            # Create refund transaction
            refund_transaction = CreditTransaction(
                guardian_id=allocation.guardian_id,
                student_id=student_id,
                allocation_id=allocation.id,
                transaction_type='session_cancellation',
                credits=credits_to_refund,
                description=f'Session cancellation refund: {session.title}',
                related_session_id=session.id
            )
            db.session.add(refund_transaction)
        
        # Remove student from session
        session.students.remove(student)
        db.session.commit()
        
        return jsonify({
            'message': f'Session cancelled successfully! {credits_to_refund} credits refunded.' if credits_to_refund > 0 else 'Session cancelled successfully!',
            'session': session.to_dict(),
            'credits_refunded': credits_to_refund,
            'remaining_credits': allocation.remaining_credits if allocation else None
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions/upcoming', methods=['GET'])
@jwt_required()
def get_upcoming_sessions():
    """Get upcoming sessions for a user"""
    try:
        user_id = request.args.get('userId')
        user_type = request.args.get('userType')
        
        if not user_id or not user_type:
            return jsonify({'error': 'userId and userType are required'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get current datetime
        now = datetime.utcnow()
        
        # Build query based on user type
        query = Session.query.filter(Session.scheduled_date >= now)
        
        if user_type == 'tutor':
            # Check if user has tutor role (for dual role support)
            user_roles = user.roles or [] if user else []
            has_tutor_role = 'tutor' in user_roles

            if has_tutor_role or user.account_type == 'tutor':
                # Get user's availability IDs for sessions linked to their timeslots
                user_availability_ids = db.session.query(Availability.id).filter_by(tutor_id=user_id)

                # Show sessions where user is tutor OR linked to their availability
                query = query.filter(
                    db.or_(
                        Session.tutor_id == user_id,
                        Session.availability_id.in_(user_availability_ids)
                    )
                )
        elif user_type == 'student':
            query = query.join(Session.students).filter(User.id == user_id)
        else:
            # For admins or guardians, show all upcoming sessions
            if user_type == 'guardian':
                # Get sessions for guardian's students
                enrolled_students = db.session.query(Enrollment.student_id).filter_by(guardian_id=user_id)
                query = query.join(Session.students).filter(User.id.in_(enrolled_students))
        
        # Order by scheduled date
        sessions = query.order_by(Session.scheduled_date.asc()).limit(10).all()
        
        # Format sessions for frontend
        formatted_sessions = []
        for session in sessions:
            # Get full session data including Zoom fields - pass student ID for enrollment status
            session_data = session.to_dict(current_student_id=user_id if user_type == 'student' else None)
            
            # Add course and module details
            if session.course_id:
                course = Course.query.get(session.course_id)
                if course:
                    session_data['course'] = course.title
                    session_data['subject'] = course.subject
            
            if session.module_id:
                module = Module.query.get(session.module_id)
                if module:
                    session_data['module'] = module.title
            
            # Format date and time
            if session.scheduled_date:
                session_data['date'] = session.scheduled_date.strftime('%a, %b %d, %Y')
                session_data['time'] = session.scheduled_date.strftime('%I:%M %p')
                # Also keep the original scheduled_date for display
                session_data['scheduled_date'] = session.scheduled_date.isoformat()
            
            # Add student information for tutor view
            if user_type == 'tutor':
                session_data['studentName'] = ', '.join([
                    s.profile.get('name', s.email) for s in session.students
                ]) if session.students else 'No students enrolled'
                session_data['enrolledCount'] = len(session.students)
                session_data['enrolledStudents'] = [
                    {
                        'id': s.id,
                        'name': s.profile.get('name', s.email),
                        'email': s.email,
                        'grade': s.profile.get('grade', ''),
                        'avatar': s.profile.get('avatar', '/images/default-avatar.png')
                    } for s in session.students
                ]
            
            # Add tutor name for student view
            if user_type == 'student' and session.tutor_id:
                tutor = User.query.get(session.tutor_id)
                if tutor:
                    session_data['tutorName'] = tutor.profile.get('name', tutor.email)
            
            # Ensure all Zoom fields are included - with defaults for testing
            session_data['meetingId'] = session.meeting_id or f"123-456-{session.id[-3:]}"
            session_data['meetingLink'] = session.meeting_link or f"https://zoom.us/j/123456{session.id[-3:]}"
            session_data['meetingPassword'] = session.meeting_password or "tutorpass123"
            session_data['meetingStartUrl'] = session.meeting_start_url or f"https://zoom.us/s/123456{session.id[-3:]}?role=1"
            session_data['meetingUuid'] = session.meeting_uuid or f"uuid-{session.id}"
            
            # Add availability information if linked
            if session.availability_id:
                session_data['availabilityId'] = session.availability_id
            
            formatted_sessions.append(session_data)
        
        return jsonify(formatted_sessions), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions/history', methods=['GET'])
@jwt_required()
def get_session_history():
    """Get session history for a user"""
    try:
        user_id = request.args.get('userId')
        user_type = request.args.get('userType')
        
        if not user_id or not user_type:
            return jsonify({'error': 'userId and userType are required'}), 400
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get current datetime
        now = datetime.utcnow()
        
        # Build query based on user type - get past sessions
        query = Session.query.filter(Session.scheduled_date < now)
        
        if user_type == 'tutor':
            # Check if user has tutor role (for dual role support)
            user_roles = user.roles or [] if user else []
            has_tutor_role = 'tutor' in user_roles

            if has_tutor_role or user.account_type == 'tutor':
                # Get user's availability IDs for sessions linked to their timeslots
                user_availability_ids = db.session.query(Availability.id).filter_by(tutor_id=user_id)

                # Show sessions where user is tutor OR linked to their availability
                query = query.filter(
                    db.or_(
                        Session.tutor_id == user_id,
                        Session.availability_id.in_(user_availability_ids)
                    )
                )
        elif user_type == 'student':
            query = query.join(Session.students).filter(User.id == user_id)
        else:
            # For admins or guardians
            if user_type == 'guardian':
                # Get sessions for guardian's students
                enrolled_students = db.session.query(Enrollment.student_id).filter_by(guardian_id=user_id)
                query = query.join(Session.students).filter(User.id.in_(enrolled_students))
        
        # Order by scheduled date (most recent first)
        sessions = query.order_by(Session.scheduled_date.desc()).limit(20).all()
        
        # Debug logging
        print(f"🔍 Session history API - Found {len(sessions)} sessions for user {user_id} (type: {user_type})")
        for session in sessions[:3]:
            print(f"  - {session.id}: status={session.status}, date={session.scheduled_date}")
        
        # Format sessions for frontend
        formatted_sessions = []
        for session in sessions:
            # Pass student ID for enrollment status if user is a student
            session_data = session.to_dict(current_student_id=user_id if user_type == 'student' else None)
            
            # Add course and module details
            if session.course_id:
                course = Course.query.get(session.course_id)
                if course:
                    session_data['course'] = course.title
                    session_data['subject'] = course.subject
            
            if session.module_id:
                module = Module.query.get(session.module_id)
                if module:
                    session_data['module'] = module.title
            
            # Format date and time
            if session.scheduled_date:
                session_data['date'] = session.scheduled_date.strftime('%a, %b %d, %Y')
                session_data['time'] = session.scheduled_date.strftime('%I:%M %p')
                session_data['completedDate'] = session.scheduled_date.strftime('%Y-%m-%d')
                # Also keep the original scheduled_date for display
                session_data['scheduled_date'] = session.scheduled_date.isoformat()
            
            # Add student information for tutor view
            if user_type == 'tutor':
                session_data['studentName'] = ', '.join([
                    s.profile.get('name', s.email) for s in session.students
                ]) if session.students else 'No students'
                session_data['enrolledCount'] = len(session.students)
                session_data['enrolledStudents'] = [
                    {
                        'id': s.id,
                        'name': s.profile.get('name', s.email),
                        'email': s.email,
                        'grade': s.profile.get('grade', ''),
                        'avatar': s.profile.get('avatar', '/images/default-avatar.png')
                    } for s in session.students
                ]
                # Add feedback prompt
                session_data['feedbackRequested'] = True
            
            # Add tutor name for student view
            if user_type == 'student' and session.tutor_id:
                tutor = User.query.get(session.tutor_id)
                if tutor:
                    session_data['tutorName'] = tutor.profile.get('name', tutor.email)
            
            # Ensure all Zoom fields are included - with defaults for testing
            session_data['meetingId'] = session.meeting_id or f"123-456-{session.id[-3:]}"
            session_data['meetingLink'] = session.meeting_link or f"https://zoom.us/j/123456{session.id[-3:]}"
            session_data['meetingPassword'] = session.meeting_password or "tutorpass123"
            session_data['meetingStartUrl'] = session.meeting_start_url or f"https://zoom.us/s/123456{session.id[-3:]}?role=1"
            session_data['meetingUuid'] = session.meeting_uuid or f"uuid-{session.id}"
            
            # Add availability information if linked
            if session.availability_id:
                session_data['availabilityId'] = session.availability_id
            
            # Keep the original status from session.to_dict() - don't override it
            # session_data['status'] = 'completed'  # REMOVED: This was incorrectly hardcoding all sessions as completed
            session_data['topic'] = session.topic or session.title
            
            formatted_sessions.append(session_data)
        
        # Debug response
        print(f"🔍 Session history API - Returning {len(formatted_sessions)} formatted sessions")
        if formatted_sessions:
            for session in formatted_sessions[:2]:
                print(f"  - Response: {session.get('id', 'no_id')}: status={session.get('status', 'no_status')}")
        
        return jsonify(formatted_sessions), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/courses/<string:course_id>/sessions', methods=['GET'])
def get_course_sessions(course_id):
    """Get all sessions for a specific course"""
    try:
        # Get current user if authenticated, otherwise allow public access
        try:
            verify_jwt_in_request(optional=True)
            current_user_id = get_jwt_identity()
        except:
            current_user_id = None
        
        current_user = User.query.get(current_user_id) if current_user_id else None
        
        # Check if course exists
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        # Get sessions for this course
        query = Session.query.filter_by(course_id=course_id)
        
        # Apply user-based filtering for authenticated users
        if current_user:
            if current_user.account_type == 'student':
                # Students can only see sessions they're enrolled in or public sessions
                query = query.outerjoin(Session.students).filter(
                    (User.id == current_user_id) | (Session.status.in_(['scheduled', 'active']))
                )
            elif current_user.account_type == 'tutor':
                # Tutors can see sessions they're assigned to or all course sessions if they're assigned to the course
                tutor_courses = [t.id for t in current_user.taught_courses]
                if course_id in tutor_courses:
                    # Tutor is assigned to this course, show all sessions
                    pass
                else:
                    # Only show sessions they're teaching
                    query = query.filter_by(tutor_id=current_user_id)
            # Admin users can see all sessions (no additional filtering)
        else:
            # Public access - only show scheduled/active sessions
            query = query.filter(Session.status.in_(['scheduled', 'active']))
        
        sessions = query.order_by(Session.scheduled_date.asc()).all()
        
        sessions_data = []
        for session in sessions:
            # Pass current student ID to include personal enrollment status
            session_data = session.to_dict(current_student_id=current_user_id if current_user and current_user.account_type == 'student' else None)

            # Add enrolled students count
            session_data['enrolledStudentsCount'] = len(session.students)
            
            # Add tutor information
            if session.tutor:
                session_data['tutorName'] = session.tutor.profile.get('name', session.tutor.email)
                session_data['tutorEmail'] = session.tutor.email
            
            # Add module and lesson information if available
            if session.module_id:
                module = Module.query.get(session.module_id)
                if module:
                    session_data['moduleName'] = module.title
            
            if session.lesson_id:
                lesson = Lesson.query.get(session.lesson_id)
                if lesson:
                    session_data['lessonName'] = lesson.title
            
            sessions_data.append(session_data)
        
        return jsonify({
            'sessions': sessions_data,
            'totalSessions': len(sessions_data),
            'courseId': course_id,
            'courseTitle': course.title
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/courses/<string:course_id>/sessions/batch', methods=['POST'])
@jwt_required()
def create_batch_sessions(course_id):
    """Create multiple sessions for a course"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type not in ['admin', 'tutor']:
            return jsonify({'error': 'Admin or tutor access required'}), 403
        
        # Check if course exists
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        data = request.get_json()
        sessions_data = data.get('sessions', [])
        
        if not sessions_data:
            return jsonify({'error': 'No sessions data provided'}), 400
        
        created_sessions = []
        errors = []
        conflicts = []
        
        for session_data in sessions_data:
            try:
                # Validate required fields with camelCase support
                title = session_data.get('title')
                scheduled_date_str = session_data.get('scheduledDate')
                
                if not title:
                    errors.append(f"Missing title for session")
                    continue
                    
                if not scheduled_date_str:
                    errors.append(f"Missing scheduledDate for session: {title}")
                    continue
                
                # Smart timezone parsing for batch sessions
                try:
                    user_timezone = request.headers.get('X-Timezone', 'UTC')
                    parse_result = smart_parse_session_datetime(session_data, user_timezone)

                    if parse_result['errors']:
                        errors.append(f"Invalid date/time format for session {title}: {', '.join(parse_result['errors'])}")
                        continue

                    scheduled_date = parse_result['utc_datetime']
                    timezone_str = parse_result['display_timezone']

                except Exception as e:
                    errors.append(f"Date parsing error for session {title}: {str(e)}")
                    continue
                
                # Map camelCase to snake_case for database fields
                tutor_id = session_data.get('tutorId')
                if not tutor_id:
                    errors.append(f"Missing tutorId for session: {title}")
                    continue
                
                # Validate tutor permissions
                if current_user.account_type == 'tutor' and tutor_id != current_user_id:
                    errors.append(f"Tutors can only create sessions for themselves: {title}")
                    continue
                
                # Check for scheduling conflicts
                existing_session = Session.query.filter_by(
                    tutor_id=tutor_id,
                    scheduled_date=scheduled_date
                ).first()
                
                if existing_session:
                    conflicts.append(f"Time conflict for {title} - tutor already has session at {scheduled_date}")
                    continue
                
                # Extract parent availability ID from virtual concatenated IDs for batch sessions
                batch_raw_availability_id = session_data.get('availability_id')
                batch_actual_availability_id = extract_parent_availability_id(batch_raw_availability_id)

                # Create session with camelCase to snake_case mapping
                session = Session(
                    id=f"session_{uuid.uuid4().hex[:8]}",
                    course_id=course_id,  # Use the course_id from URL
                    module_id=session_data.get('moduleId'),
                    lesson_id=session_data.get('lessonId'),
                    tutor_id=tutor_id,
                    availability_id=batch_actual_availability_id,  # Use extracted parent availability ID
                    title=title,
                    description=session_data.get('description'),
                    scheduled_date=scheduled_date,
                    timezone=timezone_str,
                    duration=session_data.get('duration', 60),
                    meeting_link=session_data.get('meetingLink'),
                    topic=session_data.get('topic'),
                    max_students=session_data.get('maxStudents', 5),
                    price=session_data.get('price', 0.0),
                    status=session_data.get('status', 'scheduled')
                )

                db.session.add(session)

                # NEW: Automatically create Zoom meeting for batch sessions
                try:
                    from app.services.zoom_service import zoom_service
                    from flask import current_app

                    if (zoom_service.is_configured() and
                        current_app.config.get('ZOOM_AUTO_CREATE_MEETINGS', True)):
                        # Get course information for meeting context
                        course_data = {
                            'title': course.title,
                            'subject': course.subject
                        }

                        # Prepare session data for Zoom meeting creation with proper timezone
                        zoom_session_data = {
                            'title': session.title,
                            'scheduledDate': parse_result['zoom_start_time'] or (session.scheduled_date.isoformat() + 'Z'),
                            'duration': session.duration,
                            'timezone': parse_result['zoom_timezone'],
                            'topic': session.topic or session.title
                        }

                        # Create Zoom meeting
                        zoom_result = zoom_service.create_course_session_meeting(course_data, zoom_session_data)

                        if zoom_result.get('success'):
                            # Update session with Zoom meeting details
                            session.meeting_id = zoom_result.get('meeting_id')
                            session.meeting_link = zoom_result.get('join_url')
                            session.meeting_password = zoom_result.get('password')
                            session.meeting_start_url = zoom_result.get('start_url')
                            session.meeting_uuid = zoom_result.get('uuid')

                except Exception as zoom_error:
                    # Log error but don't fail session creation
                    print(f"Warning: Failed to create Zoom meeting for batch session {session.id}: {zoom_error}")

                created_sessions.append(session)
                
            except Exception as session_error:
                errors.append(f"Error creating session {session_data.get('title', 'Unknown')}: {str(session_error)}")
                continue
        
        # Commit all successful sessions
        if created_sessions:
            db.session.commit()
        
        # Format response
        response_data = {
            'message': f'Created {len(created_sessions)} sessions with {len(conflicts)} conflicts and {len(errors)} errors',
            'created_count': len(created_sessions),
            'total_requested': len(sessions_data),
            'created_sessions': [session.to_dict() for session in created_sessions],
            'conflicts': conflicts,
            'errors': errors
        }
        
        # Return appropriate status code
        if len(created_sessions) == 0:
            return jsonify(response_data), 400
        elif len(errors) > 0 or len(conflicts) > 0:
            return jsonify(response_data), 207  # 207 Multi-Status for partial success
        else:
            return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# Session Status Management Endpoints

@api_bp.route('/sessions/<session_id>/start', methods=['POST'])
@jwt_required()
def start_session(session_id):
    """Mark a session as in progress when tutor starts it"""
    try:
        from app.services.session_status_service import session_status_service
        
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get the session
        session = Session.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Only tutor or admin can start session
        if current_user.account_type not in ['tutor', 'admin'] and session.tutor_id != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Start the session
        success = session_status_service.mark_session_in_progress(session_id)
        
        if success:
            return jsonify({
                'message': 'Session started successfully',
                'session_id': session_id,
                'status': 'in_progress'
            }), 200
        else:
            return jsonify({'error': 'Could not start session'}), 400
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions/<session_id>/complete', methods=['POST'])
@jwt_required()
def complete_session(session_id):
    """Mark a session as completed"""
    try:
        from app.services.session_status_service import session_status_service
        
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get the session
        session = Session.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Only tutor or admin can complete session
        if current_user.account_type not in ['tutor', 'admin'] and session.tutor_id != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get participants count from request if provided
        data = request.get_json() or {}
        participants_count = data.get('participants_count')
        
        # Complete the session
        success = session_status_service.complete_session(session_id, participants_count)
        
        if success:
            return jsonify({
                'message': 'Session completed successfully',
                'session_id': session_id,
                'status': 'completed'
            }), 200
        else:
            return jsonify({'error': 'Could not complete session'}), 400
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/sessions/<session_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_session(session_id):
    """Cancel a session"""
    try:
        from app.services.session_status_service import session_status_service
        
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get the session
        session = Session.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Only tutor or admin can cancel session
        if current_user.account_type not in ['tutor', 'admin'] and session.tutor_id != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get cancellation reason from request if provided
        data = request.get_json() or {}
        reason = data.get('reason')
        
        # Cancel the session
        success = session_status_service.cancel_session(session_id, reason)
        
        if success:
            return jsonify({
                'message': 'Session cancelled successfully',
                'session_id': session_id,
                'status': 'cancelled'
            }), 200
        else:
            return jsonify({'error': 'Could not cancel session'}), 400
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
