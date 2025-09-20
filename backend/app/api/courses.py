from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User, Course, Module, Enrollment, Availability, Session, StudentCreditAllocation, CreditTransaction
from app.services.zoom_service import zoom_service
from app.services.availability_service import AvailabilityService
from app.services.websocket_service import websocket_service, EventCategory
from app.services.tutor_assignment_service import TutorAssignmentService
from app.utils.currency import get_currency_from_country
from app import db
import uuid
from datetime import datetime

@api_bp.route('/courses', methods=['GET'])
def get_courses():
    """Get all courses"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        subject = request.args.get('subject')
        level = request.args.get('level')
        grade_level = request.args.get('gradeLevel')
        status = request.args.get('status', 'active')
        
        query = Course.query.filter_by(status=status)
        if subject:
            query = query.filter_by(subject=subject)
        if level:
            query = query.filter_by(level=level)
        if grade_level:
            query = query.filter_by(grade_level=grade_level)
        
        courses = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            'courses': [course.to_dict() for course in courses.items],
            'totalCourses': courses.total,
            'totalPages': courses.pages,
            'currentPage': page,
            'hasNext': courses.has_next,
            'hasPrev': courses.has_prev
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/courses/<string:course_id>', methods=['GET'])
@jwt_required()
def get_course(course_id):
    """Get specific course with enhanced data for admin users"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        course_data = course.to_dict()
        # Include modules in response
        course_data['modules'] = [module.to_dict() for module in course.modules]
        
        # For admin users, include tutors and their date-specific availability
        if current_user.account_type == 'admin':
            # Get optional date range parameters
            start_date = request.args.get('start_date')
            end_date = request.args.get('end_date')
            
            print(f"API: Received date range parameters - start_date: {start_date}, end_date: {end_date}")
            
            # Get date-specific availability for all course tutors
            if start_date and end_date:
                # Parse dates and pass to availability service
                from datetime import datetime
                try:
                    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                    print(f"API: Parsed dates - start: {start_date_obj}, end: {end_date_obj}")
                    
                    availability_data = AvailabilityService.get_course_tutor_availability(
                        course_id, 
                        start_date=start_date_obj, 
                        end_date=end_date_obj
                    )
                except ValueError as ve:
                    print(f"API: Date parsing error - {ve}")
                    return jsonify({'error': f'Invalid date format. Use YYYY-MM-DD. Error: {str(ve)}'}), 400
            else:
                # Use default behavior (module-based date range)
                availability_data = AvailabilityService.get_course_tutor_availability(course_id)
            
            course_data['tutors'] = availability_data['tutors']
            course_data['availabilityDateRange'] = availability_data['dateRange']
        
        return jsonify({'course': course_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/courses', methods=['POST'])
@jwt_required()
def create_course():
    """Create new course (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        data = request.get_json()
        required_fields = ['title', 'description']
        
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Determine currency from country if not provided explicitly
        course_currency = data.get('currency', 'GBP')
        if data.get('country') and not data.get('currency'):
            course_currency = get_currency_from_country(data.get('country'))
        
        course = Course(
            id=f"course_{uuid.uuid4().hex[:8]}",
            title=data['title'],
            description=data['description'],
            price=data.get('price', 0.0),
            currency=course_currency,
            duration=data.get('duration'),
            level=data.get('level'),
            subject=data.get('subject'),
            country=data.get('country'),
            grade_level=data.get('gradeLevel'),
            thumbnail=data.get('thumbnail'),
            syllabus=data.get('syllabus', []),
            prerequisites=data.get('prerequisites', []),
            learning_outcomes=data.get('learningOutcomes', [])
        )
        
        db.session.add(course)
        db.session.commit()

        # Auto-assign eligible tutors if grade level and subject are provided
        assignment_result = None
        if course.grade_level and course.subject:
            assignment_result = TutorAssignmentService.auto_assign_tutors(course)

        response_data = {
            'course': course.to_dict(),
            'message': 'Course created successfully'
        }

        # Include assignment result if auto-assignment was attempted
        if assignment_result:
            response_data['tutorAssignment'] = assignment_result
            if assignment_result['assigned_count'] > 0:
                response_data['message'] += f' and {assignment_result["assigned_count"]} tutor(s) automatically assigned'

        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/courses/<string:course_id>', methods=['PUT'])
@jwt_required()
def update_course(course_id):
    """Update course (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        data = request.get_json()
        
        # Auto-determine currency from country if country is being updated but currency is not provided
        if 'country' in data and 'currency' not in data:
            data['currency'] = get_currency_from_country(data['country'])
        
        # Update allowed fields
        updatable_fields = [
            'title', 'description', 'price', 'currency', 'duration', 
            'subject', 'country', 'grade_level', 'status', 'timezone', 'thumbnail', 'syllabus', 
            'prerequisites', 'learning_outcomes'
        ]
        
        for field in updatable_fields:
            if field in data:
                if field == 'learning_outcomes':
                    setattr(course, 'learning_outcomes', data['learningOutcomes'])
                else:
                    setattr(course, field, data[field])
            elif field == 'grade_level' and 'gradeLevel' in data:
                setattr(course, 'grade_level', data['gradeLevel'])
        
        db.session.commit()
        
        return jsonify({
            'course': course.to_dict(),
            'message': 'Course updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/courses/<string:course_id>', methods=['DELETE'])
@jwt_required()
def delete_course(course_id):
    """Delete course (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        db.session.delete(course)
        db.session.commit()
        
        return jsonify({'message': 'Course deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/courses/<string:course_id>/enroll', methods=['POST'])
@jwt_required()
def enroll_in_course(course_id):
    """Enroll student in course"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        data = request.get_json() or {}
        student_id = data.get('studentId', current_user_id)
        
        # Check if enrollment already exists
        existing = Enrollment.query.filter_by(
            student_id=student_id,
            course_id=course_id
        ).first()
        
        if existing:
            return jsonify({'error': 'Already enrolled in this course'}), 400
        
        # Find student's guardian from profile
        student = User.query.get(student_id)
        if not student:
            return jsonify({'error': 'Student not found'}), 404
        
        guardian_email = student.profile.get('guardian_email') if student.profile else None
        guardian_id = None
        
        # Look for guardian by email if provided in profile
        if guardian_email:
            guardian = User.query.filter_by(
                email=guardian_email, 
                account_type='guardian'
            ).first()
            if guardian:
                guardian_id = guardian.id
        
        # Calculate credits required (assuming 1 credit = 1 currency unit)
        credits_required = course.price if course.price > 0 else 0
        
        # Check if credits are required for this course
        if credits_required > 0:
            # Find student's credit allocation
            allocation = StudentCreditAllocation.query.filter_by(student_id=student_id).first()
            
            if not allocation:
                # Create notification for guardian to allocate credits
                if guardian_id:
                    from app.models import Notification
                    
                    notification = Notification(
                        id=f"notification_{uuid.uuid4().hex[:8]}",
                        user_id=guardian_id,
                        type='credit_allocation_needed',
                        title='Credit Allocation Required for Course Enrollment',
                        message=f'{student.profile.get("name", student.email)} wants to enroll in "{course.title}" which requires {credits_required} credits. Please allocate credits to this student.',
                        data={
                            'student_id': student_id,
                            'student_name': student.profile.get('name', student.email),
                            'course_id': course_id,
                            'course_title': course.title,
                            'credits_required': credits_required,
                            'action_required': 'credit_allocation'
                        }
                    )
                    db.session.add(notification)
                    db.session.commit()
                    
                    return jsonify({
                        'error': f'No credit allocation found for student. Guardian has been notified to allocate {credits_required} credits.'
                    }), 400
                else:
                    return jsonify({
                        'error': 'No credit allocation found for student and no guardian to allocate credits.'
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
                transaction_type='course_enrollment',
                credits=credits_required,
                description=f'Course enrollment: {course.title}',
                related_enrollment_id=None  # Will be set after enrollment creation
            )
            db.session.add(transaction)
        
        # Create enrollment with active status (credits already deducted)
        enrollment = Enrollment(
            id=f"enrollment_{uuid.uuid4().hex[:8]}",
            student_id=student_id,
            course_id=course_id,
            guardian_id=guardian_id,
            status='active',
            credits_used=credits_required
        )
        
        db.session.add(enrollment)
        db.session.flush()  # Get enrollment ID
        
        # Update transaction with enrollment ID
        if credits_required > 0:
            transaction.related_enrollment_id = enrollment.id
        
        db.session.commit()
        
        return jsonify({
            'enrollment': enrollment.to_dict(),
            'message': f'Successfully enrolled in course! {credits_required} credits used.',
            'credits_used': credits_required,
            'remaining_credits': allocation.remaining_credits if credits_required > 0 else None
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/courses/<string:course_id>/tutors', methods=['POST'])
@jwt_required()
def assign_tutor_to_course(course_id):
    """Assign single or multiple tutors to course (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        data = request.get_json()
        
        # Support both single tutor (tutorId) and multiple tutors (tutorIds)
        tutor_id = data.get('tutorId')
        tutor_ids = data.get('tutorIds', [])
        
        # If single tutor provided, convert to list
        if tutor_id:
            tutor_ids = [tutor_id]
        
        if not tutor_ids:
            return jsonify({'error': 'At least one tutor ID is required'}), 400
        
        assigned_tutors = []
        already_assigned = []
        not_found = []
        
        for tid in tutor_ids:
            tutor = User.query.get(tid)
            if not tutor or not tutor.has_role('tutor'):
                tutor = None
            if not tutor:
                not_found.append(tid)
                continue
                
            if tutor in course.tutors:
                already_assigned.append(tutor.profile.get('name', tutor.email))
                continue
            
            course.tutors.append(tutor)
            assigned_tutors.append(tutor.profile.get('name', tutor.email))
        
        if assigned_tutors:
            db.session.commit()
            
            # Broadcast course assignment event to assigned tutors
            print(f"🔔 Broadcasting course assignment events for {len(tutor_ids)} tutors")
            for tid in tutor_ids:
                if tid not in [t for t in not_found]:  # Only notify successfully assigned tutors
                    print(f"🔔 Broadcasting event to tutor {tid} for course {course.title}")
                    websocket_service.broadcast_admin_event(
                        event_category=EventCategory.COURSE_UPDATE,
                        event_data={
                            'action': 'course_assigned',
                            'course': course.to_dict(),
                            'tutor_id': tid,
                            'assigned_by': current_user.profile.get('name', current_user.email),
                            'timestamp': datetime.utcnow().isoformat()
                        },
                        affected_entities=[
                            {'type': 'course', 'id': course_id},
                            {'type': 'user', 'id': tid}
                        ]
                    )
                    print(f"✅ Event broadcasted successfully for tutor {tid}")
        
        # Prepare response message
        messages = []
        if assigned_tutors:
            messages.append(f"Successfully assigned {len(assigned_tutors)} tutor(s): {', '.join(assigned_tutors)}")
        if already_assigned:
            messages.append(f"Already assigned: {', '.join(already_assigned)}")
        if not_found:
            messages.append(f"Tutors not found: {', '.join(not_found)}")
        
        return jsonify({
            'message': '; '.join(messages),
            'assignedCount': len(assigned_tutors),
            'alreadyAssignedCount': len(already_assigned),
            'notFoundCount': len(not_found),
            'course': course.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/courses/<string:course_id>/tutors/<string:tutor_id>', methods=['DELETE'])
@jwt_required()
def remove_tutor_from_course(course_id, tutor_id):
    """Remove tutor from course (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        tutor = User.query.get(tutor_id)
        if not tutor or tutor not in course.tutors:
            return jsonify({'error': 'Tutor not assigned to this course'}), 404
        
        course.tutors.remove(tutor)
        db.session.commit()
        
        return jsonify({
            'message': 'Tutor removed from course successfully',
            'course': course.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/courses/<string:course_id>/tutors/bulk', methods=['POST'])
@jwt_required()
def bulk_manage_tutors(course_id):
    """Bulk assign or remove tutors from course (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        data = request.get_json()
        action = data.get('action')  # 'assign' or 'remove'
        tutor_ids = data.get('tutorIds', [])
        
        if not action or action not in ['assign', 'remove']:
            return jsonify({'error': 'Valid action (assign or remove) is required'}), 400
        
        if not tutor_ids:
            return jsonify({'error': 'At least one tutor ID is required'}), 400
        
        processed_tutors = []
        already_processed = []
        not_found = []
        
        for tid in tutor_ids:
            tutor = User.query.get(tid)
            if not tutor or not tutor.has_role('tutor'):
                tutor = None
            if not tutor:
                not_found.append(tid)
                continue
            
            if action == 'assign':
                if tutor in course.tutors:
                    already_processed.append(tutor.profile.get('name', tutor.email))
                    continue
                course.tutors.append(tutor)
                processed_tutors.append(tutor.profile.get('name', tutor.email))
            
            elif action == 'remove':
                if tutor not in course.tutors:
                    already_processed.append(tutor.profile.get('name', tutor.email))
                    continue
                course.tutors.remove(tutor)
                processed_tutors.append(tutor.profile.get('name', tutor.email))
        
        if processed_tutors:
            db.session.commit()
        
        # Prepare response message
        action_word = 'assigned' if action == 'assign' else 'removed'
        already_word = 'already assigned' if action == 'assign' else 'not assigned'
        
        messages = []
        if processed_tutors:
            messages.append(f"Successfully {action_word} {len(processed_tutors)} tutor(s): {', '.join(processed_tutors)}")
        if already_processed:
            messages.append(f"{already_word.title()}: {', '.join(already_processed)}")
        if not_found:
            messages.append(f"Tutors not found: {', '.join(not_found)}")
        
        return jsonify({
            'message': '; '.join(messages),
            'action': action,
            'processedCount': len(processed_tutors),
            'alreadyProcessedCount': len(already_processed),
            'notFoundCount': len(not_found),
            'course': course.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/courses/<string:course_id>/tutors', methods=['GET'])
@jwt_required()
def get_course_tutors(course_id):
    """Get all tutors assigned to a course"""
    try:
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        tutors_data = [
            {
                'id': t.id,
                'name': t.profile.get('name', t.email),
                'email': t.email,
                'subjects': t.profile.get('subjects', []),
                'rating': t.profile.get('rating'),
                'totalSessions': t.profile.get('totalSessions', 0),
                'status': 'active' if t.is_active else 'inactive'
            } for t in course.tutors
        ]
        
        return jsonify({
            'tutors': tutors_data,
            'totalTutors': len(tutors_data),
            'courseId': course_id,
            'courseTitle': course.title
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/courses/<string:course_id>/students', methods=['GET'])
@jwt_required()
def get_course_students(course_id):
    """Get all students enrolled in a course"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only admin and tutors can access course students
        if current_user.account_type not in ['admin', 'tutor']:
            return jsonify({'error': 'Admin or tutor access required'}), 403
            
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        # Get active enrollments for this course
        enrollments = Enrollment.query.filter_by(
            course_id=course_id,
            status='active'
        ).join(User, Enrollment.student_id == User.id).all()
        
        students = []
        for enrollment in enrollments:
            # Get student profile name, fallback to email if not available
            student_name = enrollment.student.email  # Default fallback
            if hasattr(enrollment.student, 'profile') and enrollment.student.profile:
                student_name = enrollment.student.profile.get('name', enrollment.student.email)
            
            student_data = {
                'id': enrollment.student.id,
                'name': student_name,
                'email': enrollment.student.email,
                'enrollmentDate': enrollment.enrolled_date.isoformat() if enrollment.enrolled_date else None,
                'status': enrollment.status,
                'progress': {
                    'completedModules': enrollment.completed_modules if hasattr(enrollment, 'completed_modules') else 0,
                    'totalModules': len(course.modules) if course.modules else 0
                },
                'enrollmentId': enrollment.id
            }
            students.append(student_data)
            
        return jsonify({
            'students': students,
            'total': len(students),
            'courseId': course_id,
            'courseName': course.title
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/courses/tutor-assignment-preview', methods=['POST'])
@jwt_required()
def preview_tutor_assignment():
    """Preview which tutors would be auto-assigned for given course parameters (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        data = request.get_json()
        grade_level = data.get('gradeLevel')
        subject = data.get('subject')

        if not grade_level or not subject:
            return jsonify({'error': 'Both gradeLevel and subject are required'}), 400

        preview_data = TutorAssignmentService.get_assignment_preview(grade_level, subject)

        return jsonify({
            'preview': preview_data,
            'parameters': {
                'gradeLevel': grade_level,
                'subject': subject
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/courses/<string:course_id>/availability', methods=['GET'])
@jwt_required()
def get_course_availability(course_id):
    """Get date-specific tutor availability for a course"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only admin users can access course availability
        if current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
        
        # Get optional module ID from query parameters
        module_id = request.args.get('moduleId')
        
        # Get date-specific availability
        availability_data = AvailabilityService.get_course_tutor_availability(
            course_id=course_id, 
            module_id=module_id
        )
        
        return jsonify(availability_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500