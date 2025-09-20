"""
Unit tests for Guardian-Student Request System

Tests all API endpoints and business logic for the guardian approval system.
"""

import pytest
import json
from datetime import datetime, timedelta
from flask import current_app
from app import create_app, db
from app.models import User, GuardianStudentRequest, GuardianStudentLink


@pytest.fixture
def app():
    """Create test app with test configuration"""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    """Create authentication headers for test users"""
    # Create test users
    guardian = User(
        id='test_guardian_001',
        email='guardian@test.com',
        account_type='guardian',
        profile={'name': 'Test Guardian'},
        is_active=True,
        status='active'
    )
    guardian.set_password('password123')

    student = User(
        id='test_student_001',
        email='student@test.com',
        account_type='student',
        profile={'name': 'Test Student', 'grade': '10th Grade'},
        is_active=True,
        status='active'
    )
    student.set_password('password123')

    another_guardian = User(
        id='test_guardian_002',
        email='guardian2@test.com',
        account_type='guardian',
        profile={'name': 'Another Guardian'},
        is_active=True,
        status='active'
    )
    another_guardian.set_password('password123')

    db.session.add_all([guardian, student, another_guardian])
    db.session.commit()

    # Login users and get tokens
    guardian_login = client.post('/api/auth/login', json={
        'email': 'guardian@test.com',
        'password': 'password123'
    })
    guardian_token = json.loads(guardian_login.data)['token']

    student_login = client.post('/api/auth/login', json={
        'email': 'student@test.com',
        'password': 'password123'
    })
    student_token = json.loads(student_login.data)['token']

    guardian2_login = client.post('/api/auth/login', json={
        'email': 'guardian2@test.com',
        'password': 'password123'
    })
    guardian2_token = json.loads(guardian2_login.data)['token']

    return {
        'guardian': {'Authorization': f'Bearer {guardian_token}'},
        'student': {'Authorization': f'Bearer {student_token}'},
        'guardian2': {'Authorization': f'Bearer {guardian2_token}'}
    }


class TestGuardianStudentRequests:
    """Test guardian-student request functionality"""

    def test_student_can_request_guardian(self, client, auth_headers):
        """Test student can create a request to a guardian"""
        response = client.post(
            '/api/student/request-guardian/test_guardian_001',
            headers=auth_headers['student'],
            json={'message': 'Please be my guardian!'}
        )

        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['message'] == 'Request sent successfully'
        assert 'request' in data

        # Verify request was created in database
        request = GuardianStudentRequest.query.filter_by(
            student_id='test_student_001',
            guardian_id='test_guardian_001'
        ).first()
        assert request is not None
        assert request.status == 'pending'
        assert request.student_message == 'Please be my guardian!'

    def test_student_cannot_request_invalid_guardian(self, client, auth_headers):
        """Test student cannot request non-existent guardian"""
        response = client.post(
            '/api/student/request-guardian/invalid_guardian',
            headers=auth_headers['student'],
            json={'message': 'Please be my guardian!'}
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Guardian not found' in data['error']

    def test_student_cannot_duplicate_pending_request(self, client, auth_headers):
        """Test student cannot create duplicate pending requests"""
        # Create first request
        client.post(
            '/api/student/request-guardian/test_guardian_001',
            headers=auth_headers['student'],
            json={'message': 'Please be my guardian!'}
        )

        # Try to create duplicate request
        response = client.post(
            '/api/student/request-guardian/test_guardian_001',
            headers=auth_headers['student'],
            json={'message': 'Please be my guardian again!'}
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Request already pending' in data['error']

    def test_guardian_can_view_pending_requests(self, client, auth_headers):
        """Test guardian can view their pending requests"""
        # Create a request
        request = GuardianStudentRequest(
            student_id='test_student_001',
            guardian_id='test_guardian_001',
            student_message='Please approve me!'
        )
        db.session.add(request)
        db.session.commit()

        response = client.get(
            '/api/guardian/pending-requests',
            headers=auth_headers['guardian']
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'requests' in data
        assert len(data['requests']) == 1
        assert data['requests'][0]['status'] == 'pending'
        assert data['requests'][0]['studentMessage'] == 'Please approve me!'

    def test_guardian_can_approve_request(self, client, auth_headers):
        """Test guardian can approve pending requests"""
        # Create a request
        request = GuardianStudentRequest(
            student_id='test_student_001',
            guardian_id='test_guardian_001',
            student_message='Please approve me!'
        )
        db.session.add(request)
        db.session.commit()

        response = client.post(
            f'/api/guardian/approve-request/{request.id}',
            headers=auth_headers['guardian'],
            json={'response_message': 'Welcome!'}
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Request approved successfully'
        assert 'request' in data
        assert 'link' in data

        # Verify request status updated
        updated_request = GuardianStudentRequest.query.get(request.id)
        assert updated_request.status == 'approved'
        assert updated_request.guardian_response == 'Welcome!'
        assert updated_request.processed_by == 'test_guardian_001'

        # Verify link was created
        link = GuardianStudentLink.query.filter_by(
            student_id='test_student_001',
            guardian_id='test_guardian_001'
        ).first()
        assert link is not None
        assert link.status == 'active'

    def test_guardian_can_reject_request(self, client, auth_headers):
        """Test guardian can reject pending requests"""
        # Create a request
        request = GuardianStudentRequest(
            student_id='test_student_001',
            guardian_id='test_guardian_001',
            student_message='Please approve me!'
        )
        db.session.add(request)
        db.session.commit()

        response = client.post(
            f'/api/guardian/reject-request/{request.id}',
            headers=auth_headers['guardian'],
            json={
                'rejection_reason': 'Cannot take on new students',
                'response_message': 'Sorry, not at this time'
            }
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Request rejected successfully'

        # Verify request status updated
        updated_request = GuardianStudentRequest.query.get(request.id)
        assert updated_request.status == 'rejected'
        assert updated_request.rejection_reason == 'Cannot take on new students'
        assert updated_request.guardian_response == 'Sorry, not at this time'
        assert updated_request.processed_by == 'test_guardian_001'

        # Verify no link was created
        link = GuardianStudentLink.query.filter_by(
            student_id='test_student_001',
            guardian_id='test_guardian_001'
        ).first()
        assert link is None

    def test_guardian_cannot_approve_nonexistent_request(self, client, auth_headers):
        """Test guardian cannot approve non-existent request"""
        response = client.post(
            '/api/guardian/approve-request/invalid_request_id',
            headers=auth_headers['guardian'],
            json={'response_message': 'Welcome!'}
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Request not found' in data['error']

    def test_guardian_cannot_approve_others_request(self, client, auth_headers):
        """Test guardian cannot approve requests not meant for them"""
        # Create a request for different guardian
        request = GuardianStudentRequest(
            student_id='test_student_001',
            guardian_id='test_guardian_002',  # Different guardian
            student_message='Please approve me!'
        )
        db.session.add(request)
        db.session.commit()

        response = client.post(
            f'/api/guardian/approve-request/{request.id}',
            headers=auth_headers['guardian'],  # Wrong guardian trying to approve
            json={'response_message': 'Welcome!'}
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Request not found' in data['error']

    def test_guardian_cannot_approve_already_processed_request(self, client, auth_headers):
        """Test guardian cannot approve already processed request"""
        # Create and approve a request
        request = GuardianStudentRequest(
            student_id='test_student_001',
            guardian_id='test_guardian_001',
            student_message='Please approve me!',
            status='approved',
            processed_date=datetime.utcnow(),
            processed_by='test_guardian_001'
        )
        db.session.add(request)
        db.session.commit()

        response = client.post(
            f'/api/guardian/approve-request/{request.id}',
            headers=auth_headers['guardian'],
            json={'response_message': 'Welcome again!'}
        )

        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'Request not found or already processed' in data['error']

    def test_student_can_view_their_requests(self, client, auth_headers):
        """Test student can view their own requests"""
        # Create requests
        request1 = GuardianStudentRequest(
            student_id='test_student_001',
            guardian_id='test_guardian_001',
            student_message='First request',
            status='pending'
        )
        request2 = GuardianStudentRequest(
            student_id='test_student_001',
            guardian_id='test_guardian_002',
            student_message='Second request',
            status='approved'
        )
        db.session.add_all([request1, request2])
        db.session.commit()

        response = client.get(
            '/api/student/my-requests',
            headers=auth_headers['student']
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'requests' in data
        assert len(data['requests']) == 2

    def test_student_can_search_guardians(self, client, auth_headers):
        """Test student can search for guardians"""
        response = client.get(
            '/api/guardian/search?q=guardian',
            headers=auth_headers['student']
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'guardians' in data
        assert len(data['guardians']) >= 1  # Should find test guardians

        # Check guardian data structure
        guardian = data['guardians'][0]
        assert 'id' in guardian
        assert 'email' in guardian
        assert 'name' in guardian
        assert 'isLinked' in guardian
        assert 'hasPendingRequest' in guardian

    def test_student_search_requires_minimum_characters(self, client, auth_headers):
        """Test guardian search requires at least 3 characters"""
        response = client.get(
            '/api/guardian/search?q=te',  # Only 2 characters
            headers=auth_headers['student']
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'at least 3 characters' in data['error']

    def test_guardian_can_view_linked_students(self, client, auth_headers):
        """Test guardian can view their linked students"""
        # Create active link
        link = GuardianStudentLink(
            student_id='test_student_001',
            guardian_id='test_guardian_001',
            linked_by='test_guardian_001'
        )
        db.session.add(link)
        db.session.commit()

        response = client.get(
            '/api/guardian/students',
            headers=auth_headers['guardian']
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'students' in data
        assert len(data['students']) == 1
        assert data['students'][0]['status'] == 'active'

    def test_guardian_can_unlink_student(self, client, auth_headers):
        """Test guardian can unlink/deactivate student relationship"""
        # Create active link
        link = GuardianStudentLink(
            student_id='test_student_001',
            guardian_id='test_guardian_001',
            linked_by='test_guardian_001'
        )
        db.session.add(link)
        db.session.commit()

        response = client.post(
            '/api/guardian/unlink-student/test_student_001',
            headers=auth_headers['guardian'],
            json={'reason': 'Student graduated'}
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['message'] == 'Student unlinked successfully'

        # Verify link was deactivated
        updated_link = GuardianStudentLink.query.get(link.id)
        assert updated_link.status == 'inactive'
        assert updated_link.unlink_reason == 'Student graduated'
        assert updated_link.unlinked_by == 'test_guardian_001'

    def test_batch_approve_requests(self, client, auth_headers):
        """Test guardian can batch approve multiple requests"""
        # Create multiple requests
        requests = []
        for i in range(3):
            request = GuardianStudentRequest(
                id=f'batch_request_{i}',
                student_id=f'batch_student_{i}',
                guardian_id='test_guardian_001',
                student_message=f'Batch request {i}'
            )
            requests.append(request)

            # Create corresponding students
            student = User(
                id=f'batch_student_{i}',
                email=f'batch{i}@test.com',
                account_type='student',
                profile={'name': f'Batch Student {i}'},
                is_active=True
            )
            student.set_password('password123')
            db.session.add(student)

        db.session.add_all(requests)
        db.session.commit()

        request_ids = [req.id for req in requests]

        response = client.post(
            '/api/guardian/batch-approve',
            headers=auth_headers['guardian'],
            json={
                'request_ids': request_ids,
                'response_message': 'Welcome to all!'
            }
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['approved_count'] == 3
        assert data['error_count'] == 0

        # Verify all requests were approved
        for request_id in request_ids:
            request = GuardianStudentRequest.query.get(request_id)
            assert request.status == 'approved'
            assert request.guardian_response == 'Welcome to all!'

    def test_authorization_required(self, client):
        """Test endpoints require proper authentication"""
        # Test without authentication
        response = client.get('/api/guardian/pending-requests')
        assert response.status_code == 401

        response = client.post('/api/student/request-guardian/test_guardian_001')
        assert response.status_code == 401

    def test_role_based_access_control(self, client, auth_headers):
        """Test endpoints enforce correct user roles"""
        # Student trying to access guardian endpoint
        response = client.get(
            '/api/guardian/pending-requests',
            headers=auth_headers['student']
        )
        assert response.status_code == 403

        # Guardian trying to access student endpoint
        response = client.post(
            '/api/student/request-guardian/test_guardian_001',
            headers=auth_headers['guardian']
        )
        assert response.status_code == 403


class TestGuardianStudentModels:
    """Test model methods and relationships"""

    def test_guardian_student_request_to_dict(self, app):
        """Test GuardianStudentRequest to_dict method"""
        with app.app_context():
            # Create test users
            student = User(
                id='test_student',
                email='student@test.com',
                account_type='student',
                profile={'name': 'Test Student'}
            )
            guardian = User(
                id='test_guardian',
                email='guardian@test.com',
                account_type='guardian',
                profile={'name': 'Test Guardian'}
            )
            db.session.add_all([student, guardian])
            db.session.commit()

            request = GuardianStudentRequest(
                student_id='test_student',
                guardian_id='test_guardian',
                student_message='Test message'
            )
            db.session.add(request)
            db.session.commit()

            data = request.to_dict()

            assert 'id' in data
            assert data['studentId'] == 'test_student'
            assert data['guardianId'] == 'test_guardian'
            assert data['status'] == 'pending'
            assert data['studentMessage'] == 'Test message'
            assert 'student' in data
            assert 'guardian' in data

    def test_guardian_student_link_static_methods(self, app):
        """Test GuardianStudentLink static helper methods"""
        with app.app_context():
            # Create test users
            student = User(id='test_student', email='student@test.com', account_type='student')
            guardian = User(id='test_guardian', email='guardian@test.com', account_type='guardian')
            db.session.add_all([student, guardian])
            db.session.commit()

            # Create active link
            link = GuardianStudentLink(
                student_id='test_student',
                guardian_id='test_guardian',
                status='active'
            )
            db.session.add(link)
            db.session.commit()

            # Test get_active_link
            active_link = GuardianStudentLink.get_active_link('test_student', 'test_guardian')
            assert active_link is not None
            assert active_link.status == 'active'

            # Test get_guardian_students
            students = GuardianStudentLink.get_guardian_students('test_guardian')
            assert len(students) == 1
            assert students[0].student_id == 'test_student'

            # Test get_student_guardians
            guardians = GuardianStudentLink.get_student_guardians('test_student')
            assert len(guardians) == 1
            assert guardians[0].guardian_id == 'test_guardian'

    def test_request_approve_method(self, app):
        """Test GuardianStudentRequest approve method"""
        with app.app_context():
            # Create test users
            student = User(id='test_student', email='student@test.com', account_type='student')
            guardian = User(id='test_guardian', email='guardian@test.com', account_type='guardian')
            db.session.add_all([student, guardian])
            db.session.commit()

            request = GuardianStudentRequest(
                student_id='test_student',
                guardian_id='test_guardian'
            )
            db.session.add(request)
            db.session.commit()

            # Approve request
            link = request.approve(guardian, 'Welcome!')

            assert request.status == 'approved'
            assert request.processed_by == 'test_guardian'
            assert request.guardian_response == 'Welcome!'
            assert link.student_id == 'test_student'
            assert link.guardian_id == 'test_guardian'
            assert link.status == 'active'

    def test_request_reject_method(self, app):
        """Test GuardianStudentRequest reject method"""
        with app.app_context():
            # Create test users
            student = User(id='test_student', email='student@test.com', account_type='student')
            guardian = User(id='test_guardian', email='guardian@test.com', account_type='guardian')
            db.session.add_all([student, guardian])
            db.session.commit()

            request = GuardianStudentRequest(
                student_id='test_student',
                guardian_id='test_guardian'
            )
            db.session.add(request)
            db.session.commit()

            # Reject request
            request.reject(guardian, 'Cannot approve at this time', 'Sorry!')

            assert request.status == 'rejected'
            assert request.processed_by == 'test_guardian'
            assert request.rejection_reason == 'Cannot approve at this time'
            assert request.guardian_response == 'Sorry!'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])