"""
Enhanced Conflict Detection Service
Provides sophisticated conflict detection for sessions and availability
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from app.models import Session, Availability, User
from app import db
from app.services.cache_manager import cache_manager, cached
import logging

logger = logging.getLogger(__name__)

class ConflictType:
    """Enumeration of conflict types"""
    TUTOR_DOUBLE_BOOKING = "tutor_double_booking"
    AVAILABILITY_OVERLAP = "availability_overlap"
    TIME_CONSTRAINT_VIOLATION = "time_constraint_violation"
    STUDENT_DOUBLE_BOOKING = "student_double_booking"
    RESOURCE_CONFLICT = "resource_conflict"
    CAPACITY_EXCEEDED = "capacity_exceeded"


class ConflictDetector:
    """
    Enhanced conflict detection service for sessions and availability
    """

    @staticmethod
    @cached(ttl=300, key_prefix="conflict_check")  # Cache for 5 minutes
    def detect_session_conflicts(
        session_data: Dict[str, Any],
        existing_session_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Detect conflicts for a session creation or update

        Args:
            session_data: Session data to check for conflicts
            existing_session_id: ID of existing session (for updates)

        Returns:
            List of conflict objects
        """
        conflicts = []

        try:
            # Extract session parameters
            tutor_id = session_data.get('tutor_id')
            scheduled_date = session_data.get('scheduled_date')
            duration = session_data.get('duration', 60)  # Default 60 minutes
            student_ids = session_data.get('student_ids', [])

            if not tutor_id or not scheduled_date:
                return conflicts

            # Parse scheduled date
            if isinstance(scheduled_date, str):
                scheduled_date = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))

            session_start = scheduled_date
            session_end = session_start + timedelta(minutes=duration)

            # Check tutor conflicts
            tutor_conflicts = ConflictDetector._check_tutor_conflicts(
                tutor_id, session_start, session_end, existing_session_id
            )
            conflicts.extend(tutor_conflicts)

            # Check availability conflicts
            availability_conflicts = ConflictDetector._check_availability_conflicts(
                tutor_id, session_start, session_end
            )
            conflicts.extend(availability_conflicts)

            # Check student conflicts
            for student_id in student_ids:
                student_conflicts = ConflictDetector._check_student_conflicts(
                    student_id, session_start, session_end, existing_session_id
                )
                conflicts.extend(student_conflicts)

            # Check time constraints
            time_conflicts = ConflictDetector._check_time_constraints(
                session_start, session_end
            )
            conflicts.extend(time_conflicts)

        except Exception as e:
            logger.error(f"Error detecting session conflicts: {str(e)}")
            conflicts.append({
                'type': 'error',
                'message': f'Error checking conflicts: {str(e)}',
                'severity': 'high'
            })

        return conflicts

    @staticmethod
    def _check_tutor_conflicts(
        tutor_id: str,
        session_start: datetime,
        session_end: datetime,
        exclude_session_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Check for tutor double-booking conflicts"""
        conflicts = []

        try:
            # Query for overlapping sessions
            query = Session.query.filter(
                Session.tutor_id == tutor_id,
                Session.status.in_(['scheduled', 'in_progress']),
                db.or_(
                    # Session starts during our time
                    db.and_(
                        Session.scheduled_date >= session_start,
                        Session.scheduled_date < session_end
                    ),
                    # Session ends during our time
                    db.and_(
                        (Session.scheduled_date +
                         db.func.julianday(Session.duration || ' minutes')) > session_start,
                        (Session.scheduled_date +
                         db.func.julianday(Session.duration || ' minutes')) <= session_end
                    ),
                    # Our session is completely within existing session
                    db.and_(
                        Session.scheduled_date <= session_start,
                        (Session.scheduled_date +
                         db.func.julianday(Session.duration || ' minutes')) >= session_end
                    )
                )
            )

            if exclude_session_id:
                query = query.filter(Session.id != exclude_session_id)

            conflicting_sessions = query.all()

            for conflicting_session in conflicting_sessions:
                conflict_start = conflicting_session.scheduled_date
                conflict_end = conflict_start + timedelta(minutes=conflicting_session.duration)

                conflicts.append({
                    'type': ConflictType.TUTOR_DOUBLE_BOOKING,
                    'message': f'Tutor is already booked during this time',
                    'severity': 'high',
                    'details': {
                        'conflicting_session_id': conflicting_session.id,
                        'conflicting_session_title': conflicting_session.title,
                        'conflict_start': conflict_start.isoformat(),
                        'conflict_end': conflict_end.isoformat(),
                        'tutor_id': tutor_id
                    }
                })

        except Exception as e:
            logger.error(f"Error checking tutor conflicts: {str(e)}")

        return conflicts

    @staticmethod
    def _check_availability_conflicts(
        tutor_id: str,
        session_start: datetime,
        session_end: datetime
    ) -> List[Dict[str, Any]]:
        """Check if session conflicts with tutor availability"""
        conflicts = []

        try:
            # Get tutor's availability for the session date
            session_date = session_start.date()
            session_day_of_week = session_date.weekday()  # 0=Monday

            # Check for specific date availability
            specific_availability = Availability.query.filter(
                Availability.tutor_id == tutor_id,
                Availability.specific_date == session_date,
                Availability.available == True
            ).all()

            # Check for recurring availability
            recurring_availability = Availability.query.filter(
                Availability.tutor_id == tutor_id,
                Availability.day_of_week == session_day_of_week,
                Availability.specific_date.is_(None),
                Availability.available == True
            ).all()

            all_availability = specific_availability + recurring_availability

            if not all_availability:
                conflicts.append({
                    'type': ConflictType.AVAILABILITY_OVERLAP,
                    'message': 'No availability found for this time slot',
                    'severity': 'high',
                    'details': {
                        'tutor_id': tutor_id,
                        'session_date': session_date.isoformat(),
                        'day_of_week': session_day_of_week
                    }
                })
                return conflicts

            # Check if session time falls within available slots
            session_time_start = session_start.time()
            session_time_end = session_end.time()

            available_slots = []
            for avail in all_availability:
                # Parse availability time strings
                avail_start = datetime.strptime(avail.start_time, '%H:%M').time()
                avail_end = datetime.strptime(avail.end_time, '%H:%M').time()

                if avail_start <= session_time_start and session_time_end <= avail_end:
                    available_slots.append(avail)

            if not available_slots:
                conflicts.append({
                    'type': ConflictType.AVAILABILITY_OVERLAP,
                    'message': 'Session time is outside available hours',
                    'severity': 'medium',
                    'details': {
                        'tutor_id': tutor_id,
                        'session_start_time': session_time_start.strftime('%H:%M'),
                        'session_end_time': session_time_end.strftime('%H:%M'),
                        'available_slots': [
                            {
                                'start_time': avail.start_time,
                                'end_time': avail.end_time
                            } for avail in all_availability
                        ]
                    }
                })

        except Exception as e:
            logger.error(f"Error checking availability conflicts: {str(e)}")

        return conflicts

    @staticmethod
    def _check_student_conflicts(
        student_id: str,
        session_start: datetime,
        session_end: datetime,
        exclude_session_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Check for student double-booking conflicts"""
        conflicts = []

        try:
            # Query for overlapping sessions for this student
            from app.models import session_students  # Import the association table

            query = db.session.query(Session).join(session_students).filter(
                session_students.c.student_id == student_id,
                Session.status.in_(['scheduled', 'in_progress']),
                db.or_(
                    # Session starts during our time
                    db.and_(
                        Session.scheduled_date >= session_start,
                        Session.scheduled_date < session_end
                    ),
                    # Session ends during our time
                    db.and_(
                        (Session.scheduled_date +
                         db.func.julianday(Session.duration || ' minutes')) > session_start,
                        (Session.scheduled_date +
                         db.func.julianday(Session.duration || ' minutes')) <= session_end
                    ),
                    # Our session is completely within existing session
                    db.and_(
                        Session.scheduled_date <= session_start,
                        (Session.scheduled_date +
                         db.func.julianday(Session.duration || ' minutes')) >= session_end
                    )
                )
            )

            if exclude_session_id:
                query = query.filter(Session.id != exclude_session_id)

            conflicting_sessions = query.all()

            for conflicting_session in conflicting_sessions:
                conflict_start = conflicting_session.scheduled_date
                conflict_end = conflict_start + timedelta(minutes=conflicting_session.duration)

                conflicts.append({
                    'type': ConflictType.STUDENT_DOUBLE_BOOKING,
                    'message': f'Student is already enrolled in another session during this time',
                    'severity': 'high',
                    'details': {
                        'conflicting_session_id': conflicting_session.id,
                        'conflicting_session_title': conflicting_session.title,
                        'conflict_start': conflict_start.isoformat(),
                        'conflict_end': conflict_end.isoformat(),
                        'student_id': student_id
                    }
                })

        except Exception as e:
            logger.error(f"Error checking student conflicts: {str(e)}")

        return conflicts

    @staticmethod
    def _check_time_constraints(
        session_start: datetime,
        session_end: datetime
    ) -> List[Dict[str, Any]]:
        """Check for time-based constraints"""
        conflicts = []

        try:
            # Check if session is in the past
            if session_start < datetime.utcnow():
                conflicts.append({
                    'type': ConflictType.TIME_CONSTRAINT_VIOLATION,
                    'message': 'Cannot schedule sessions in the past',
                    'severity': 'high',
                    'details': {
                        'session_start': session_start.isoformat(),
                        'current_time': datetime.utcnow().isoformat()
                    }
                })

            # Check for unreasonable session duration
            duration_minutes = (session_end - session_start).total_seconds() / 60
            if duration_minutes > 480:  # 8 hours
                conflicts.append({
                    'type': ConflictType.TIME_CONSTRAINT_VIOLATION,
                    'message': 'Session duration exceeds maximum allowed time (8 hours)',
                    'severity': 'medium',
                    'details': {
                        'duration_minutes': duration_minutes,
                        'max_allowed_minutes': 480
                    }
                })

            if duration_minutes < 15:  # 15 minutes
                conflicts.append({
                    'type': ConflictType.TIME_CONSTRAINT_VIOLATION,
                    'message': 'Session duration is below minimum required time (15 minutes)',
                    'severity': 'medium',
                    'details': {
                        'duration_minutes': duration_minutes,
                        'min_required_minutes': 15
                    }
                })

            # Check for business hours (assuming 6 AM to 11 PM)
            session_hour = session_start.hour
            if session_hour < 6 or session_hour > 23:
                conflicts.append({
                    'type': ConflictType.TIME_CONSTRAINT_VIOLATION,
                    'message': 'Session is scheduled outside business hours (6 AM - 11 PM)',
                    'severity': 'low',
                    'details': {
                        'session_hour': session_hour,
                        'business_hours': '6 AM - 11 PM'
                    }
                })

        except Exception as e:
            logger.error(f"Error checking time constraints: {str(e)}")

        return conflicts

    @staticmethod
    def detect_bulk_session_conflicts(
        sessions_data: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Detect conflicts for bulk session creation

        Args:
            sessions_data: List of session data dictionaries

        Returns:
            Dictionary mapping session index to list of conflicts
        """
        all_conflicts = {}

        try:
            for i, session_data in enumerate(sessions_data):
                # Check individual session conflicts
                session_conflicts = ConflictDetector.detect_session_conflicts(session_data)

                # Check conflicts with other sessions in the same batch
                batch_conflicts = ConflictDetector._check_batch_conflicts(
                    session_data, sessions_data[:i] + sessions_data[i+1:]
                )
                session_conflicts.extend(batch_conflicts)

                if session_conflicts:
                    all_conflicts[str(i)] = session_conflicts

        except Exception as e:
            logger.error(f"Error detecting bulk session conflicts: {str(e)}")

        return all_conflicts

    @staticmethod
    def _check_batch_conflicts(
        session_data: Dict[str, Any],
        other_sessions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Check conflicts within a batch of sessions"""
        conflicts = []

        try:
            tutor_id = session_data.get('tutor_id')
            scheduled_date = session_data.get('scheduled_date')
            duration = session_data.get('duration', 60)

            if not tutor_id or not scheduled_date:
                return conflicts

            if isinstance(scheduled_date, str):
                scheduled_date = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))

            session_start = scheduled_date
            session_end = session_start + timedelta(minutes=duration)

            for other_session in other_sessions:
                other_tutor_id = other_session.get('tutor_id')
                other_scheduled_date = other_session.get('scheduled_date')
                other_duration = other_session.get('duration', 60)

                if not other_tutor_id or not other_scheduled_date:
                    continue

                # Only check conflicts with same tutor
                if tutor_id != other_tutor_id:
                    continue

                if isinstance(other_scheduled_date, str):
                    other_scheduled_date = datetime.fromisoformat(
                        other_scheduled_date.replace('Z', '+00:00')
                    )

                other_start = other_scheduled_date
                other_end = other_start + timedelta(minutes=other_duration)

                # Check for overlap
                if (session_start < other_end and session_end > other_start):
                    conflicts.append({
                        'type': ConflictType.TUTOR_DOUBLE_BOOKING,
                        'message': 'Tutor has conflicting session in the same batch',
                        'severity': 'high',
                        'details': {
                            'conflicting_session_start': other_start.isoformat(),
                            'conflicting_session_end': other_end.isoformat(),
                            'tutor_id': tutor_id,
                            'conflict_source': 'batch'
                        }
                    })

        except Exception as e:
            logger.error(f"Error checking batch conflicts: {str(e)}")

        return conflicts

    @staticmethod
    def invalidate_conflict_cache(tutor_id: str = None, student_id: str = None):
        """
        Invalidate conflict detection cache

        Args:
            tutor_id: Optional tutor ID to invalidate specific cache
            student_id: Optional student ID to invalidate specific cache
        """
        try:
            if tutor_id:
                cache_manager.clear_pattern(f"conflict_check:*{tutor_id}*")
            elif student_id:
                cache_manager.clear_pattern(f"conflict_check:*{student_id}*")
            else:
                cache_manager.clear_pattern("conflict_check:*")

            logger.info(f"Invalidated conflict cache for tutor_id={tutor_id}, student_id={student_id}")

        except Exception as e:
            logger.error(f"Error invalidating conflict cache: {str(e)}")

# Global instance
conflict_detector = ConflictDetector()