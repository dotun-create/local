"""
Test Guardian Request Auto-Generation on Student Signup
Tests the new functionality that creates guardian_student_request records during student registration
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from app import create_app, db
from app.models import User, GuardianStudentRequest, GuardianStudentLink, Notification
from app.services.guardian_service import GuardianService


@pytest.fixture(scope='module')
def app():
    """Create application for testing"""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'

    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def app_context(app):
    """Create application context"""
    with app.app_context():
        yield app


class TestGuardianRequestOnSignup:
    """Test guardian request creation during student signup"""

    def setup_method(self):
        """Set up test data before each test"""
        # Clear all data
        db.session.query(GuardianStudentRequest).delete()
        db.session.query(GuardianStudentLink).delete()
        db.session.query(Notification).delete()
        db.session.query(User).delete()
        db.session.commit()

    @patch('app.services.guardian_service.send_email')
    def test_student_signup_with_existing_guardian_creates_request(self, mock_send_email, client, app_context):
        """Test that signing up with existing guardian creates a pending request"""
        mock_send_email.return_value = True

        # Create existing guardian
        guardian = User(
            email='guardian@test.com',
            account_type='guardian',
            profile={'name': 'Test Guardian'}
        )
        guardian.set_password('password123')
        db.session.add(guardian)
        db.session.commit()
        guardian_id = guardian.id

        # Register student with guardian email
        student_data = {
            'email': 'student@test.com',
            'password': 'password123',
            'accountType': 'student',
            'firstName': 'Test',
            'lastName': 'Student',
            'guardianEmail': 'guardian@test.com'
        }

        response = client.post('/api/auth/register',
                             data=json.dumps(student_data),
                             content_type='application/json')

        assert response.status_code == 201
        response_data = json.loads(response.data)
        assert response_data['message'] == 'Registration successful'

        # Verify student was created
        student = User.query.filter_by(email='student@test.com').first()
        assert student is not None
        assert student.account_type == 'student'

        # Verify guardian request was created
        requests = GuardianStudentRequest.query.filter_by(
            student_id=student.id,
            guardian_id=guardian_id
        ).all()
        assert len(requests) == 1

        request_obj = requests[0]
        assert request_obj.status == 'pending'
        assert 'Requested during signup' in request_obj.student_message
        assert request_obj.notes == 'Auto-created during student registration'

        # Verify notification was created for guardian
        notifications = Notification.query.filter_by(
            user_id=guardian_id,
            type='student_request'
        ).all()
        assert len(notifications) == 1
        assert 'Test Student' in notifications[0].message

        # Verify email was sent
        mock_send_email.assert_called_once()
        call_args = mock_send_email.call_args[0]
        assert call_args[0] == 'guardian@test.com'  # recipient
        assert 'Student Guardian Request' in call_args[1]  # subject

    @patch('app.services.guardian_service.send_email')
    def test_student_signup_without_existing_guardian_creates_account_and_pending_request(self, mock_send_email, client, app_context):
        """Test that signing up without existing guardian creates guardian account and pending request (no auto-approval)"""
        mock_send_email.return_value = True

        # Register student with non-existing guardian email
        student_data = {
            'email': 'student@test.com',
            'password': 'password123',
            'accountType': 'student',
            'firstName': 'Test',
            'lastName': 'Student',
            'guardianEmail': 'newguardian@test.com',
            'guardianFirstName': 'New',
            'guardianLastName': 'Guardian'
        }

        response = client.post('/api/auth/register',
                             data=json.dumps(student_data),
                             content_type='application/json')

        assert response.status_code == 201

        # Verify student was created
        student = User.query.filter_by(email='student@test.com').first()
        assert student is not None

        # Verify guardian was created
        guardian = User.query.filter_by(email='newguardian@test.com').first()
        assert guardian is not None
        assert guardian.account_type == 'guardian'
        assert guardian.profile['auto_generated'] == True

        # Verify pending request was created (no auto-approval)
        requests = GuardianStudentRequest.query.filter_by(
            student_id=student.id,
            guardian_id=guardian.id
        ).all()
        assert len(requests) == 1

        request_obj = requests[0]
        assert request_obj.status == 'pending'
        assert 'Requested during signup' in request_obj.student_message
        assert request_obj.processed_date is None
        assert request_obj.processed_by is None

        # Verify both credentials email and request notification email were sent
        assert mock_send_email.call_count >= 2  # At least credentials + request notification emails

    def test_student_signup_without_guardian_email(self, client, app_context):
        """Test that signup without guardian email works normally"""
        student_data = {
            'email': 'student@test.com',
            'password': 'password123',
            'accountType': 'student',
            'firstName': 'Test',
            'lastName': 'Student'
        }

        response = client.post('/api/auth/register',
                             data=json.dumps(student_data),
                             content_type='application/json')

        assert response.status_code == 201

        # Verify student was created
        student = User.query.filter_by(email='student@test.com').first()
        assert student is not None

        # Verify no requests were created
        requests = GuardianStudentRequest.query.filter_by(student_id=student.id).all()
        assert len(requests) == 0

    @patch('app.services.guardian_service.send_email')
    def test_duplicate_request_prevention(self, mock_send_email, client, app_context):
        """Test that duplicate requests are not created for same student-guardian pair"""
        mock_send_email.return_value = True

        # Create existing guardian
        guardian = User(
            email='guardian@test.com',
            account_type='guardian',
            profile={'name': 'Test Guardian'}
        )
        guardian.set_password('password123')
        db.session.add(guardian)
        db.session.commit()

        # Create first student
        student1_data = {
            'email': 'student1@test.com',
            'password': 'password123',
            'accountType': 'student',
            'firstName': 'First',
            'lastName': 'Student',
            'guardianEmail': 'guardian@test.com'
        }

        response1 = client.post('/api/auth/register',
                              data=json.dumps(student1_data),
                              content_type='application/json')
        assert response1.status_code == 201

        # Create second student with same guardian
        student2_data = {
            'email': 'student2@test.com',
            'password': 'password123',
            'accountType': 'student',
            'firstName': 'Second',
            'lastName': 'Student',
            'guardianEmail': 'guardian@test.com'
        }

        response2 = client.post('/api/auth/register',
                              data=json.dumps(student2_data),
                              content_type='application/json')
        assert response2.status_code == 201

        # Verify separate requests were created for each student
        student1 = User.query.filter_by(email='student1@test.com').first()
        student2 = User.query.filter_by(email='student2@test.com').first()

        requests1 = GuardianStudentRequest.query.filter_by(
            student_id=student1.id,
            guardian_id=guardian.id
        ).all()
        requests2 = GuardianStudentRequest.query.filter_by(
            student_id=student2.id,
            guardian_id=guardian.id
        ).all()

        assert len(requests1) == 1
        assert len(requests2) == 1
        assert requests1[0].id != requests2[0].id

    @patch('app.services.guardian_service.send_email')
    def test_already_linked_student_guardian_pair(self, mock_send_email, client, app_context):
        """Test behavior when student-guardian pair is already linked"""
        mock_send_email.return_value = True

        # Create guardian and student
        guardian = User(
            email='guardian@test.com',
            account_type='guardian',
            profile={'name': 'Test Guardian'}
        )
        guardian.set_password('password123')
        db.session.add(guardian)

        student = User(
            email='student@test.com',
            account_type='student',
            profile={'name': 'Test Student'}
        )
        student.set_password('password123')
        db.session.add(student)
        db.session.commit()

        # Create existing link
        existing_link = GuardianStudentLink(
            student_id=student.id,
            guardian_id=guardian.id,
            status='active'
        )
        db.session.add(existing_link)
        db.session.commit()

        # Try to create request for already linked pair
        result = GuardianService.create_guardian_request_on_signup(student.id, guardian.email)

        assert result['success'] == True
        assert result['action'] == 'already_linked'
        assert 'already linked' in result['message']

        # Verify no new request was created
        requests = GuardianStudentRequest.query.filter_by(
            student_id=student.id,
            guardian_id=guardian.id
        ).all()
        assert len(requests) == 0

    @patch('app.services.guardian_service.send_email')
    def test_invalid_guardian_email_format(self, mock_send_email, client, app_context):
        """Test handling of invalid guardian email formats"""
        student_data = {
            'email': 'student@test.com',
            'password': 'password123',
            'accountType': 'student',
            'firstName': 'Test',
            'lastName': 'Student',
            'guardianEmail': 'invalid-email'
        }

        response = client.post('/api/auth/register',
                             data=json.dumps(student_data),
                             content_type='application/json')

        # Student should still be created despite invalid guardian email
        assert response.status_code == 201

        # Verify no requests were created due to invalid email
        student = User.query.filter_by(email='student@test.com').first()
        requests = GuardianStudentRequest.query.filter_by(student_id=student.id).all()
        assert len(requests) == 0

        # Verify no email was sent
        mock_send_email.assert_not_called()

    def test_guardian_service_error_handling(self, app_context):
        """Test error handling in GuardianService methods"""
        # Test with non-existent student
        result = GuardianService.create_guardian_request_on_signup('nonexistent', 'guardian@test.com')
        assert result['success'] == False
        assert 'Student not found' in result['error']

        # Test with invalid student type
        guardian = User(
            id='guardian_test',
            email='guardian@test.com',
            account_type='guardian'
        )
        db.session.add(guardian)
        db.session.commit()

        result = GuardianService.create_guardian_request_on_signup(guardian.id, 'other@test.com')
        assert result['success'] == False
        assert 'Student not found' in result['error']


class TestPendingRequestsDisplay:
    """Test that pending requests are properly displayed in guardian dashboard"""

    def setup_method(self):
        """Set up test data before each test"""
        db.session.query(GuardianStudentRequest).delete()
        db.session.query(GuardianStudentLink).delete()
        db.session.query(User).delete()
        db.session.commit()

    def test_guardian_sees_pending_requests(self, client, app_context):
        """Test that guardian can see pending requests in their dashboard"""
        # Create guardian
        guardian = User(
            email='guardian@test.com',
            account_type='guardian',
            profile={'name': 'Test Guardian'}
        )
        guardian.set_password('password123')
        db.session.add(guardian)

        # Create student
        student = User(
            email='student@test.com',
            account_type='student',
            profile={'name': 'Test Student'}
        )
        student.set_password('password123')
        db.session.add(student)
        db.session.commit()

        # Create pending request
        request_obj = GuardianStudentRequest(
            student_id=student.id,
            guardian_id=guardian.id,
            student_message='Please be my guardian!',
            status='pending'
        )
        db.session.add(request_obj)
        db.session.commit()

        # Login as guardian
        login_response = client.post('/api/auth/login',
                                   data=json.dumps({
                                       'email': 'guardian@test.com',
                                       'password': 'password123'
                                   }),
                                   content_type='application/json')

        assert login_response.status_code == 200
        auth_data = json.loads(login_response.data)
        token = auth_data['token']

        # Get pending requests
        response = client.get('/api/guardian/pending-requests',
                            headers={'Authorization': f'Bearer {token}'})

        assert response.status_code == 200
        data = json.loads(response.data)

        assert len(data['requests']) == 1
        request_data = data['requests'][0]
        assert request_data['student']['email'] == 'student@test.com'
        assert request_data['studentMessage'] == 'Please be my guardian!'
        assert request_data['status'] == 'pending'

    def test_empty_pending_requests_returns_success(self, client, app_context):
        """Test that empty pending requests returns successful response"""
        # Create guardian with no pending requests
        guardian = User(
            email='guardian@test.com',
            account_type='guardian',
            profile={'name': 'Test Guardian'}
        )
        guardian.set_password('password123')
        db.session.add(guardian)
        db.session.commit()

        # Login as guardian
        login_response = client.post('/api/auth/login',
                                   data=json.dumps({
                                       'email': 'guardian@test.com',
                                       'password': 'password123'
                                   }),
                                   content_type='application/json')

        token = json.loads(login_response.data)['token']

        # Get pending requests (should be empty)
        response = client.get('/api/guardian/pending-requests',
                            headers={'Authorization': f'Bearer {token}'})

        assert response.status_code == 200
        data = json.loads(response.data)

        assert len(data['requests']) == 0
        assert 'pagination' in data
        assert data['pagination']['total'] == 0


if __name__ == '__main__':
    pytest.main([__file__, '-v'])