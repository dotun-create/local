#!/usr/bin/env python3
"""
Script to completely purge all sample/test data from the database
Removes all guardian, tutor, and student accounts while preserving admin accounts
"""

import uuid
from datetime import datetime
from app import create_app, db
from app.models import (
    User, Course, Module, Lesson, Session, Enrollment, 
    QuizResult, Notification, Invoice, Payment, TutorEarning, 
    Availability, GuardianInvitation, Quiz, Question
)

def purge_sample_data():
    """Completely purge all sample data from the database"""
    
    app = create_app()
    
    with app.app_context():
        print("🧹 Starting database cleanup...")
        print("⚠️  This will remove ALL guardian, tutor, and student data!")
        
        # Get counts before deletion
        total_users_before = User.query.count()
        students_count = User.query.filter_by(account_type='student').count()
        guardians_count = User.query.filter_by(account_type='guardian').count()
        tutors_count = User.query.filter_by(account_type='tutor').count()
        admins_count = User.query.filter_by(account_type='admin').count()
        courses_count = Course.query.count()
        sessions_count = Session.query.count()
        enrollments_count = Enrollment.query.count()
        
        print(f"\n📊 Current Database State:")
        print(f"   • Total Users: {total_users_before}")
        print(f"   • Students: {students_count}")
        print(f"   • Guardians: {guardians_count}")
        print(f"   • Tutors: {tutors_count}")
        print(f"   • Admins: {admins_count}")
        print(f"   • Courses: {courses_count}")
        print(f"   • Sessions: {sessions_count}")
        print(f"   • Enrollments: {enrollments_count}")
        
        # Confirm deletion
        confirm = input("\n⚠️  Are you sure you want to purge all non-admin data? (type 'PURGE' to confirm): ")
        if confirm != 'PURGE':
            print("❌ Operation cancelled.")
            return
        
        print("\n🗑️  Purging data...")
        
        try:
            # 1. Delete dependent records first (foreign key constraints)
            print("   • Deleting quiz results...")
            QuizResult.query.delete()
            
            print("   • Deleting questions...")
            Question.query.delete()
            
            print("   • Deleting quizzes...")
            Quiz.query.delete()
            
            print("   • Deleting notifications...")
            Notification.query.delete()
            
            print("   • Deleting payments...")
            Payment.query.delete()
            
            print("   • Deleting invoices...")
            Invoice.query.delete()
            
            print("   • Deleting tutor earnings...")
            TutorEarning.query.delete()
            
            print("   • Deleting availability records...")
            Availability.query.delete()
            
            print("   • Deleting guardian invitations...")
            GuardianInvitation.query.delete()
            
            print("   • Deleting enrollments...")
            Enrollment.query.delete()
            
            print("   • Deleting sessions...")
            Session.query.delete()
            
            print("   • Deleting lessons...")
            Lesson.query.delete()
            
            print("   • Deleting modules...")
            Module.query.delete()
            
            print("   • Deleting courses...")
            Course.query.delete()
            
            # 2. Delete non-admin users
            print("   • Deleting student accounts...")
            students_deleted = User.query.filter_by(account_type='student').delete()
            
            print("   • Deleting guardian accounts...")
            guardians_deleted = User.query.filter_by(account_type='guardian').delete()
            
            print("   • Deleting tutor accounts...")
            tutors_deleted = User.query.filter_by(account_type='tutor').delete()
            
            # Commit all changes
            db.session.commit()
            
            # Get final counts
            total_users_after = User.query.count()
            admins_after = User.query.filter_by(account_type='admin').count()
            
            print("\n✅ Database purge completed successfully!")
            print(f"\n📊 Purge Summary:")
            print(f"   • Students deleted: {students_deleted}")
            print(f"   • Guardians deleted: {guardians_deleted}")
            print(f"   • Tutors deleted: {tutors_deleted}")
            print(f"   • Courses deleted: {courses_count}")
            print(f"   • Sessions deleted: {sessions_count}")
            print(f"   • Enrollments deleted: {enrollments_count}")
            print(f"   • Total users before: {total_users_before}")
            print(f"   • Total users after: {total_users_after}")
            print(f"   • Admin accounts preserved: {admins_after}")
            
            print(f"\n🎯 Database is now clean and production-ready!")
            print(f"   • Only admin accounts remain")
            print(f"   • All sample/test data has been removed")
            print(f"   • New users can register through the normal signup process")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error during purge: {str(e)}")
            print("   • Database has been rolled back")
            print("   • No changes were made")
            raise

def verify_clean_state():
    """Verify that the database is in a clean state"""
    
    app = create_app()
    
    with app.app_context():
        print("\n🔍 Verifying clean database state...")
        
        # Check user counts
        students = User.query.filter_by(account_type='student').count()
        guardians = User.query.filter_by(account_type='guardian').count()
        tutors = User.query.filter_by(account_type='tutor').count()
        admins = User.query.filter_by(account_type='admin').count()
        
        # Check other data
        courses = Course.query.count()
        sessions = Session.query.count()
        enrollments = Enrollment.query.count()
        notifications = Notification.query.count()
        
        print(f"📊 Database State Verification:")
        print(f"   • Students: {students} (should be 0)")
        print(f"   • Guardians: {guardians} (should be 0)")
        print(f"   • Tutors: {tutors} (should be 0)")
        print(f"   • Admins: {admins} (should be > 0)")
        print(f"   • Courses: {courses} (should be 0)")
        print(f"   • Sessions: {sessions} (should be 0)")
        print(f"   • Enrollments: {enrollments} (should be 0)")
        print(f"   • Notifications: {notifications} (should be 0)")
        
        is_clean = (students == 0 and guardians == 0 and tutors == 0 and 
                   courses == 0 and sessions == 0 and enrollments == 0)
        
        if is_clean and admins > 0:
            print("\n✅ Database is CLEAN and ready for production!")
        else:
            print("\n⚠️  Database still contains sample data or missing admin accounts!")
            
        return is_clean

def create_fresh_admin():
    """Create a fresh admin account after purge"""
    
    app = create_app()
    
    with app.app_context():
        # Check if admin exists
        existing_admin = User.query.filter_by(account_type='admin').first()
        if existing_admin:
            print(f"✅ Admin account already exists: {existing_admin.email}")
            return
        
        print("\n👤 Creating fresh admin account...")
        
        # Create admin user
        admin = User(
            id=f"admin_{uuid.uuid4().hex[:8]}",
            email="admin@troupe.academy",
            account_type='admin',
            profile={
                'name': 'System Administrator',
                'role': 'Super Admin',
                'permissions': ['all'],
                'created_at': datetime.utcnow().isoformat(),
                'created_by': 'purge_script'
            },
            is_active=True
        )
        admin.set_password('admin123')
        
        try:
            db.session.add(admin)
            db.session.commit()
            
            print("✅ Fresh admin account created!")
            print(f"   • Email: {admin.email}")
            print(f"   • Password: admin123")
            print(f"   • User ID: {admin.id}")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error creating admin: {str(e)}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "verify":
            verify_clean_state()
        elif command == "admin":
            create_fresh_admin()
        elif command == "purge":
            purge_sample_data()
        else:
            print("Usage: python purge_sample_data.py [purge|verify|admin]")
    else:
        # Default: full purge
        purge_sample_data()
        verify_clean_state()