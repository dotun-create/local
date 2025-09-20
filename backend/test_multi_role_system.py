#!/usr/bin/env python3
"""
Test suite for multi-role user system implementation.
Tests database models, relationships, and role management functionality.
"""

import pytest
import sys
import os
from datetime import datetime, timedelta

# Add the parent directory to the path to import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, UserCourseProgress, TutorQualification, CourseSettings, Course


class TestMultiRoleModels:
    """Test the new multi-role database models"""

    @pytest.fixture(scope='function')
    def app(self):
        """Create test app with in-memory database"""
        app = create_app()
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['WTF_CSRF_ENABLED'] = False

        with app.app_context():
            db.create_all()
            yield app
            db.session.remove()
            db.drop_all()

    @pytest.fixture
    def client(self, app):
        """Create test client"""
        return app.test_client()

    @pytest.fixture
    def sample_user(self, app):
        """Create a sample user for testing"""
        with app.app_context():
            user = User(
                email='test@example.com',
                account_type='student',
                roles=['student']
            )
            user.set_password('testpassword')
            db.session.add(user)
            db.session.commit()
            return user

    @pytest.fixture
    def sample_course(self, app):
        """Create a sample course for testing"""
        with app.app_context():
            course = Course(
                title='Test Course',
                description='A test course',
                price=100.0,
                currency='USD',
                grade_level='Grade 10'
            )
            db.session.add(course)
            db.session.commit()
            return course

    def test_user_roles_field(self, app, sample_user):
        """Test User model roles field functionality"""
        with app.app_context():
            # Test default roles
            user = User.query.get(sample_user.id)
            assert user.roles == ['student']

            # Test role checking
            assert user.has_role('student')
            assert not user.has_role('tutor')

            # Test adding roles
            user.add_role('tutor')
            db.session.commit()

            assert user.has_role('tutor')
            assert user.has_role('student')
            assert set(user.roles) == {'student', 'tutor'}

    def test_user_role_management(self, app, sample_user):
        """Test User model role management methods"""
        with app.app_context():
            user = User.query.get(sample_user.id)

            # Test adding duplicate role
            user.add_role('student')  # Already has student role
            assert user.roles.count('student') == 1

            # Test removing role
            user.add_role('tutor')
            user.remove_role('student')
            db.session.commit()

            assert not user.has_role('student')
            assert user.has_role('tutor')
            assert user.roles == ['tutor']

    def test_user_course_progress_model(self, app, sample_user, sample_course):
        """Test UserCourseProgress model functionality"""
        with app.app_context():
            user = User.query.get(sample_user.id)
            course = Course.query.get(sample_course.id)

            # Create progress record
            progress = UserCourseProgress(
                user_id=user.id,
                course_id=course.id,
                status='enrolled',
                completion_percentage=0.0
            )
            db.session.add(progress)
            db.session.commit()

            # Test relationships
            assert progress.user.id == user.id
            assert progress.course.id == course.id

            # Test to_dict
            progress_dict = progress.to_dict()
            assert progress_dict['userId'] == user.id
            assert progress_dict['courseId'] == course.id
            assert progress_dict['status'] == 'enrolled'
            assert progress_dict['completionPercentage'] == 0.0

    def test_course_completion_flow(self, app, sample_user, sample_course):
        """Test complete course completion workflow"""
        with app.app_context():
            user = User.query.get(sample_user.id)
            course = Course.query.get(sample_course.id)

            # Create progress record
            progress = UserCourseProgress(
                user_id=user.id,
                course_id=course.id,
                status='enrolled'
            )
            db.session.add(progress)
            db.session.commit()

            # Simulate course progress
            progress.status = 'in_progress'
            progress.started_at = datetime.utcnow()
            progress.completion_percentage = 50.0
            db.session.commit()

            # Complete course
            progress.status = 'completed'
            progress.completion_percentage = 100.0
            progress.final_score = 92.5
            progress.completion_date = datetime.utcnow()
            db.session.commit()

            # Verify completion
            assert progress.status == 'completed'
            assert progress.final_score == 92.5
            assert progress.completion_date is not None

    def test_tutor_qualification_model(self, app, sample_user, sample_course):
        """Test TutorQualification model functionality"""
        with app.app_context():
            user = User.query.get(sample_user.id)
            course = Course.query.get(sample_course.id)

            # Create qualification
            qualification = TutorQualification(
                user_id=user.id,
                course_id=course.id,
                qualification_type='completion',
                qualifying_score=92.5
            )
            db.session.add(qualification)
            db.session.commit()

            # Test relationships
            assert qualification.user.id == user.id
            assert qualification.course.id == course.id

            # Test to_dict
            qual_dict = qualification.to_dict()
            assert qual_dict['userId'] == user.id
            assert qual_dict['courseId'] == course.id
            assert qual_dict['qualificationType'] == 'completion'
            assert qual_dict['qualifyingScore'] == 92.5

    def test_user_can_tutor_course(self, app, sample_user, sample_course):
        """Test User.can_tutor_course method"""
        with app.app_context():
            user = User.query.get(sample_user.id)
            course = Course.query.get(sample_course.id)

            # Initially cannot tutor (no tutor role)
            assert not user.can_tutor_course(course.id)

            # Add tutor role but no qualification
            user.add_role('tutor')
            db.session.commit()
            assert not user.can_tutor_course(course.id)

            # Add qualification
            qualification = TutorQualification(
                user_id=user.id,
                course_id=course.id,
                qualification_type='completion',
                qualifying_score=92.5
            )
            db.session.add(qualification)
            db.session.commit()

            # Now can tutor
            assert user.can_tutor_course(course.id)

    def test_user_get_qualified_courses(self, app, sample_user, sample_course):
        """Test User.get_qualified_courses method"""
        with app.app_context():
            user = User.query.get(sample_user.id)
            course = Course.query.get(sample_course.id)

            # Initially no qualified courses
            assert user.get_qualified_courses() == []

            # Add tutor role and qualification
            user.add_role('tutor')
            qualification = TutorQualification(
                user_id=user.id,
                course_id=course.id,
                qualification_type='completion',
                qualifying_score=92.5
            )
            db.session.add(qualification)
            db.session.commit()

            # Now has qualified courses
            qualified_courses = user.get_qualified_courses()
            assert course.id in qualified_courses

    def test_course_settings_model(self, app, sample_course):
        """Test CourseSettings model functionality"""
        with app.app_context():
            course = Course.query.get(sample_course.id)

            # Test get_or_create_for_course
            settings = CourseSettings.get_or_create_for_course(course.id)
            assert settings.course_id == course.id
            assert settings.min_score_to_tutor == 85.0  # Default value

            # Test relationship
            assert settings.course.id == course.id

            # Test to_dict
            settings_dict = settings.to_dict()
            assert settings_dict['courseId'] == course.id
            assert settings_dict['minScoreToTutor'] == 85.0
            assert settings_dict['autoApproveTutors'] is True

    def test_course_settings_get_or_create(self, app, sample_course):
        """Test CourseSettings get_or_create functionality"""
        with app.app_context():
            course = Course.query.get(sample_course.id)

            # First call creates new settings
            settings1 = CourseSettings.get_or_create_for_course(course.id)
            settings1_id = settings1.id

            # Second call returns existing settings
            settings2 = CourseSettings.get_or_create_for_course(course.id)
            assert settings2.id == settings1_id

    def test_unique_constraints(self, app, sample_user, sample_course):
        """Test unique constraints on new models"""
        with app.app_context():
            user = User.query.get(sample_user.id)
            course = Course.query.get(sample_course.id)

            # Test UserCourseProgress unique constraint
            progress1 = UserCourseProgress(
                user_id=user.id,
                course_id=course.id
            )
            db.session.add(progress1)
            db.session.commit()

            # Adding duplicate should raise error
            progress2 = UserCourseProgress(
                user_id=user.id,
                course_id=course.id
            )
            db.session.add(progress2)

            with pytest.raises(Exception):  # SQLAlchemy will raise IntegrityError
                db.session.commit()

            db.session.rollback()

            # Test TutorQualification unique constraint
            qual1 = TutorQualification(
                user_id=user.id,
                course_id=course.id
            )
            db.session.add(qual1)
            db.session.commit()

            # Adding duplicate should raise error
            qual2 = TutorQualification(
                user_id=user.id,
                course_id=course.id
            )
            db.session.add(qual2)

            with pytest.raises(Exception):  # SQLAlchemy will raise IntegrityError
                db.session.commit()

    def test_user_to_dict_includes_roles(self, app, sample_user):
        """Test that User.to_dict includes roles field"""
        with app.app_context():
            user = User.query.get(sample_user.id)
            user_dict = user.to_dict()

            assert 'roles' in user_dict
            assert user_dict['roles'] == ['student']

            # Add tutor role and test
            user.add_role('tutor')
            db.session.commit()

            user_dict = user.to_dict()
            assert set(user_dict['roles']) == {'student', 'tutor'}


if __name__ == '__main__':
    # Run the tests
    pytest.main([__file__, '-v'])