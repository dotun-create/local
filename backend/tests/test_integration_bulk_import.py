#!/usr/bin/env python3
"""
Integration Tests for Bulk Import Functionality
Tests complete workflows from API call to database changes
"""

import unittest
import json
import os
import sys

# Add the backend directory to Python path for imports
backend_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_path)

from datetime import datetime, timedelta
from flask import Flask
from flask_jwt_extended import create_access_token

# Import the main app and components
from app import create_app, db
from app.models import User, Course, TutorQualification, CourseSettings, BulkImportJob


class TestBulkImportIntegration(unittest.TestCase):
    """Integration tests for the complete bulk import workflow"""

    def setUp(self):
        """Set up Flask app and test database"""
        self.app = create_app('testing')
        self.app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()
        db.create_all()

        # Create test users
        self.admin_user = User(
            id='admin-integration-123',
            email='admin-integration@example.com',
            account_type='admin'
        )
        self.admin_user.set_password('admin123')

        self.tutor_user = User(
            id='tutor-integration-123',
            email='tutor-integration@example.com',
            account_type='student'  # Will become tutor through qualification
        )
        self.tutor_user.set_password('tutor123')

        self.student_user = User(
            id='student-integration-123',
            email='student-integration@example.com',
            account_type='student'
        )
        self.student_user.set_password('student123')

        # Create test courses
        self.math_course = Course(
            id='math-course-123',
            title='Advanced Mathematics',
            description='Integration test math course'
        )

        self.science_course = Course(
            id='science-course-123',
            title='Physics Fundamentals',
            description='Integration test science course'
        )

        # Add all to database
        db.session.add_all([
            self.admin_user, self.tutor_user, self.student_user,
            self.math_course, self.science_course
        ])
        db.session.commit()

        # Create access token
        with self.app.app_context():
            self.admin_token = create_access_token(identity='admin-integration-123')

    def tearDown(self):
        """Clean up test database"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_complete_bulk_import_workflow(self):
        """Test the complete bulk import workflow end-to-end"""
        # Step 1: Verify initial state
        initial_qualifications = TutorQualification.query.count()
        initial_jobs = BulkImportJob.query.count()
        self.assertEqual(initial_qualifications, 0)
        self.assertEqual(initial_jobs, 0)

        # Step 2: Perform bulk import
        csv_data = f"""email,course_id,score,qualification_date
tutor-integration@example.com,{self.math_course.id},95,2024-01-15
tutor-integration@example.com,{self.science_course.id},88,2024-01-20
student-integration@example.com,{self.math_course.id},92,2024-01-25"""

        response = self.client.post(
            '/api/admin/tutors/bulk-import',
            json={
                'csvData': csv_data,
                'dryRun': False,
                'skipExisting': False,
                'autoQualify': True
            },
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        # Step 3: Verify API response
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['total'], 3)
        self.assertEqual(data['successful'], 3)
        self.assertEqual(data['failed'], 0)
        self.assertFalse(data['preview'])

        # Step 4: Verify database state
        final_qualifications = TutorQualification.query.count()
        final_jobs = BulkImportJob.query.count()
        self.assertEqual(final_qualifications, 3)  # 3 new qualifications
        self.assertEqual(final_jobs, 1)           # 1 import job created

        # Step 5: Verify specific qualifications were created
        tutor_math_qual = TutorQualification.query.filter_by(
            user_id='tutor-integration-123',
            course_id='math-course-123'
        ).first()
        self.assertIsNotNone(tutor_math_qual)
        self.assertTrue(tutor_math_qual.is_active)
        self.assertEqual(tutor_math_qual.qualifying_score, 95)

        # Step 6: Verify tutor role was added
        refreshed_tutor = User.query.get('tutor-integration-123')
        refreshed_student = User.query.get('student-integration-123')
        self.assertTrue(refreshed_tutor.has_role('tutor'))
        self.assertTrue(refreshed_student.has_role('tutor'))

        # Step 7: Verify import job record
        import_job = BulkImportJob.query.first()
        self.assertEqual(import_job.job_status, 'completed')
        self.assertEqual(import_job.total_records, 3)
        self.assertEqual(import_job.successful_records, 3)
        self.assertEqual(import_job.failed_records, 0)
        self.assertEqual(import_job.imported_by, 'admin-integration-123')

    def test_dry_run_workflow(self):
        """Test dry run workflow doesn't create actual records"""
        # Initial state
        initial_qualifications = TutorQualification.query.count()
        initial_jobs = BulkImportJob.query.count()

        # Dry run import
        csv_data = f"""email,course_id,score,qualification_date
tutor-integration@example.com,{self.math_course.id},95,2024-01-15"""

        response = self.client.post(
            '/api/admin/tutors/bulk-import',
            json={
                'csvData': csv_data,
                'dryRun': True
            },
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        # Verify response
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['preview'])
        self.assertEqual(data['successful'], 1)

        # Verify no database changes
        final_qualifications = TutorQualification.query.count()
        final_jobs = BulkImportJob.query.count()
        self.assertEqual(final_qualifications, initial_qualifications)
        self.assertEqual(final_jobs, initial_jobs + 1)  # Job record is still created

    def test_skip_existing_workflow(self):
        """Test skip existing qualifications workflow"""
        # Create an existing qualification
        existing_qual = TutorQualification(
            user_id='tutor-integration-123',
            course_id='math-course-123',
            qualification_type='manual',
            is_active=True
        )
        db.session.add(existing_qual)
        db.session.commit()

        # Try to import same qualification
        csv_data = f"""email,course_id,score,qualification_date
tutor-integration@example.com,{self.math_course.id},95,2024-01-15
tutor-integration@example.com,{self.science_course.id},88,2024-01-20"""

        response = self.client.post(
            '/api/admin/tutors/bulk-import',
            json={
                'csvData': csv_data,
                'skipExisting': True
            },
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        # Verify response
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['total'], 2)
        self.assertEqual(data['successful'], 1)  # Only science course
        self.assertEqual(data['skipped'], 1)    # Math course skipped

        # Verify only one new qualification created
        science_qual = TutorQualification.query.filter_by(
            user_id='tutor-integration-123',
            course_id='science-course-123'
        ).first()
        self.assertIsNotNone(science_qual)

    def test_manual_qualification_workflow(self):
        """Test manual qualification workflow"""
        # Manual qualify a user
        response = self.client.post(
            '/api/admin/tutors/qualify',
            json={
                'email': 'tutor-integration@example.com',
                'courseId': self.math_course.id,
                'reason': 'Integration test manual qualification'
            },
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        # Verify response
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])

        # Verify qualification created
        qualification = TutorQualification.query.filter_by(
            user_id='tutor-integration-123',
            course_id='math-course-123'
        ).first()
        self.assertIsNotNone(qualification)
        self.assertEqual(qualification.qualification_type, 'manual')
        self.assertTrue(qualification.is_active)

    def test_qualification_revocation_workflow(self):
        """Test qualification revocation workflow"""
        # Create a qualification first
        qualification = TutorQualification(
            user_id='tutor-integration-123',
            course_id='math-course-123',
            qualification_type='manual',
            is_active=True
        )
        db.session.add(qualification)
        db.session.commit()

        # Revoke the qualification
        response = self.client.delete(
            f'/api/admin/tutors/qualifications/{qualification.id}',
            json={'reason': 'Integration test revocation'},
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        # Verify response
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])

        # Verify qualification was revoked
        refreshed_qual = TutorQualification.query.get(qualification.id)
        self.assertFalse(refreshed_qual.is_active)
        self.assertEqual(refreshed_qual.revoke_reason, 'Integration test revocation')

    def test_course_settings_workflow(self):
        """Test course settings management workflow"""
        # Get initial settings
        response = self.client.get(
            f'/api/admin/courses/{self.math_course.id}/settings',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('course', data)
        self.assertEqual(data['course']['title'], 'Advanced Mathematics')

        # Update settings
        new_settings = {
            'minScoreToTutor': 90.0,
            'autoApproveTutors': False,
            'manualApprovalRequired': True
        }

        response = self.client.put(
            f'/api/admin/courses/{self.math_course.id}/settings',
            json=new_settings,
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['settings']['minScoreToTutor'], 90.0)

    def test_bulk_import_jobs_history_workflow(self):
        """Test bulk import jobs history workflow"""
        # Create some import jobs first by doing imports
        csv_data = f"""email,course_id,score,qualification_date
tutor-integration@example.com,{self.math_course.id},95,2024-01-15"""

        # First import
        self.client.post(
            '/api/admin/tutors/bulk-import',
            json={'csvData': csv_data, 'dryRun': True},
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        # Second import
        self.client.post(
            '/api/admin/tutors/bulk-import',
            json={'csvData': csv_data, 'dryRun': False},
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        # Get jobs history
        response = self.client.get(
            '/api/admin/bulk-import-jobs',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('jobs', data)
        self.assertEqual(data['total'], 2)
        self.assertEqual(len(data['jobs']), 2)

        # Get specific job details
        job_id = data['jobs'][0]['id']
        response = self.client.get(
            f'/api/admin/bulk-import-jobs/{job_id}',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        self.assertEqual(response.status_code, 200)
        job_data = response.get_json()
        self.assertEqual(job_data['id'], job_id)
        self.assertIn('importedBy', job_data)

    def test_error_handling_workflow(self):
        """Test error handling in bulk import workflow"""
        # Test with invalid CSV data
        invalid_csv = """email,course_id,score,qualification_date
invalid-email,nonexistent-course,150,invalid-date"""

        response = self.client.post(
            '/api/admin/tutors/bulk-import',
            json={'csvData': invalid_csv},
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['successful'], 0)
        self.assertGreater(data['failed'], 0)
        self.assertGreater(len(data['errors']), 0)

        # Verify import job was still created with error status
        import_job = BulkImportJob.query.first()
        self.assertEqual(import_job.job_status, 'failed')
        self.assertGreater(len(import_job.errors), 0)

    def test_authentication_and_authorization_workflow(self):
        """Test authentication and authorization requirements"""
        csv_data = f"""email,course_id,score,qualification_date
tutor-integration@example.com,{self.math_course.id},95,2024-01-15"""

        # Test without token
        response = self.client.post(
            '/api/admin/tutors/bulk-import',
            json={'csvData': csv_data}
        )
        self.assertEqual(response.status_code, 401)

        # Test with non-admin user token
        student_token = create_access_token(identity='student-integration-123')
        response = self.client.post(
            '/api/admin/tutors/bulk-import',
            json={'csvData': csv_data},
            headers={'Authorization': f'Bearer {student_token}'}
        )
        self.assertEqual(response.status_code, 403)

        # Test all other endpoints require admin access
        endpoints_to_test = [
            ('GET', '/api/admin/tutors/qualifications'),
            ('GET', '/api/admin/courses/settings'),
            ('GET', '/api/admin/bulk-import-jobs'),
            ('POST', '/api/admin/tutors/qualify', {'email': 'test@test.com', 'courseId': 'course-123'})
        ]

        for method, url, *args in endpoints_to_test:
            json_data = args[0] if args else None
            if method == 'GET':
                response = self.client.get(url, headers={'Authorization': f'Bearer {student_token}'})
            else:
                response = self.client.post(url, json=json_data, headers={'Authorization': f'Bearer {student_token}'})
            self.assertEqual(response.status_code, 403, f"Endpoint {url} should require admin access")


class TestBulkImportFileUpload(unittest.TestCase):
    """Integration tests for file upload functionality"""

    def setUp(self):
        """Set up Flask app and test database"""
        self.app = create_app('testing')
        self.app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()
        db.create_all()

        # Create admin user and course
        self.admin_user = User(
            id='admin-file-123',
            email='admin-file@example.com',
            account_type='admin'
        )
        self.admin_user.set_password('admin123')

        self.test_course = Course(
            id='file-course-123',
            title='File Upload Test Course'
        )

        self.test_user = User(
            id='file-user-123',
            email='fileuser@example.com',
            account_type='student'
        )

        db.session.add_all([self.admin_user, self.test_course, self.test_user])
        db.session.commit()

        with self.app.app_context():
            self.admin_token = create_access_token(identity='admin-file-123')

    def tearDown(self):
        """Clean up test database"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_file_upload_workflow(self):
        """Test CSV file upload workflow"""
        csv_content = f"""email,course_id,score,qualification_date
fileuser@example.com,file-course-123,95,2024-01-15"""

        # Create a mock file
        from io import BytesIO
        file_data = BytesIO(csv_content.encode('utf-8'))
        file_data.name = 'test_import.csv'

        response = self.client.post(
            '/api/admin/tutors/bulk-import-file',
            data={
                'csv_file': (file_data, 'test_import.csv'),
                'dryRun': 'false',
                'skipExisting': 'false',
                'autoQualify': 'true'
            },
            headers={'Authorization': f'Bearer {self.admin_token}'},
            content_type='multipart/form-data'
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data['total'], 1)
        self.assertEqual(data['successful'], 1)

        # Verify qualification was created
        qualification = TutorQualification.query.filter_by(
            user_id='file-user-123',
            course_id='file-course-123'
        ).first()
        self.assertIsNotNone(qualification)

        # Verify import job recorded file name
        import_job = BulkImportJob.query.first()
        self.assertEqual(import_job.file_name, 'test_import.csv')
        self.assertEqual(import_job.import_type, 'csv_file')


if __name__ == '__main__':
    # Run integration tests
    unittest.main(verbosity=2)