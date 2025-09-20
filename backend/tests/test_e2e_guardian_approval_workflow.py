"""
End-to-End Tests for Guardian-Student Approval Workflow

Tests the complete workflow from student request to guardian approval,
including all intermediate states and edge cases.
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
def test_users(app):
    """Create test users for E2E testing"""
    with app.app_context():
        # Create guardian
        guardian = User(
            id='e2e_guardian_001',
            email='guardian@example.com',
            account_type='guardian',
            profile={
                'name': 'Emma Guardian',
                'phone': '+1234567890',
                'address': {'street': '123 Main St', 'city': 'Testville', 'state': 'TS', 'zipCode': '12345'}
            },
            is_active=True,
            status='active'
        )
        guardian.set_password('GuardianPass123!')

        # Create students
        student1 = User(
            id='e2e_student_001',
            email='alice@example.com',
            account_type='student',
            profile={
                'name': 'Alice Student',
                'grade': '10th Grade',
                'age': 16,
                'avatar': '/images/alice-avatar.png'
            },
            is_active=True,
            status='active'
        )
        student1.set_password('StudentPass123!')

        student2 = User(
            id='e2e_student_002',
            email='bob@example.com',
            account_type='student',
            profile={
                'name': 'Bob Student',
                'grade': '9th Grade',
                'age': 15
            },
            is_active=True,
            status='active'
        )
        student2.set_password('StudentPass123!')

        # Create another guardian for cross-guardian testing
        guardian2 = User(
            id='e2e_guardian_002',
            email='guardian2@example.com',
            account_type='guardian',
            profile={'name': 'John Guardian'},
            is_active=True,
            status='active'
        )
        guardian2.set_password('GuardianPass123!')

        db.session.add_all([guardian, student1, student2, guardian2])
        db.session.commit()

        return {
            'guardian': guardian,
            'student1': student1,
            'student2': student2,
            'guardian2': guardian2
        }


@pytest.fixture
def auth_tokens(client, test_users):
    """Get authentication tokens for all test users"""
    tokens = {}

    # Login guardian
    response = client.post('/api/auth/login', json={
        'email': 'guardian@example.com',
        'password': 'GuardianPass123!'
    })
    tokens['guardian'] = json.loads(response.data)['token']

    # Login students
    response = client.post('/api/auth/login', json={
        'email': 'alice@example.com',
        'password': 'StudentPass123!'
    })
    tokens['student1'] = json.loads(response.data)['token']

    response = client.post('/api/auth/login', json={
        'email': 'bob@example.com',
        'password': 'StudentPass123!'
    })
    tokens['student2'] = json.loads(response.data)['token']

    # Login second guardian
    response = client.post('/api/auth/login', json={
        'email': 'guardian2@example.com',
        'password': 'GuardianPass123!'
    })
    tokens['guardian2'] = json.loads(response.data)['token']

    return tokens


class TestCompleteApprovalWorkflow:
    """Test the complete guardian-student approval workflow"""

    def test_complete_approval_workflow_success(self, client, test_users, auth_tokens):
        """Test complete successful workflow from request to approval"""

        # Step 1: Student searches for guardian
        response = client.get(
            '/api/guardian/search?q=emma',
            headers={'Authorization': f'Bearer {auth_tokens["student1"]}'}
        )
        assert response.status_code == 200
        search_data = json.loads(response.data)
        assert len(search_data['guardians']) >= 1

        guardian_found = None
        for guardian in search_data['guardians']:
            if guardian['email'] == 'guardian@example.com':
                guardian_found = guardian
                break

        assert guardian_found is not None
        assert not guardian_found['isLinked']
        assert not guardian_found['hasPendingRequest']

        # Step 2: Student sends guardian request
        response = client.post(
            f'/api/student/request-guardian/{test_users["guardian"].id}',
            headers={'Authorization': f'Bearer {auth_tokens["student1"]}'},
            json={'message': 'Hi Emma! I would like you to be my guardian to help with my studies.'}
        )
        assert response.status_code == 201
        request_data = json.loads(response.data)
        assert request_data['message'] == 'Request sent successfully'

        request_id = request_data['request']['id']

        # Step 3: Verify request appears in guardian's pending list
        response = client.get(
            '/api/guardian/pending-requests',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
        )
        assert response.status_code == 200
        pending_data = json.loads(response.data)
        assert len(pending_data['requests']) == 1

        pending_request = pending_data['requests'][0]
        assert pending_request['id'] == request_id
        assert pending_request['status'] == 'pending'
        assert pending_request['studentMessage'] == 'Hi Emma! I would like you to be my guardian to help with my studies.'
        assert pending_request['student']['email'] == 'alice@example.com'

        # Step 4: Verify request appears in student's request history
        response = client.get(
            '/api/student/my-requests',
            headers={'Authorization': f'Bearer {auth_tokens["student1"]}'}
        )
        assert response.status_code == 200
        student_requests = json.loads(response.data)
        assert len(student_requests['requests']) == 1
        assert student_requests['requests'][0]['status'] == 'pending'

        # Step 5: Guardian approves the request
        response = client.post(
            f'/api/guardian/approve-request/{request_id}',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'},
            json={'response_message': 'Welcome Alice! I\'m happy to be your guardian.'}
        )
        assert response.status_code == 200
        approval_data = json.loads(response.data)
        assert approval_data['message'] == 'Request approved successfully'

        # Verify request status updated
        approved_request = approval_data['request']
        assert approved_request['status'] == 'approved'
        assert approved_request['guardianResponse'] == 'Welcome Alice! I\'m happy to be your guardian.'
        assert approved_request['processedBy'] == test_users["guardian"].id

        # Verify link was created
        active_link = approval_data['link']
        assert active_link['status'] == 'active'
        assert active_link['studentId'] == test_users["student1"].id
        assert active_link['guardianId'] == test_users["guardian"].id

        # Step 6: Verify student appears in guardian's student list
        response = client.get(
            '/api/guardian/students',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
        )
        assert response.status_code == 200
        students_data = json.loads(response.data)
        assert len(students_data['students']) == 1
        assert students_data['students'][0]['studentId'] == test_users["student1"].id

        # Step 7: Verify guardian appears in student's guardian list
        response = client.get(
            '/api/student/my-guardians',
            headers={'Authorization': f'Bearer {auth_tokens["student1"]}'}
        )
        assert response.status_code == 200
        guardians_data = json.loads(response.data)
        assert len(guardians_data['guardians']) == 1
        assert guardians_data['guardians'][0]['guardianId'] == test_users["guardian"].id

        # Step 8: Verify request no longer appears in pending list
        response = client.get(
            '/api/guardian/pending-requests',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
        )
        assert response.status_code == 200
        pending_data = json.loads(response.data)
        assert len(pending_data['requests']) == 0

        # Step 9: Verify updated request status in student's history
        response = client.get(
            '/api/student/my-requests',
            headers={'Authorization': f'Bearer {auth_tokens["student1"]}'}
        )
        assert response.status_code == 200
        student_requests = json.loads(response.data)
        assert student_requests['requests'][0]['status'] == 'approved'

        # Step 10: Verify student cannot send duplicate request
        response = client.post(
            f'/api/student/request-guardian/{test_users["guardian"].id}',
            headers={'Authorization': f'Bearer {auth_tokens["student1"]}'},
            json={'message': 'Another request'}
        )
        assert response.status_code == 400
        error_data = json.loads(response.data)
        assert 'Already linked' in error_data['error']

    def test_complete_rejection_workflow(self, client, test_users, auth_tokens):
        """Test complete workflow with request rejection"""

        # Step 1: Student sends request
        response = client.post(
            f'/api/student/request-guardian/{test_users["guardian"].id}',
            headers={'Authorization': f'Bearer {auth_tokens["student2"]}'},
            json={'message': 'Please be my guardian!'}
        )
        assert response.status_code == 201
        request_id = json.loads(response.data)['request']['id']

        # Step 2: Guardian rejects the request
        response = client.post(
            f'/api/guardian/reject-request/{request_id}',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'},
            json={
                'rejection_reason': 'I already have too many students to manage effectively.',
                'response_message': 'Sorry Bob, I can\'t take on additional students right now.'
            }
        )
        assert response.status_code == 200
        rejection_data = json.loads(response.data)
        assert rejection_data['message'] == 'Request rejected successfully'

        # Step 3: Verify rejection status and details
        rejected_request = rejection_data['request']
        assert rejected_request['status'] == 'rejected'
        assert rejected_request['rejectionReason'] == 'I already have too many students to manage effectively.'
        assert rejected_request['guardianResponse'] == 'Sorry Bob, I can\'t take on additional students right now.'

        # Step 4: Verify no link was created
        response = client.get(
            '/api/guardian/students',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
        )
        assert response.status_code == 200
        students_data = json.loads(response.data)
        # Should not contain the rejected student
        student_ids = [s['studentId'] for s in students_data['students']]
        assert test_users["student2"].id not in student_ids

        # Step 5: Verify request appears as rejected in student's history
        response = client.get(
            '/api/student/my-requests',
            headers={'Authorization': f'Bearer {auth_tokens["student2"]}'}
        )
        assert response.status_code == 200
        student_requests = json.loads(response.data)
        assert len(student_requests['requests']) == 1
        assert student_requests['requests'][0]['status'] == 'rejected'

        # Step 6: Verify student can send new request after rejection
        response = client.post(
            f'/api/student/request-guardian/{test_users["guardian2"].id}',
            headers={'Authorization': f'Bearer {auth_tokens["student2"]}'},
            json={'message': 'Trying with different guardian'}
        )
        assert response.status_code == 201

    def test_multiple_students_workflow(self, client, test_users, auth_tokens):
        """Test guardian managing multiple student requests"""

        # Step 1: Both students send requests to same guardian
        response1 = client.post(
            f'/api/student/request-guardian/{test_users["guardian"].id}',
            headers={'Authorization': f'Bearer {auth_tokens["student1"]}'},
            json={'message': 'Alice requesting guardianship'}
        )
        assert response1.status_code == 201
        request1_id = json.loads(response1.data)['request']['id']

        response2 = client.post(
            f'/api/student/request-guardian/{test_users["guardian"].id}',
            headers={'Authorization': f'Bearer {auth_tokens["student2"]}'},
            json={'message': 'Bob requesting guardianship'}
        )
        assert response2.status_code == 201
        request2_id = json.loads(response2.data)['request']['id']

        # Step 2: Guardian sees both pending requests
        response = client.get(
            '/api/guardian/pending-requests',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
        )
        assert response.status_code == 200
        pending_data = json.loads(response.data)
        assert len(pending_data['requests']) == 2

        # Step 3: Guardian batch approves both requests
        response = client.post(
            '/api/guardian/batch-approve',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'},
            json={
                'request_ids': [request1_id, request2_id],
                'response_message': 'Welcome both Alice and Bob!'
            }
        )
        assert response.status_code == 200
        batch_data = json.loads(response.data)
        assert batch_data['approved_count'] == 2
        assert batch_data['error_count'] == 0

        # Step 4: Verify both students are now linked
        response = client.get(
            '/api/guardian/students',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
        )
        assert response.status_code == 200
        students_data = json.loads(response.data)
        assert len(students_data['students']) == 2

        student_ids = [s['studentId'] for s in students_data['students']]
        assert test_users["student1"].id in student_ids
        assert test_users["student2"].id in student_ids

    def test_unlink_student_workflow(self, client, test_users, auth_tokens):
        """Test unlinking student after approval"""

        # Step 1: Create approved relationship
        response = client.post(
            f'/api/student/request-guardian/{test_users["guardian"].id}',
            headers={'Authorization': f'Bearer {auth_tokens["student1"]}'},
            json={'message': 'Please be my guardian!'}
        )
        request_id = json.loads(response.data)['request']['id']

        client.post(
            f'/api/guardian/approve-request/{request_id}',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
        )

        # Step 2: Guardian unlinks student
        response = client.post(
            f'/api/guardian/unlink-student/{test_users["student1"].id}',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'},
            json={'reason': 'Student completed all courses successfully'}
        )
        assert response.status_code == 200
        unlink_data = json.loads(response.data)
        assert unlink_data['message'] == 'Student unlinked successfully'

        # Step 3: Verify student no longer in guardian's active list
        response = client.get(
            '/api/guardian/students',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
        )
        assert response.status_code == 200
        students_data = json.loads(response.data)
        assert len(students_data['students']) == 0

        # Step 4: Verify link exists but is inactive
        unlinked_link = unlink_data['link']
        assert unlinked_link['status'] == 'inactive'
        assert unlinked_link['unlinkReason'] == 'Student completed all courses successfully'

    def test_cross_guardian_security(self, client, test_users, auth_tokens):
        """Test that guardians can only manage their own requests"""

        # Step 1: Student sends request to guardian1
        response = client.post(
            f'/api/student/request-guardian/{test_users["guardian"].id}',
            headers={'Authorization': f'Bearer {auth_tokens["student1"]}'},
            json={'message': 'Please be my guardian!'}
        )
        request_id = json.loads(response.data)['request']['id']

        # Step 2: Guardian2 tries to approve guardian1's request
        response = client.post(
            f'/api/guardian/approve-request/{request_id}',
            headers={'Authorization': f'Bearer {auth_tokens["guardian2"]}'}
        )
        assert response.status_code == 404
        error_data = json.loads(response.data)
        assert 'Request not found' in error_data['error']

        # Step 3: Guardian2 should not see guardian1's pending requests
        response = client.get(
            '/api/guardian/pending-requests',
            headers={'Authorization': f'Bearer {auth_tokens["guardian2"]}'}
        )
        assert response.status_code == 200
        pending_data = json.loads(response.data)
        assert len(pending_data['requests']) == 0

        # Step 4: Guardian1 should still see their request
        response = client.get(
            '/api/guardian/pending-requests',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
        )
        assert response.status_code == 200
        pending_data = json.loads(response.data)
        assert len(pending_data['requests']) == 1
        assert pending_data['requests'][0]['id'] == request_id

    def test_search_functionality_with_states(self, client, test_users, auth_tokens):
        """Test search shows correct link states"""

        # Step 1: Initial search - no relationship
        response = client.get(
            '/api/guardian/search?q=emma',
            headers={'Authorization': f'Bearer {auth_tokens["student1"]}'}
        )
        guardian_info = json.loads(response.data)['guardians'][0]
        assert not guardian_info['isLinked']
        assert not guardian_info['hasPendingRequest']

        # Step 2: Send request - should show pending
        client.post(
            f'/api/student/request-guardian/{test_users["guardian"].id}',
            headers={'Authorization': f'Bearer {auth_tokens["student1"]}'},
            json={'message': 'Please be my guardian!'}
        )

        response = client.get(
            '/api/guardian/search?q=emma',
            headers={'Authorization': f'Bearer {auth_tokens["student1"]}'}
        )
        guardian_info = json.loads(response.data)['guardians'][0]
        assert not guardian_info['isLinked']
        assert guardian_info['hasPendingRequest']

        # Step 3: Approve request - should show linked
        pending_response = client.get(
            '/api/guardian/pending-requests',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
        )
        request_id = json.loads(pending_response.data)['requests'][0]['id']

        client.post(
            f'/api/guardian/approve-request/{request_id}',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
        )

        response = client.get(
            '/api/guardian/search?q=emma',
            headers={'Authorization': f'Bearer {auth_tokens["student1"]}'}
        )
        guardian_info = json.loads(response.data)['guardians'][0]
        assert guardian_info['isLinked']
        assert not guardian_info['hasPendingRequest']

    def test_pagination_and_filtering(self, client, test_users, auth_tokens):
        """Test request pagination and status filtering"""

        # Create multiple requests from different students
        request_ids = []
        for i in range(5):
            student = User(
                id=f'paginated_student_{i}',
                email=f'student{i}@test.com',
                account_type='student',
                profile={'name': f'Student {i}'}
            )
            student.set_password('password123')
            db.session.add(student)
            db.session.commit()

            # Login student
            login_response = client.post('/api/auth/login', json={
                'email': f'student{i}@test.com',
                'password': 'password123'
            })
            token = json.loads(login_response.data)['token']

            # Send request
            response = client.post(
                f'/api/student/request-guardian/{test_users["guardian"].id}',
                headers={'Authorization': f'Bearer {token}'},
                json={'message': f'Request from student {i}'}
            )
            request_ids.append(json.loads(response.data)['request']['id'])

        # Test pagination
        response = client.get(
            '/api/guardian/pending-requests?page=1&per_page=3',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['requests']) == 3
        assert data['pagination']['total'] == 5
        assert data['pagination']['pages'] == 2

        # Approve some requests
        for request_id in request_ids[:2]:
            client.post(
                f'/api/guardian/approve-request/{request_id}',
                headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
            )

        # Test filtering by status
        response = client.get(
            '/api/guardian/pending-requests?status=pending',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['requests']) == 3  # Should only show pending

        response = client.get(
            '/api/guardian/pending-requests?status=all',
            headers={'Authorization': f'Bearer {auth_tokens["guardian"]}'}
        )
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['requests']) == 5  # Should show all


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])