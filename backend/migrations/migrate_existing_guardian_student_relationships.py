"""
Data Migration: Create Guardian Student Requests for Existing Relationships
Migrates existing student-guardian relationships to use the new approval workflow system
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, GuardianStudentRequest, GuardianStudentLink
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_existing_relationships():
    """
    Migrate existing guardian-student relationships to use the new approval workflow
    Creates guardian_student_request and guardian_student_link records for existing relationships
    """

    app = create_app()

    with app.app_context():
        try:
            logger.info("Starting migration of existing guardian-student relationships...")

            # Find all students who have guardian information in their profile
            students_with_guardians = User.query.filter(
                User.account_type == 'student',
                User.profile.contains('guardian_id') | User.profile.contains('guardian_email')
            ).all()

            logger.info(f"Found {len(students_with_guardians)} students with guardian information")

            processed_count = 0
            created_requests = 0
            created_links = 0
            skipped_count = 0

            for student in students_with_guardians:
                try:
                    processed_count += 1
                    logger.info(f"Processing student {processed_count}/{len(students_with_guardians)}: {student.email}")

                    if not student.profile:
                        logger.warning(f"Student {student.email} has no profile data, skipping")
                        skipped_count += 1
                        continue

                    # Try to get guardian from profile
                    guardian_id = student.profile.get('guardian_id')
                    guardian_email = student.profile.get('guardian_email')

                    if not guardian_id and not guardian_email:
                        logger.warning(f"Student {student.email} has no guardian_id or guardian_email, skipping")
                        skipped_count += 1
                        continue

                    # Find guardian
                    guardian = None
                    if guardian_id:
                        guardian = User.query.get(guardian_id)

                    if not guardian and guardian_email:
                        guardian = User.query.filter_by(
                            email=guardian_email,
                            account_type='guardian'
                        ).first()

                    if not guardian:
                        logger.warning(f"Guardian not found for student {student.email} (ID: {guardian_id}, Email: {guardian_email})")
                        skipped_count += 1
                        continue

                    # Check if request already exists
                    existing_request = GuardianStudentRequest.query.filter_by(
                        student_id=student.id,
                        guardian_id=guardian.id
                    ).first()

                    if existing_request:
                        logger.info(f"Request already exists for student {student.email} and guardian {guardian.email}")
                    else:
                        # Create approved request for existing relationship
                        request = GuardianStudentRequest(
                            student_id=student.id,
                            guardian_id=guardian.id,
                            student_message=f'Migrated existing relationship for {student.profile.get("name", student.email)}',
                            status='approved',
                            processed_date=datetime.utcnow(),
                            processed_by=guardian.id,
                            guardian_response='Auto-approved during migration of existing relationship',
                            notes='Migrated from existing guardian-student relationship'
                        )

                        db.session.add(request)
                        created_requests += 1
                        logger.info(f"Created approved request for {student.email} -> {guardian.email}")

                    # Check if link already exists
                    existing_link = GuardianStudentLink.query.filter_by(
                        student_id=student.id,
                        guardian_id=guardian.id,
                        status='active'
                    ).first()

                    if existing_link:
                        logger.info(f"Active link already exists for student {student.email} and guardian {guardian.email}")
                    else:
                        # Create active link for existing relationship
                        link = GuardianStudentLink(
                            student_id=student.id,
                            guardian_id=guardian.id,
                            status='active',
                            linked_date=datetime.utcnow(),
                            linked_by=guardian.id
                        )

                        db.session.add(link)
                        created_links += 1
                        logger.info(f"Created active link for {student.email} -> {guardian.email}")

                    # Commit every 10 records to avoid large transactions
                    if processed_count % 10 == 0:
                        db.session.commit()
                        logger.info(f"Committed batch at {processed_count} processed students")

                except Exception as e:
                    logger.error(f"Error processing student {student.email}: {str(e)}")
                    db.session.rollback()
                    skipped_count += 1
                    continue

            # Final commit
            db.session.commit()

            logger.info("Migration completed successfully!")
            logger.info(f"Summary:")
            logger.info(f"  - Students processed: {processed_count}")
            logger.info(f"  - Requests created: {created_requests}")
            logger.info(f"  - Links created: {created_links}")
            logger.info(f"  - Students skipped: {skipped_count}")

            return {
                'success': True,
                'processed': processed_count,
                'created_requests': created_requests,
                'created_links': created_links,
                'skipped': skipped_count
            }

        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'error': str(e)
            }


def verify_migration():
    """
    Verify the migration results
    """

    app = create_app()

    with app.app_context():
        try:
            # Count students with guardian info
            students_with_guardians = User.query.filter(
                User.account_type == 'student',
                User.profile.contains('guardian_id') | User.profile.contains('guardian_email')
            ).count()

            # Count guardian requests
            total_requests = GuardianStudentRequest.query.count()
            approved_requests = GuardianStudentRequest.query.filter_by(status='approved').count()
            migrated_requests = GuardianStudentRequest.query.filter(
                GuardianStudentRequest.notes.contains('Migrated from existing')
            ).count()

            # Count active links
            active_links = GuardianStudentLink.query.filter_by(status='active').count()

            logger.info("Migration Verification:")
            logger.info(f"  - Students with guardian info: {students_with_guardians}")
            logger.info(f"  - Total guardian requests: {total_requests}")
            logger.info(f"  - Approved requests: {approved_requests}")
            logger.info(f"  - Migrated requests: {migrated_requests}")
            logger.info(f"  - Active guardian-student links: {active_links}")

            return {
                'students_with_guardians': students_with_guardians,
                'total_requests': total_requests,
                'approved_requests': approved_requests,
                'migrated_requests': migrated_requests,
                'active_links': active_links
            }

        except Exception as e:
            logger.error(f"Verification failed: {str(e)}")
            return {'error': str(e)}


def rollback_migration():
    """
    Rollback the migration (for testing purposes)
    WARNING: This will delete migrated data!
    """

    app = create_app()

    with app.app_context():
        try:
            logger.warning("ROLLBACK: Starting migration rollback...")

            # Delete migrated requests
            deleted_requests = GuardianStudentRequest.query.filter(
                GuardianStudentRequest.notes.contains('Migrated from existing')
            ).delete(synchronize_session=False)

            # Delete migrated links (be careful not to delete manually created ones)
            deleted_links = GuardianStudentLink.query.filter(
                GuardianStudentLink.linked_date >= datetime(2024, 1, 1)  # Adjust date as needed
            ).delete(synchronize_session=False)

            db.session.commit()

            logger.warning(f"ROLLBACK completed:")
            logger.warning(f"  - Requests deleted: {deleted_requests}")
            logger.warning(f"  - Links deleted: {deleted_links}")

            return {
                'success': True,
                'deleted_requests': deleted_requests,
                'deleted_links': deleted_links
            }

        except Exception as e:
            logger.error(f"Rollback failed: {str(e)}")
            db.session.rollback()
            return {'success': False, 'error': str(e)}


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Migrate existing guardian-student relationships')
    parser.add_argument('action', choices=['migrate', 'verify', 'rollback'],
                       help='Action to perform')

    args = parser.parse_args()

    if args.action == 'migrate':
        result = migrate_existing_relationships()
        if result['success']:
            print(f"✅ Migration completed successfully!")
            print(f"   Processed: {result['processed']} students")
            print(f"   Created: {result['created_requests']} requests, {result['created_links']} links")
            print(f"   Skipped: {result['skipped']} students")
        else:
            print(f"❌ Migration failed: {result['error']}")
            sys.exit(1)

    elif args.action == 'verify':
        result = verify_migration()
        if 'error' not in result:
            print("📊 Migration Verification Results:")
            print(f"   Students with guardians: {result['students_with_guardians']}")
            print(f"   Total requests: {result['total_requests']}")
            print(f"   Migrated requests: {result['migrated_requests']}")
            print(f"   Active links: {result['active_links']}")
        else:
            print(f"❌ Verification failed: {result['error']}")
            sys.exit(1)

    elif args.action == 'rollback':
        confirm = input("⚠️  Are you sure you want to rollback? This will delete migrated data! (yes/no): ")
        if confirm.lower() == 'yes':
            result = rollback_migration()
            if result['success']:
                print(f"✅ Rollback completed!")
                print(f"   Deleted: {result['deleted_requests']} requests, {result['deleted_links']} links")
            else:
                print(f"❌ Rollback failed: {result['error']}")
                sys.exit(1)
        else:
            print("Rollback cancelled")