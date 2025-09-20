#!/usr/bin/env python3
"""
Unit Tests for Bulk Import Functionality
Tests CSV parser, tutor qualification service, and bulk import API endpoints
"""

import unittest
from unittest.mock import patch, MagicMock, mock_open
import json
import io
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
from app.utils.csv_parser import CSVParser
from app.services.tutor_qualification_service import TutorQualificationService


class TestCSVParser(unittest.TestCase):
    """Test cases for CSV parser utility"""

    def setUp(self):
        self.parser = CSVParser()

    def test_valid_csv_parsing(self):
        """Test parsing of valid CSV data"""
        csv_data = """email,course_id,score,qualification_date
student1@example.com,course-1,95,2024-01-15
student2@example.com,course-2,88,2024-01-10"""

        records, errors = self.parser.parse_csv_text(csv_data)

        self.assertEqual(len(records), 2)
        self.assertEqual(len(errors), 0)
        self.assertEqual(records[0]['email'], 'student1@example.com')
        self.assertEqual(records[0]['course_id'], 'course-1')
        self.assertEqual(records[0]['score'], 95)

    def test_invalid_email_validation(self):
        """Test email validation in CSV parsing"""
        csv_data = """email,course_id,score,qualification_date
invalid-email,course-1,95,2024-01-15
student@example.com,course-2,88,2024-01-10"""

        records, errors = self.parser.parse_csv_text(csv_data)

        self.assertEqual(len(records), 1)  # Only valid record
        self.assertEqual(len(errors), 1)   # One validation error
        self.assertIn('invalid email', errors[0].lower())

    def test_score_range_validation(self):
        """Test score range validation (0-100)"""
        csv_data = """email,course_id,score,qualification_date
student1@example.com,course-1,150,2024-01-15
student2@example.com,course-2,88,2024-01-10"""

        records, errors = self.parser.parse_csv_text(csv_data)

        self.assertEqual(len(records), 1)  # Only valid record
        self.assertEqual(len(errors), 1)   # One validation error
        self.assertIn('score', errors[0].lower())

    def test_date_parsing(self):
        """Test date parsing functionality"""
        csv_data = """email,course_id,score,qualification_date
student1@example.com,course-1,95,2024-01-15
student2@example.com,course-2,88,invalid-date"""

        records, errors = self.parser.parse_csv_text(csv_data)

        self.assertEqual(len(records), 1)  # Only valid record
        self.assertEqual(len(errors), 1)   # One date parsing error
        self.assertIn('date', errors[0].lower())

    def test_missing_required_fields(self):
        """Test handling of missing required fields"""
        from app.utils.csv_parser import CSVParseError
        csv_data = """email,course_id,score
student1@example.com,course-1,95"""  # Missing qualification_date

        with self.assertRaises(CSVParseError) as context:
            records, errors = self.parser.parse_csv_text(csv_data)

        # Should mention missing headers
        self.assertIn('required', str(context.exception).lower())

    def test_duplicate_detection(self):
        """Test batch validation for duplicate entries"""
        csv_data = """email,course_id,score,qualification_date
student1@example.com,course-1,95,2024-01-15
student1@example.com,course-1,88,2024-01-10"""  # Duplicate email-course combination

        records, parse_errors = self.parser.parse_csv_text(csv_data)
        batch_errors = self.parser.validate_batch_constraints(records)

        self.assertEqual(len(records), 2)     # Both records parsed
        self.assertEqual(len(parse_errors), 0) # No parse errors
        self.assertEqual(len(batch_errors), 1) # One batch validation error
        self.assertIn('duplicate', batch_errors[0].lower())

    def test_empty_csv_handling(self):
        """Test handling of empty CSV data"""
        from app.utils.csv_parser import CSVParseError
        csv_data = ""

        with self.assertRaises(CSVParseError) as context:
            records, errors = self.parser.parse_csv_text(csv_data)

        self.assertIn('empty', str(context.exception).lower())

    def test_malformed_csv_handling(self):
        """Test handling of malformed CSV data"""
        from app.utils.csv_parser import CSVParseError
        csv_data = """email,course_id,score,qualification_date
student1@example.com,course-1,95,2024-01-15,extra_field
student2@example.com,course-2"""  # Missing fields

        with self.assertRaises(CSVParseError) as context:
            records, errors = self.parser.parse_csv_text(csv_data)

        # Should provide meaningful error message
        self.assertIsNotNone(str(context.exception))

    def test_file_upload_parsing(self):
        """Test CSV file upload parsing"""
        csv_content = """email,course_id,score,qualification_date
student1@example.com,course-1,95,2024-01-15
student2@example.com,course-2,88,2024-01-10"""

        # Mock file object
        mock_file = MagicMock()
        mock_file.read.return_value = csv_content.encode('utf-8')

        records, errors = self.parser.parse_csv_file(mock_file)

        self.assertEqual(len(records), 2)
        self.assertEqual(len(errors), 0)


class TestTutorQualificationService(unittest.TestCase):
    """Test cases for TutorQualificationService"""

    def setUp(self):
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

        self.service = TutorQualificationService()

        # Create test data
        self.admin_user = User(
            id='admin-123',
            email='admin@example.com',
            account_type='admin'
        )
        self.test_user = User(
            id='user-123',
            email='student@example.com',
            account_type='student'
        )
        self.test_course = Course(
            id='course-123',
            title='Test Course'
        )

        db.session.add_all([self.admin_user, self.test_user, self.test_course])
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_manually_qualify_tutor_success(self):
        """Test successful manual tutor qualification"""
        result = self.service.manually_qualify_tutor(
            email='student@example.com',
            course_id='course-123',
            admin_user_id='admin-123'
        )

        self.assertTrue(result['success'])
        self.assertIn('qualification', result)

        # Verify qualification was created
        qualification = TutorQualification.query.filter_by(
            user_id='user-123',
            course_id='course-123'
        ).first()
        self.assertIsNotNone(qualification)
        self.assertTrue(qualification.is_active)

    def test_manually_qualify_tutor_user_not_found(self):
        """Test manual qualification with non-existent user"""
        result = self.service.manually_qualify_tutor(
            email='nonexistent@example.com',
            course_id='course-123',
            admin_user_id='admin-123'
        )

        self.assertFalse(result['success'])
        self.assertIn('User not found', result['error'])

    def test_manually_qualify_tutor_course_not_found(self):
        """Test manual qualification with non-existent course"""
        result = self.service.manually_qualify_tutor(
            email='student@example.com',
            course_id='nonexistent-course',
            admin_user_id='admin-123'
        )

        self.assertFalse(result['success'])
        self.assertIn('Course not found', result['error'])

    def test_manually_qualify_tutor_already_qualified(self):
        """Test manual qualification when user already qualified"""
        # First qualification
        self.service.manually_qualify_tutor(
            email='student@example.com',
            course_id='course-123',
            admin_user_id='admin-123'
        )

        # Second qualification attempt
        result = self.service.manually_qualify_tutor(
            email='student@example.com',
            course_id='course-123',
            admin_user_id='admin-123'
        )

        self.assertFalse(result['success'])
        self.assertIn('already qualified', result['error'])

    def test_revoke_qualification_success(self):
        """Test successful qualification revocation"""
        # Create qualification first
        qual_result = self.service.manually_qualify_tutor(
            email='student@example.com',
            course_id='course-123',
            admin_user_id='admin-123'
        )

        qual_id = qual_result['qualification']['id']

        # Revoke it
        result = self.service.revoke_qualification(
            qualification_id=qual_id,
            admin_user_id='admin-123',
            reason='Test revocation'
        )

        self.assertTrue(result['success'])

        # Verify qualification was revoked
        qualification = TutorQualification.query.get(qual_id)
        self.assertIsNotNone(qualification)
        self.assertFalse(qualification.is_active)
        self.assertEqual(qualification.revoke_reason, 'Test revocation')

    def test_revoke_qualification_not_found(self):
        """Test revocation with non-existent qualification"""
        result = self.service.revoke_qualification(
            qualification_id='nonexistent-id',
            admin_user_id='admin-123'
        )

        self.assertFalse(result['success'])
        self.assertIn('not found', result['error'])

    @patch('app.services.tutor_qualification_service.TutorQualificationService._process_qualification_records')
    def test_process_bulk_import_dry_run(self, mock_process):
        """Test bulk import in dry run mode"""
        mock_process.return_value = {
            'total': 2,
            'successful': 2,
            'failed': 0,
            'skipped': 0,
            'errors': [],
            'qualified': [],
            'preview': True
        }

        csv_data = """email,course_id,score,qualification_date
student1@example.com,course-1,95,2024-01-15
student2@example.com,course-2,88,2024-01-10"""

        options = {'dry_run': True}
        result = self.service.process_bulk_import(csv_data, 'admin-123', options)

        self.assertEqual(result['total'], 2)
        self.assertEqual(result['successful'], 2)
        self.assertTrue(result['preview'])

    def test_process_bulk_import_csv_errors(self):
        """Test bulk import with CSV parsing errors"""
        csv_data = """email,course_id,score,qualification_date
invalid-email,course-1,95,2024-01-15"""  # Invalid email

        result = self.service.process_bulk_import(csv_data, 'admin-123', {})

        self.assertEqual(result['successful'], 0)
        self.assertGreater(result['failed'], 0)
        self.assertGreater(len(result['errors']), 0)


class TestBulkImportAPI(unittest.TestCase):
    """Test cases for bulk import API endpoints"""

    def setUp(self):
        """Set up Flask app and test database"""
        self.app = create_app('testing')
        self.app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.client = self.app.test_client()
        db.create_all()

        # Create admin user
        self.admin_user = User(
            id='admin-123',
            email='admin@example.com',
            account_type='admin'
        )
        self.admin_user.set_password('admin123')

        # Create regular user
        self.regular_user = User(
            id='user-123',
            email='user@example.com',
            account_type='student'
        )
        self.regular_user.set_password('user123')

        # Create test course
        self.test_course = Course(
            id='course-123',
            title='Test Course'
        )

        db.session.add_all([self.admin_user, self.regular_user, self.test_course])
        db.session.commit()

        # Create access tokens
        with self.app.app_context():
            self.admin_token = create_access_token(identity='admin-123')
            self.user_token = create_access_token(identity='user-123')

    def tearDown(self):
        """Clean up test database"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_bulk_import_tutors_success(self):
        """Test successful bulk import API call"""
        csv_data = """email,course_id,score,qualification_date
user@example.com,course-123,95,2024-01-15"""

        response = self.client.post(
            '/api/admin/tutors/bulk-import',
            json={'csvData': csv_data, 'dryRun': True},
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('total', data)
        self.assertIn('successful', data)

    def test_bulk_import_tutors_admin_required(self):
        """Test that bulk import requires admin access"""
        csv_data = """email,course_id,score,qualification_date
user@example.com,course-123,95,2024-01-15"""

        response = self.client.post(
            '/api/admin/tutors/bulk-import',
            json={'csvData': csv_data},
            headers={'Authorization': f'Bearer {self.user_token}'}
        )

        self.assertEqual(response.status_code, 403)

    def test_bulk_import_tutors_no_auth(self):
        """Test that bulk import requires authentication"""
        csv_data = """email,course_id,score,qualification_date
user@example.com,course-123,95,2024-01-15"""

        response = self.client.post(
            '/api/admin/tutors/bulk-import',
            json={'csvData': csv_data}
        )

        self.assertEqual(response.status_code, 401)

    def test_bulk_import_tutors_missing_data(self):
        """Test bulk import with missing CSV data"""
        response = self.client.post(
            '/api/admin/tutors/bulk-import',
            json={},
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        self.assertEqual(response.status_code, 400)

    def test_get_tutor_qualifications_success(self):
        """Test getting tutor qualifications list"""
        response = self.client.get(
            '/api/admin/tutors/qualifications',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('qualifications', data)
        self.assertIn('total', data)

    def test_get_tutor_qualifications_admin_required(self):
        """Test that getting qualifications requires admin access"""
        response = self.client.get(
            '/api/admin/tutors/qualifications',
            headers={'Authorization': f'Bearer {self.user_token}'}
        )

        self.assertEqual(response.status_code, 403)

    def test_manually_qualify_tutor_success(self):
        """Test manual tutor qualification API"""
        response = self.client.post(
            '/api/admin/tutors/qualify',
            json={'email': 'user@example.com', 'courseId': 'course-123'},
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data['success'])

    def test_get_course_settings_success(self):
        """Test getting course settings"""
        response = self.client.get(
            '/api/admin/courses/settings',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('settings', data)

    def test_get_bulk_import_jobs_success(self):
        """Test getting bulk import jobs"""
        response = self.client.get(
            '/api/admin/bulk-import-jobs',
            headers={'Authorization': f'Bearer {self.admin_token}'}
        )

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('jobs', data)
        self.assertIn('total', data)


class TestBulkImportModels(unittest.TestCase):
    """Test cases for bulk import database models"""

    def setUp(self):
        self.app = create_app('testing')
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_bulk_import_job_creation(self):
        """Test BulkImportJob model creation"""
        job = BulkImportJob(
            imported_by='admin-123',
            import_type='csv_text',
            job_status='completed',
            total_records=10,
            successful_records=8,
            failed_records=2
        )

        db.session.add(job)
        db.session.commit()

        self.assertIsNotNone(job.id)
        self.assertEqual(job.job_status, 'completed')
        self.assertEqual(job.total_records, 10)

    def test_bulk_import_job_to_dict(self):
        """Test BulkImportJob to_dict method"""
        job = BulkImportJob(
            imported_by='admin-123',
            import_type='csv_text',
            job_status='completed'
        )

        db.session.add(job)
        db.session.commit()

        job_dict = job.to_dict()

        self.assertIn('id', job_dict)
        self.assertIn('jobStatus', job_dict)
        self.assertIn('importType', job_dict)
        self.assertEqual(job_dict['jobStatus'], 'completed')

    def test_course_settings_get_or_create(self):
        """Test CourseSettings get_or_create method"""
        # Create course first
        course = Course(id='course-123', title='Test Course')
        db.session.add(course)
        db.session.commit()

        # Test get_or_create
        settings = CourseSettings.get_or_create_for_course('course-123', 'admin-123')

        self.assertIsNotNone(settings)
        self.assertEqual(settings.course_id, 'course-123')
        self.assertEqual(settings.created_by, 'admin-123')

    def test_tutor_qualification_relationships(self):
        """Test TutorQualification model relationships"""
        # Create test data
        user = User(id='user-123', email='user@example.com')
        course = Course(id='course-123', title='Test Course')

        qualification = TutorQualification(
            user_id='user-123',
            course_id='course-123',
            qualification_type='manual',
            is_active=True
        )

        db.session.add_all([user, course, qualification])
        db.session.commit()

        # Test relationships
        self.assertEqual(qualification.user.email, 'user@example.com')
        self.assertEqual(qualification.course.title, 'Test Course')


if __name__ == '__main__':
    # Run tests
    unittest.main(verbosity=2)