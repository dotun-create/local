"""
Tutor Qualification Service
Handles business logic for bulk import of tutor qualifications
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from flask import current_app
from sqlalchemy.exc import IntegrityError
from app import db
from app.models import User, Course, TutorQualification, CourseSettings, BulkImportJob
from app.utils.csv_parser import CSVParser


class TutorQualificationService:
    """Service for managing tutor qualifications and bulk imports"""

    def __init__(self):
        self.csv_parser = CSVParser()

    def process_bulk_import(
        self,
        csv_data: str,
        admin_user_id: str,
        options: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Process bulk import of tutor qualifications

        Args:
            csv_data: Raw CSV data string
            admin_user_id: ID of admin user performing import
            options: Import options (dry_run, skip_existing, etc.)

        Returns:
            Dict: Import results
        """
        if options is None:
            options = {}

        # Create import job record
        import_job = BulkImportJob(
            imported_by=admin_user_id,
            import_type='csv_text',
            options=options,
            job_status='processing'
        )
        db.session.add(import_job)
        db.session.flush()  # Get the ID

        try:
            # Parse and validate CSV
            auto_add_headers = options.get('auto_add_headers', False)
            valid_records, parse_errors = self.csv_parser.parse_csv_text(csv_data, auto_add_headers)

            if parse_errors:
                import_job.job_status = 'failed'
                import_job.errors = parse_errors
                import_job.completed_at = datetime.utcnow()
                db.session.commit()
                return self._build_error_result(import_job, parse_errors)

            # Validate batch constraints
            batch_errors = self.csv_parser.validate_batch_constraints(valid_records)
            if batch_errors:
                import_job.job_status = 'failed'
                import_job.errors = batch_errors
                import_job.completed_at = datetime.utcnow()
                db.session.commit()
                return self._build_error_result(import_job, batch_errors)

            # Update job with record count
            import_job.total_records = len(valid_records)

            # Process records
            result = self._process_qualification_records(
                valid_records, admin_user_id, options, import_job
            )

            # Update job status
            if result['successful'] > 0 or options.get('dry_run', False):
                import_job.job_status = 'completed'
            else:
                import_job.job_status = 'failed'

            import_job.successful_records = result['successful']
            import_job.failed_records = result['failed']
            import_job.skipped_records = result['skipped']
            import_job.errors = result['errors']
            import_job.results = result
            import_job.completed_at = datetime.utcnow()

            db.session.commit()
            return result

        except Exception as e:
            db.session.rollback()
            import_job.job_status = 'failed'
            import_job.errors = [f"Unexpected error: {str(e)}"]
            import_job.completed_at = datetime.utcnow()
            db.session.commit()
            current_app.logger.error(f"Bulk import error: {str(e)}")
            raise

    def process_bulk_import_file(
        self,
        file,
        admin_user_id: str,
        options: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Process bulk import from uploaded file

        Args:
            file: Uploaded file object
            admin_user_id: ID of admin user performing import
            options: Import options

        Returns:
            Dict: Import results
        """
        if options is None:
            options = {}

        # Create import job record
        import_job = BulkImportJob(
            imported_by=admin_user_id,
            import_type='csv_file',
            file_name=file.filename,
            options=options,
            job_status='processing'
        )
        db.session.add(import_job)
        db.session.flush()

        try:
            # Parse file
            auto_add_headers = options.get('auto_add_headers', False)
            valid_records, parse_errors = self.csv_parser.parse_csv_file(file, auto_add_headers)

            # Continue with same processing logic as text import
            if parse_errors:
                import_job.job_status = 'failed'
                import_job.errors = parse_errors
                import_job.completed_at = datetime.utcnow()
                db.session.commit()
                return self._build_error_result(import_job, parse_errors)

            # Validate batch constraints
            batch_errors = self.csv_parser.validate_batch_constraints(valid_records)
            if batch_errors:
                import_job.job_status = 'failed'
                import_job.errors = batch_errors
                import_job.completed_at = datetime.utcnow()
                db.session.commit()
                return self._build_error_result(import_job, batch_errors)

            # Update job with record count
            import_job.total_records = len(valid_records)

            # Process records
            result = self._process_qualification_records(
                valid_records, admin_user_id, options, import_job
            )

            # Update job status
            if result['successful'] > 0 or options.get('dry_run', False):
                import_job.job_status = 'completed'
            else:
                import_job.job_status = 'failed'

            import_job.successful_records = result['successful']
            import_job.failed_records = result['failed']
            import_job.skipped_records = result['skipped']
            import_job.errors = result['errors']
            import_job.results = result
            import_job.completed_at = datetime.utcnow()

            db.session.commit()
            return result

        except Exception as e:
            db.session.rollback()
            import_job.job_status = 'failed'
            import_job.errors = [f"Unexpected error: {str(e)}"]
            import_job.completed_at = datetime.utcnow()
            db.session.commit()
            current_app.logger.error(f"Bulk import file error: {str(e)}")
            raise

    def _process_qualification_records(
        self,
        records: List[Dict[str, Any]],
        admin_user_id: str,
        options: Dict[str, Any],
        import_job: BulkImportJob
    ) -> Dict[str, Any]:
        """
        Process individual qualification records

        Args:
            records: List of validated CSV records
            admin_user_id: ID of admin user
            options: Import options
            import_job: Import job record

        Returns:
            Dict: Processing results
        """
        dry_run = options.get('dry_run', False)
        skip_existing = options.get('skip_existing', False)
        auto_qualify = options.get('auto_qualify', True)

        results = {
            'total': len(records),
            'successful': 0,
            'failed': 0,
            'skipped': 0,
            'errors': [],
            'qualified': [],
            'preview': dry_run
        }

        for i, record in enumerate(records, 1):
            try:
                result = self._process_single_qualification(
                    record, admin_user_id, skip_existing, auto_qualify, dry_run
                )

                if result['status'] == 'success':
                    results['successful'] += 1
                    results['qualified'].append(result['qualification'])
                elif result['status'] == 'skipped':
                    results['skipped'] += 1
                else:
                    results['failed'] += 1
                    results['errors'].append(f"Record {i}: {result['error']}")

            except Exception as e:
                results['failed'] += 1
                results['errors'].append(f"Record {i}: Unexpected error - {str(e)}")
                current_app.logger.error(f"Error processing record {i}: {str(e)}")

        return results

    def _process_single_qualification(
        self,
        record: Dict[str, Any],
        admin_user_id: str,
        skip_existing: bool,
        auto_qualify: bool,
        dry_run: bool
    ) -> Dict[str, Any]:
        """
        Process a single qualification record

        Args:
            record: Single CSV record
            admin_user_id: ID of admin user
            skip_existing: Whether to skip existing qualifications
            auto_qualify: Whether to auto-qualify based on scores
            dry_run: Whether this is a dry run

        Returns:
            Dict: Processing result
        """
        email = record['email']
        course_id = record['course_id']
        score = record['score']
        qualification_date = record['qualification_date']

        # Check if user exists
        user = User.query.filter_by(email=email).first()
        if not user:
            return {
                'status': 'error',
                'error': f'User not found: {email}'
            }

        # Check if course exists
        course = Course.query.filter_by(id=course_id).first()
        if not course:
            return {
                'status': 'error',
                'error': f'Course not found: {course_id}'
            }

        # Check if qualification already exists
        existing_qual = TutorQualification.query.filter_by(
            user_id=user.id,
            course_id=course.id,
            is_active=True
        ).first()

        if existing_qual:
            if skip_existing:
                return {
                    'status': 'skipped',
                    'error': f'Qualification already exists: {email} - {course_id}'
                }
            else:
                return {
                    'status': 'error',
                    'error': f'Qualification already exists: {email} - {course_id}'
                }

        # Get course settings to check qualification requirements
        course_settings = CourseSettings.get_or_create_for_course(course.id, admin_user_id)

        # Check if score meets requirements (if auto_qualify is enabled)
        if auto_qualify and score < course_settings.min_score_to_tutor:
            return {
                'status': 'error',
                'error': f'Score {score} below minimum {course_settings.min_score_to_tutor} for {course_id}'
            }

        # If dry run, don't actually create the qualification
        if dry_run:
            return {
                'status': 'success',
                'qualification': {
                    'email': email,
                    'course': course.title,
                    'courseId': course_id,
                    'score': score,
                    'qualificationDate': qualification_date.isoformat(),
                    'preview': True
                }
            }

        # Create qualification
        try:
            qualification = TutorQualification(
                user_id=user.id,
                course_id=course.id,
                qualification_type='bulk_import',
                qualifying_score=score,
                qualified_at=qualification_date,
                approved_by=admin_user_id,
                is_active=True
            )

            db.session.add(qualification)
            db.session.flush()  # Get the ID

            # Add tutor role to user if not already present
            if not user.has_role('tutor'):
                user.add_role('tutor')

            # Assign tutor to course if not already assigned
            if course not in user.taught_courses:
                user.taught_courses.append(course)

            return {
                'status': 'success',
                'qualification': {
                    'id': qualification.id,
                    'email': email,
                    'course': course.title,
                    'courseId': course_id,
                    'score': score,
                    'qualificationDate': qualification_date.isoformat()
                }
            }

        except IntegrityError as e:
            db.session.rollback()
            return {
                'status': 'error',
                'error': f'Database integrity error: {str(e)}'
            }

    def manually_qualify_tutor(
        self,
        email: str,
        course_id: str,
        admin_user_id: str,
        reason: str = None
    ) -> Dict[str, Any]:
        """
        Manually qualify a tutor for a course

        Args:
            email: User email
            course_id: Course ID
            admin_user_id: Admin user ID
            reason: Reason for manual qualification

        Returns:
            Dict: Result of qualification
        """
        try:
            # Validate user exists
            user = User.query.filter_by(email=email).first()
            if not user:
                return {'success': False, 'error': f'User not found: {email}'}

            # Validate course exists
            course = Course.query.filter_by(id=course_id).first()
            if not course:
                return {'success': False, 'error': f'Course not found: {course_id}'}

            # Check for ANY existing qualification (active OR revoked)
            existing_qual = TutorQualification.query.filter_by(
                user_id=user.id,
                course_id=course.id
            ).first()

            if existing_qual:
                if existing_qual.is_active:
                    return {'success': False, 'error': 'User already qualified for this course'}
                else:
                    # Reactivate the revoked qualification
                    existing_qual.is_active = True
                    existing_qual.revoked_by = None
                    existing_qual.revoked_at = None
                    existing_qual.revoke_reason = None
                    existing_qual.qualified_at = datetime.utcnow()
                    existing_qual.approved_by = admin_user_id
                    existing_qual.qualification_type = 'manual'
                    qualification = existing_qual
                    current_app.logger.info(f"Reactivated qualification {existing_qual.id} for user {email}")
            else:
                # Create new qualification only if none exists
                qualification = TutorQualification(
                    user_id=user.id,
                    course_id=course.id,
                    qualification_type='manual',
                    qualified_at=datetime.utcnow(),
                    approved_by=admin_user_id,
                    is_active=True
                )
                db.session.add(qualification)
                current_app.logger.info(f"Created new qualification for user {email}")

            # Add tutor role if not present
            if not user.has_role('tutor'):
                user.add_role('tutor')

            # Assign tutor to course if not already assigned
            if course not in user.taught_courses:
                user.taught_courses.append(course)

            db.session.commit()

            # Determine if this was a reactivation or new qualification
            action = "reactivated" if existing_qual else "created"

            return {
                'success': True,
                'qualification': qualification.to_dict(),
                'action': action,
                'message': f'Successfully {action} tutor qualification for {user.email}'
            }

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Manual qualification error: {str(e)}")
            return {'success': False, 'error': f'Unexpected error: {str(e)}'}

    def revoke_qualification(
        self,
        qualification_id: str,
        admin_user_id: str,
        reason: str = None
    ) -> Dict[str, Any]:
        """
        Revoke a tutor qualification

        Args:
            qualification_id: Qualification ID to revoke
            admin_user_id: Admin user ID
            reason: Reason for revocation

        Returns:
            Dict: Result of revocation
        """
        try:
            qualification = TutorQualification.query.get(qualification_id)
            if not qualification:
                return {'success': False, 'error': 'Qualification not found'}

            if not qualification.is_active:
                return {'success': False, 'error': 'Qualification already inactive'}

            # Revoke qualification
            qualification.is_active = False
            qualification.revoked_by = admin_user_id
            qualification.revoked_at = datetime.utcnow()
            qualification.revoke_reason = reason

            # Remove tutor from course if they have no other active qualifications for this course
            user = qualification.user
            course = qualification.course
            other_active_quals = TutorQualification.query.filter_by(
                user_id=user.id,
                course_id=course.id,
                is_active=True
            ).filter(TutorQualification.id != qualification.id).count()

            if other_active_quals == 0 and course in user.taught_courses:
                user.taught_courses.remove(course)

            db.session.commit()

            return {
                'success': True,
                'message': 'Qualification revoked successfully'
            }

        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Revoke qualification error: {str(e)}")
            return {'success': False, 'error': f'Unexpected error: {str(e)}'}

    def _build_error_result(self, import_job: BulkImportJob, errors: List[str]) -> Dict[str, Any]:
        """Build error result for failed imports"""
        return {
            'total': 0,
            'successful': 0,
            'failed': len(errors),
            'skipped': 0,
            'errors': errors,
            'qualified': [],
            'jobId': import_job.id,
            'preview': False
        }