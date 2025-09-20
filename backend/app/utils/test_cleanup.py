"""
Test Data Cleanup Utilities
Provides functions to clean up test-created availability records safely
"""
import logging
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy import and_
from app import db
from app.models import Availability, Session


class TestDataCleanup:
    """Utility class for cleaning up test data"""

    TEST_MARKERS = [
        'test_',
        'temp_',
        'unittest_',
        'integration_test_',
        'demo_'
    ]

    @staticmethod
    def mark_as_test_data(availability_id: str, marker: str = 'test_') -> bool:
        """
        Mark an availability record as test data by prefixing its ID

        Args:
            availability_id: ID of the availability to mark
            marker: Test marker prefix (default: 'test_')

        Returns:
            True if marked successfully, False otherwise
        """
        try:
            availability = Availability.query.get(availability_id)
            if availability and not any(availability.id.startswith(m) for m in TestDataCleanup.TEST_MARKERS):
                # Create new record with test marker
                original_id = availability.id
                availability.id = f"{marker}{original_id}"
                db.session.commit()
                logging.info(f"Marked availability {original_id} as test data: {availability.id}")
                return True
            return False
        except Exception as e:
            logging.error(f"Error marking availability as test data: {str(e)}")
            db.session.rollback()
            return False

    @staticmethod
    def is_test_data(availability_id: str) -> bool:
        """
        Check if an availability record is marked as test data

        Args:
            availability_id: ID to check

        Returns:
            True if it's test data, False otherwise
        """
        return any(availability_id.startswith(marker) for marker in TestDataCleanup.TEST_MARKERS)

    @staticmethod
    def cleanup_test_availability_records(tutor_id: str = None, confirm: bool = False) -> Dict[str, Any]:
        """
        Clean up test-marked availability records

        Args:
            tutor_id: Optional filter for specific tutor (if None, cleans all test records)
            confirm: Must be True to actually delete records (safety check)

        Returns:
            Dictionary with cleanup results
        """
        try:
            if not confirm:
                return {
                    'success': False,
                    'error': 'confirm parameter must be True to proceed with cleanup',
                    'dry_run': True
                }

            # Build query for test records
            query = Availability.query

            # Filter for test records only
            test_conditions = [Availability.id.like(f"{marker}%") for marker in TestDataCleanup.TEST_MARKERS]
            query = query.filter(db.or_(*test_conditions))

            # Filter by tutor if specified
            if tutor_id:
                query = query.filter(Availability.tutor_id == tutor_id)

            test_records = query.all()

            if not test_records:
                return {
                    'success': True,
                    'message': 'No test availability records found to clean up',
                    'deleted_count': 0,
                    'deleted_ids': []
                }

            # Check for associated sessions before deleting
            records_with_sessions = []
            safe_to_delete = []

            for record in test_records:
                sessions = Session.query.filter_by(availability_id=record.id).all()
                if sessions:
                    records_with_sessions.append({
                        'id': record.id,
                        'session_count': len(sessions)
                    })
                else:
                    safe_to_delete.append(record)

            # Delete records that have no associated sessions
            deleted_ids = []
            for record in safe_to_delete:
                deleted_ids.append(record.id)
                db.session.delete(record)

            db.session.commit()

            result = {
                'success': True,
                'deleted_count': len(deleted_ids),
                'deleted_ids': deleted_ids,
                'skipped_with_sessions': records_with_sessions,
                'cleanup_timestamp': datetime.utcnow().isoformat()
            }

            if records_with_sessions:
                result['warning'] = f"Skipped {len(records_with_sessions)} records with associated sessions"

            logging.info(f"Test cleanup completed: {result}")
            return result

        except Exception as e:
            db.session.rollback()
            logging.error(f"Error during test cleanup: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'cleanup_timestamp': datetime.utcnow().isoformat()
            }

    @staticmethod
    def cleanup_by_date_range(start_date: datetime, end_date: datetime, confirm: bool = False) -> Dict[str, Any]:
        """
        Clean up availability records created within a specific date range

        Args:
            start_date: Start of date range for cleanup
            end_date: End of date range for cleanup
            confirm: Must be True to actually delete records

        Returns:
            Dictionary with cleanup results
        """
        try:
            if not confirm:
                return {
                    'success': False,
                    'error': 'confirm parameter must be True to proceed with cleanup',
                    'dry_run': True
                }

            # Find records created in date range
            records = Availability.query.filter(
                and_(
                    Availability.created_at >= start_date,
                    Availability.created_at <= end_date
                )
            ).all()

            if not records:
                return {
                    'success': True,
                    'message': f'No availability records found in date range {start_date} to {end_date}',
                    'deleted_count': 0,
                    'deleted_ids': []
                }

            # Delete records
            deleted_ids = []
            for record in records:
                deleted_ids.append(record.id)
                db.session.delete(record)

            db.session.commit()

            result = {
                'success': True,
                'deleted_count': len(deleted_ids),
                'deleted_ids': deleted_ids,
                'date_range': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'cleanup_timestamp': datetime.utcnow().isoformat()
            }

            logging.info(f"Date range cleanup completed: {result}")
            return result

        except Exception as e:
            db.session.rollback()
            logging.error(f"Error during date range cleanup: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'cleanup_timestamp': datetime.utcnow().isoformat()
            }

    @staticmethod
    def get_cleanup_preview(tutor_id: str = None) -> Dict[str, Any]:
        """
        Preview what would be cleaned up without actually deleting

        Args:
            tutor_id: Optional filter for specific tutor

        Returns:
            Dictionary with preview information
        """
        try:
            # Build query for test records
            query = Availability.query

            # Filter for test records only
            test_conditions = [Availability.id.like(f"{marker}%") for marker in TestDataCleanup.TEST_MARKERS]
            query = query.filter(db.or_(*test_conditions))

            # Filter by tutor if specified
            if tutor_id:
                query = query.filter(Availability.tutor_id == tutor_id)

            test_records = query.all()

            preview = {
                'total_test_records': len(test_records),
                'records': [],
                'preview_timestamp': datetime.utcnow().isoformat()
            }

            for record in test_records:
                session_count = Session.query.filter_by(availability_id=record.id).count()
                preview['records'].append({
                    'id': record.id,
                    'tutor_id': record.tutor_id,
                    'created_at': record.created_at.isoformat() if record.created_at else None,
                    'is_recurring': record.is_recurring,
                    'has_sessions': session_count > 0,
                    'session_count': session_count,
                    'safe_to_delete': session_count == 0
                })

            return preview

        except Exception as e:
            logging.error(f"Error generating cleanup preview: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'preview_timestamp': datetime.utcnow().isoformat()
            }