"""
Bulk Import API Endpoints
Handles bulk import of tutor qualifications from CSV data
"""

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.api import api_bp
from app.models import User, Course, TutorQualification, BulkImportJob
from app import db
import logging


@api_bp.route('/admin/tutors/bulk-import', methods=['POST'])
@jwt_required()
def bulk_import_tutors():
    """Bulk import tutors from CSV data (admin only)"""
    try:
        from app.services.tutor_qualification_service import TutorQualificationService

        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Support both old format (csvData) and new format (csv_data)
        csv_data = data.get('csvData') or data.get('csv_data')
        if not csv_data:
            return jsonify({'error': 'CSV data is required'}), 400

        # Extract options from both old and new format
        import_settings = data.get('import_settings', {})
        options = {
            'dry_run': data.get('dryRun', data.get('dry_run', False)),
            'skip_existing': data.get('skipExisting', import_settings.get('skip_existing', False)),
            'auto_qualify': data.get('autoQualify', import_settings.get('auto_qualify', True)),
            'notification_email': data.get('notificationEmail', data.get('notification_email', '')),
            'auto_add_headers': True  # Always enable auto-header detection for paste CSV text
        }

        service = TutorQualificationService()
        result = service.process_bulk_import(csv_data, current_user_id, options)

        return jsonify(result), 200

    except Exception as e:
        logging.error(f"Bulk import error: {str(e)}")
        return jsonify({'error': f'Import failed: {str(e)}'}), 500


@api_bp.route('/admin/tutors/bulk-import-file', methods=['POST'])
@jwt_required()
def bulk_import_tutors_file():
    """Bulk import tutors from uploaded CSV file (admin only)"""
    try:
        from app.services.tutor_qualification_service import TutorQualificationService

        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        if 'csv_file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        file = request.files['csv_file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Validate file type
        if not file.filename.lower().endswith('.csv'):
            return jsonify({'error': 'File must be a CSV file'}), 400

        # Get options from form data
        options = {
            'dry_run': request.form.get('dryRun', 'false').lower() == 'true',
            'skip_existing': request.form.get('skipExisting', 'false').lower() == 'true',
            'auto_qualify': request.form.get('autoQualify', 'true').lower() == 'true',
            'notification_email': request.form.get('notificationEmail', ''),
            'auto_add_headers': True  # Enable auto-header detection for file uploads
        }

        service = TutorQualificationService()
        result = service.process_bulk_import_file(file, current_user_id, options)

        return jsonify(result), 200

    except Exception as e:
        logging.error(f"Bulk import file error: {str(e)}")
        return jsonify({'error': f'Import failed: {str(e)}'}), 500


@api_bp.route('/admin/tutors/qualify', methods=['POST'])
@jwt_required()
def manually_qualify_tutor():
    """Manually qualify a tutor for a course (admin only)"""
    try:
        from app.services.tutor_qualification_service import TutorQualificationService

        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        data = request.get_json()

        # Handle multiple payload formats for backward compatibility
        email = data.get('email') or data.get('user_email')
        course_id = data.get('courseId') or data.get('course_id')
        reason = data.get('reason') or data.get('notes', '')

        if not data or not email or not course_id:
            return jsonify({'error': 'Email and course ID are required'}), 400

        service = TutorQualificationService()
        result = service.manually_qualify_tutor(
            email=email,
            course_id=course_id,
            admin_user_id=current_user_id,
            reason=reason
        )

        return jsonify(result), 200 if result['success'] else 400

    except Exception as e:
        logging.error(f"Manual qualification error: {str(e)}")
        return jsonify({'error': f'Qualification failed: {str(e)}'}), 500


@api_bp.route('/admin/tutors/qualifications', methods=['GET'])
@jwt_required()
def get_tutor_qualifications():
    """Get all tutor qualifications with filtering (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        course_id = request.args.get('course_id')
        user_id = request.args.get('user_id')
        status = request.args.get('status', 'active')  # active, inactive, all

        query = TutorQualification.query.join(User, TutorQualification.user_id == User.id).join(Course)

        if course_id:
            query = query.filter(TutorQualification.course_id == course_id)
        if user_id:
            query = query.filter(TutorQualification.user_id == user_id)
        if status == 'active':
            query = query.filter(TutorQualification.is_active == True)
        elif status == 'inactive':
            query = query.filter(TutorQualification.is_active == False)

        qualifications = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        result_data = []
        for qual in qualifications.items:
            qual_dict = qual.to_dict()
            qual_dict['user'] = {
                'id': qual.user.id,
                'email': qual.user.email,
                'name': f"{qual.user.profile.get('firstName', '')} {qual.user.profile.get('lastName', '')}".strip() or qual.user.email
            }
            qual_dict['course'] = {
                'id': qual.course.id,
                'title': qual.course.title
            }
            result_data.append(qual_dict)

        return jsonify({
            'qualifications': result_data,
            'total': qualifications.total,
            'pages': qualifications.pages,
            'currentPage': page,
            'hasNext': qualifications.has_next,
            'hasPrev': qualifications.has_prev
        }), 200

    except Exception as e:
        logging.error(f"Get qualifications error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/tutors/qualifications/<string:qualification_id>', methods=['DELETE'])
@jwt_required()
def revoke_tutor_qualification(qualification_id):
    """Revoke a tutor qualification (admin only)"""
    try:
        from app.services.tutor_qualification_service import TutorQualificationService

        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        data = request.get_json() or {}
        reason = data.get('reason', '')

        service = TutorQualificationService()
        result = service.revoke_qualification(qualification_id, current_user_id, reason)

        return jsonify(result), 200 if result['success'] else 400

    except Exception as e:
        logging.error(f"Revoke qualification error: {str(e)}")
        return jsonify({'error': f'Revocation failed: {str(e)}'}), 500


@api_bp.route('/admin/courses/settings', methods=['GET'])
@jwt_required()
def get_all_course_settings():
    """Get qualification settings for all courses (admin only)"""
    try:
        from app.models import CourseSettings

        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        # Get all courses
        courses = Course.query.all()
        settings = []

        for course in courses:
            # Get or create settings for each course
            course_settings = CourseSettings.get_or_create_for_course(course.id, current_user_id)
            setting_dict = course_settings.to_dict()
            setting_dict['course'] = {
                'id': course.id,
                'title': course.title
            }
            settings.append(setting_dict)

        return jsonify({
            'settings': settings,
            'total': len(settings)
        }), 200

    except Exception as e:
        logging.error(f"Get course settings error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/courses/<string:course_id>/settings', methods=['GET', 'PUT'])
@jwt_required()
def manage_course_settings(course_id):
    """Get or update settings for a specific course (admin only)"""
    try:
        from app.models import CourseSettings

        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        # Verify course exists
        course = Course.query.get(course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404

        if request.method == 'GET':
            # Get course settings
            settings = CourseSettings.get_or_create_for_course(course_id, current_user_id)
            setting_dict = settings.to_dict()
            setting_dict['course'] = {
                'id': course.id,
                'title': course.title
            }
            return jsonify(setting_dict), 200

        elif request.method == 'PUT':
            # Update course settings
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400

            settings = CourseSettings.get_or_create_for_course(course_id, current_user_id)

            # Update fields if provided
            if 'minScoreToTutor' in data:
                settings.min_score_to_tutor = float(data['minScoreToTutor'])
            if 'auto_qualify' in data:
                settings.auto_qualify = bool(data['auto_qualify'])
            if 'autoApproveTutors' in data:
                settings.auto_approve_tutors = bool(data['autoApproveTutors'])
            if 'manualApprovalRequired' in data:
                settings.manual_approval_required = bool(data['manualApprovalRequired'])
            if 'allowStudentTutors' in data:
                settings.allow_student_tutors = bool(data['allowStudentTutors'])
            if 'maxAttemptsBeforeTutorEligible' in data:
                settings.max_attempts_before_tutor_eligible = int(data['maxAttemptsBeforeTutorEligible'])

            settings.updated_by = current_user_id
            db.session.commit()

            return jsonify({
                'success': True,
                'settings': settings.to_dict()
            }), 200

    except Exception as e:
        db.session.rollback()
        logging.error(f"Course settings error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/bulk-import-jobs', methods=['GET'])
@jwt_required()
def get_bulk_import_jobs():
    """Get bulk import job history (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')  # Filter by status

        query = BulkImportJob.query.order_by(BulkImportJob.created_at.desc())

        if status:
            query = query.filter(BulkImportJob.job_status == status)

        jobs = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        result_data = []
        for job in jobs.items:
            job_dict = job.to_dict()
            job_dict['importedBy'] = {
                'id': job.imported_by_user.id,
                'email': job.imported_by_user.email
            }
            result_data.append(job_dict)

        return jsonify({
            'jobs': result_data,
            'total': jobs.total,
            'pages': jobs.pages,
            'currentPage': page,
            'hasNext': jobs.has_next,
            'hasPrev': jobs.has_prev
        }), 200

    except Exception as e:
        logging.error(f"Get import jobs error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@api_bp.route('/admin/bulk-import-jobs/<string:job_id>', methods=['GET'])
@jwt_required()
def get_bulk_import_job_details(job_id):
    """Get detailed information about a specific import job (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)

        if not current_user or current_user.account_type != 'admin':
            return jsonify({'error': 'Admin access required'}), 403

        job = BulkImportJob.query.get(job_id)
        if not job:
            return jsonify({'error': 'Import job not found'}), 404

        job_dict = job.to_dict()
        job_dict['importedBy'] = {
            'id': job.imported_by_user.id,
            'email': job.imported_by_user.email
        }

        return jsonify(job_dict), 200

    except Exception as e:
        logging.error(f"Get import job details error: {str(e)}")
        return jsonify({'error': str(e)}), 500