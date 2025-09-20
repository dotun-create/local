"""
Recurring Availability Service

This service handles the creation, management, and conflict checking for recurring availability slots.
It provides functionality to:
- Create recurring availability patterns
- Generate specific availability instances
- Check for session conflicts
- Handle editability rules
- Manage exception dates
"""

from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Union, Tuple
from sqlalchemy.orm import joinedload
from sqlalchemy import and_, or_
import json
import pytz

from app import db
from app.models import Availability, Session, User, AvailabilityException
from flask import current_app


class RecurringAvailabilityService:
    
    @staticmethod
    def create_recurring_availability(
        tutor_id: str,
        day_of_week: int,
        start_time: str,
        end_time: str,
        start_date: Optional[date] = None,
        recurrence_type: str = 'weekly',
        recurrence_days: List[int] = None,
        recurrence_end_date: Optional[datetime] = None,
        course_id: Optional[str] = None,
        time_zone: str = 'UTC',
        original_timezone: Optional[str] = None,
        original_start_time: Optional[str] = None,
        original_end_time: Optional[str] = None
    ) -> Dict[str, Union[bool, str, List[str]]]:
        """
        Create a recurring availability pattern and generate specific instances
        
        Args:
            tutor_id: ID of the tutor
            day_of_week: Original day of week (0=Monday, 6=Sunday)
            start_time: Start time in HH:MM format (UTC)
            end_time: End time in HH:MM format (UTC)
            start_date: Date to start generating instances (optional, defaults to today)
            recurrence_type: Type of recurrence ('weekly', 'monthly')
            recurrence_days: List of days to repeat (0=Monday, 6=Sunday)
            recurrence_end_date: When to stop recurring (optional)
            course_id: Optional course assignment
            time_zone: Timezone for the availability (IANA format, now always UTC)
            original_timezone: User's original timezone for reference
            original_start_time: Original start time in user's local timezone (for display)
            original_end_time: Original end time in user's local timezone (for display)
        
        Returns:
            Dict with success status, parent availability ID, and generated instance IDs
        """
        try:
            # Validate tutor exists and has tutor role (supports dual-role users)
            tutor = User.query.get(tutor_id)
            if not tutor or not tutor.has_role('tutor'):
                return {'success': False, 'error': 'Tutor not found'}
            
            # Set default end date if not provided (3 months from now)
            if not recurrence_end_date:
                recurrence_end_date = datetime.utcnow() + timedelta(days=90)
            
            # Set default recurrence days if not provided
            if not recurrence_days:
                recurrence_days = [day_of_week]
            
            # PHASE 1 FIX: Ensure start_date is properly stored as recurrence_start_date
            # Convert start_date to datetime if it's a date object for consistency
            recurrence_start_date = None
            if start_date:
                if isinstance(start_date, date) and not isinstance(start_date, datetime):
                    # Convert date to datetime at start of day in the user's timezone
                    recurrence_start_date = datetime.combine(start_date, datetime.min.time())
                elif isinstance(start_date, datetime):
                    recurrence_start_date = start_date
                else:
                    current_app.logger.warning(f"Invalid start_date type: {type(start_date)}")

                current_app.logger.info(f"📅 BOUNDARY ENFORCEMENT: Pattern start date set to {recurrence_start_date}")
            else:
                current_app.logger.warning("⚠️ No start_date provided - pattern will have no start boundary")

            # Store original times for future timezone display purposes
            # Note: These are currently accepted but not stored in the Availability model
            # Future enhancement: Add original_start_time and original_end_time columns to store display times
            if original_start_time:
                current_app.logger.info(f"Original start time received: {original_start_time} ({time_zone})")
            if original_end_time:
                current_app.logger.info(f"Original end time received: {original_end_time} ({time_zone})")

            # Create the parent recurring availability record with proper boundary enforcement
            parent_availability = Availability(
                tutor_id=tutor_id,
                day_of_week=day_of_week,
                start_time=start_time,
                end_time=end_time,
                available=True,
                time_zone=time_zone,  # Now always UTC
                created_timezone=original_timezone or time_zone,  # Store creator's original timezone
                browser_timezone=original_timezone or time_zone,  # Store browser timezone
                original_timezone=original_timezone,  # NEW: Track user's original timezone
                course_id=course_id,
                is_recurring=True,
                recurrence_type=recurrence_type,
                recurrence_days=recurrence_days,
                recurrence_start_date=recurrence_start_date,  # FIXED: Store the start boundary
                recurrence_end_date=recurrence_end_date,
                exception_dates=[],
                # Timezone tracking metadata - new records store times in UTC
                timezone_storage_format='utc',
                data_migrated_at=datetime.utcnow(),
                migration_version='2025_09_17_utc_storage_fix'
            )
            
            db.session.add(parent_availability)
            db.session.commit()

            return {
                'success': True,
                'parent_availability_id': parent_availability.id,
                'pattern_type': 'virtual_only',
                'message': 'Recurring pattern created successfully. Instances will be generated virtually at query time.'
            }
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error creating recurring availability: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def _create_timezone_aware_instance(
        parent_availability: Availability, 
        instance_date: date,
        user_timezone: pytz.BaseTzInfo
    ) -> Availability:
        """
        Create a single availability instance with timezone awareness
        
        Args:
            parent_availability: The parent recurring availability record
            instance_date: The date for this instance
            user_timezone: The user's timezone
        
        Returns:
            Availability instance with proper timezone handling
        """
        try:
            # Parse the stored times (which are in UTC format for storage)
            start_time_str = parent_availability.start_time
            end_time_str = parent_availability.end_time
            
            # Create datetime objects in the user's timezone
            local_start = user_timezone.localize(
                datetime.combine(instance_date, datetime.strptime(start_time_str, '%H:%M').time())
            )
            local_end = user_timezone.localize(
                datetime.combine(instance_date, datetime.strptime(end_time_str, '%H:%M').time())
            )
            
            # Convert to UTC for storage while preserving the user's intent
            utc_start = local_start.astimezone(pytz.UTC)
            utc_end = local_end.astimezone(pytz.UTC)
            
            current_app.logger.info(
                f"Creating instance: {instance_date} {start_time_str}-{end_time_str} "
                f"in {parent_availability.time_zone} -> UTC: {utc_start.strftime('%H:%M')}-{utc_end.strftime('%H:%M')}"
            )
            
            return Availability(
                tutor_id=parent_availability.tutor_id,
                day_of_week=parent_availability.day_of_week,  # Preserve original day_of_week from parent
                start_time=start_time_str,  # Store original time in user's timezone
                end_time=end_time_str,      # Store original time in user's timezone
                available=True,
                time_zone=parent_availability.time_zone,  # Preserve original timezone
                created_timezone=parent_availability.created_timezone,  # Inherit from parent
                browser_timezone=parent_availability.browser_timezone,  # Inherit from parent
                course_id=parent_availability.course_id,
                is_recurring=False,
                parent_availability_id=parent_availability.id,
                specific_date=instance_date,
                # Timezone tracking metadata - inherit from parent (should be UTC)
                timezone_storage_format=getattr(parent_availability, 'timezone_storage_format', 'utc'),
                data_migrated_at=datetime.utcnow(),
                migration_version='2025_09_16_utc_fix'
            )
            
        except Exception as e:
            current_app.logger.error(f"Error creating timezone-aware instance: {str(e)}")
            raise

    @staticmethod
    def _generate_availability_instances(
        parent_availability: Availability,
        end_date: datetime,
        start_date: Optional[date] = None
    ) -> List[Availability]:
        """
        Generate specific availability instances based on the recurring pattern
        
        Args:
            parent_availability: The parent recurring availability record
            end_date: When to stop generating instances
            start_date: Date to start generating from (optional, defaults to today)
        
        Returns:
            List of specific availability instances
        """
        instances = []
        # Use provided start_date or default to today
        current_date = start_date if start_date else datetime.utcnow().date()
        
        # Get user's timezone for proper date calculations
        try:
            user_timezone = pytz.timezone(parent_availability.time_zone)
            current_app.logger.info(f"🌍 Generating instances in timezone: {parent_availability.time_zone}")
        except Exception as e:
            current_app.logger.warning(f"Invalid timezone {parent_availability.time_zone}, defaulting to UTC: {e}")
            user_timezone = pytz.UTC
        
        current_app.logger.info(f"🔧 Generating instances from {current_date} to {end_date.date()}")
        current_app.logger.info(f"Recurrence days (Python): {parent_availability.recurrence_days}")
        
        # Generate instances for weekly recurrence
        if parent_availability.recurrence_type == 'weekly':
            while current_date <= end_date.date():
                # Calculate weekday in user's timezone (not UTC)
                local_datetime = user_timezone.localize(
                    datetime.combine(current_date, datetime.min.time())
                )
                weekday = local_datetime.weekday()  # 0=Monday, 6=Sunday in user's timezone
                
                if weekday in parent_availability.recurrence_days:
                    # Skip if date has a deletion exception
                    exception = AvailabilityException.query.filter_by(
                        parent_availability_id=parent_availability.id,
                        exception_date=current_date,
                        exception_type='deleted'
                    ).first()

                    # Also check legacy exception_dates array for backward compatibility
                    date_str = current_date.isoformat()
                    legacy_exceptions = parent_availability.exception_dates or []

                    if not exception and date_str not in legacy_exceptions:
                        current_app.logger.info(
                            f"Creating instance for {current_date} (weekday {weekday} in {parent_availability.time_zone})"
                        )
                        # Use timezone-aware instance creation
                        instance = RecurringAvailabilityService._create_timezone_aware_instance(
                            parent_availability, current_date, user_timezone
                        )
                        instances.append(instance)
                
                current_date += timedelta(days=1)
        
        return instances
    
    @staticmethod
    def check_slot_conflicts(availability_id: str) -> Dict[str, Union[bool, List[str]]]:
        """
        Check if an availability slot has any session conflicts that make it unavailable
        
        This method only considers sessions as conflicts if they are:
        - Future sessions in 'scheduled' or 'in_progress' status
        - Current sessions in 'in_progress' status
        
        Past, completed, cancelled, or no-show sessions do NOT create conflicts 
        as they should free up the availability slot for new bookings.
        
        Args:
            availability_id: ID of the availability slot to check
        
        Returns:
            Dict with conflict status and list of conflicting sessions
        """
        try:
            availability = Availability.query.get(availability_id)
            if not availability:
                return {'has_conflicts': False, 'error': 'Availability slot not found'}
            
            # Get all sessions for this availability
            sessions = Session.query.filter_by(availability_id=availability_id).all()
            
            conflict_sessions = []
            now = datetime.utcnow()
            
            current_app.logger.debug(f"Checking conflicts for availability {availability_id}: found {len(sessions)} linked sessions")
            
            for session in sessions:
                # Only consider sessions as conflicts if they are:
                # 1. Future sessions that are scheduled or in progress
                # 2. Current sessions that are in progress
                session_date = session.scheduled_date
                session_status = session.status
                
                # Calculate session end time (session_date + duration)
                session_duration = timedelta(minutes=session.duration or 60)
                session_end = session_date + session_duration
                
                # Check if session makes the slot unavailable
                is_conflict = False
                
                if session_status in ['scheduled', 'in_progress']:
                    # For scheduled sessions: only conflict if in the future
                    # For in_progress sessions: conflict if currently ongoing or in future
                    if session_status == 'scheduled' and session_date > now:
                        is_conflict = True
                    elif session_status == 'in_progress' and session_end > now:
                        is_conflict = True
                
                # Sessions with status 'completed', 'cancelled', 'no_show' are NOT conflicts
                # as they free up the availability slot for new bookings
                
                if is_conflict:
                    conflict_sessions.append({
                        'session_id': session.id,
                        'title': session.title,
                        'scheduled_date': session_date.isoformat() if session_date else None,
                        'status': session_status,
                        'is_future': session_date > now if session_date else False,
                        'session_end': session_end.isoformat() if session_end else None
                    })
                
                # Log session analysis for debugging
                current_app.logger.debug(f"Session {session.id}: status={session_status}, "
                                        f"scheduled={session_date}, is_conflict={is_conflict}")
            
            return {
                'has_conflicts': len(conflict_sessions) > 0,
                'conflict_count': len(conflict_sessions),
                'conflicting_sessions': conflict_sessions,
                'total_sessions': len(sessions),  # Total sessions linked (for debugging)
                'available_for_booking': len(conflict_sessions) == 0  # Slot is available if no conflicts
            }
            
        except Exception as e:
            current_app.logger.error(f"Error checking slot conflicts: {str(e)}")
            return {'has_conflicts': False, 'error': str(e)}
    
    @staticmethod
    def update_recurring_series(
        parent_availability_id: str,
        updates: Dict,
        update_future_only: bool = True
    ) -> Dict[str, Union[bool, str, int]]:
        """
        Update a recurring availability series
        
        Args:
            parent_availability_id: ID of the parent recurring availability
            updates: Dictionary of fields to update
            update_future_only: Whether to update only future instances
        
        Returns:
            Dict with success status and number of updated instances
        """
        try:
            parent_availability = Availability.query.get(parent_availability_id)
            if not parent_availability or not parent_availability.is_recurring:
                return {'success': False, 'error': 'Parent recurring availability not found'}
            
            # Update parent record
            for field, value in updates.items():
                if hasattr(parent_availability, field):
                    setattr(parent_availability, field, value)
            
            # Get all child instances
            query = Availability.query.filter_by(parent_availability_id=parent_availability_id)
            
            if update_future_only:
                # Only update future instances
                today = datetime.utcnow().date()
                query = query.filter(Availability.specific_date >= today)
            
            child_instances = query.all()
            updated_count = 0
            
            # Update each instance, but skip those with sessions
            for instance in child_instances:
                if instance.is_editable():  # No sessions booked
                    for field, value in updates.items():
                        if hasattr(instance, field) and field not in ['is_recurring', 'parent_availability_id']:
                            setattr(instance, field, value)
                    updated_count += 1
            
            db.session.commit()
            
            return {
                'success': True,
                'updated_count': updated_count,
                'total_instances': len(child_instances),
                'skipped_count': len(child_instances) - updated_count
            }
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error updating recurring series: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def delete_recurring_series(
        parent_availability_id: str,
        delete_future_only: bool = True
    ) -> Dict[str, Union[bool, str, int]]:
        """
        Delete a recurring availability series
        
        Args:
            parent_availability_id: ID of the parent recurring availability
            delete_future_only: Whether to delete only future instances
        
        Returns:
            Dict with success status and number of deleted instances
        """
        try:
            parent_availability = Availability.query.get(parent_availability_id)
            if not parent_availability or not parent_availability.is_recurring:
                return {'success': False, 'error': 'Parent recurring availability not found'}
            
            # Get all child instances
            query = Availability.query.filter_by(parent_availability_id=parent_availability_id)
            
            if delete_future_only:
                today = datetime.utcnow().date()
                query = query.filter(Availability.specific_date >= today)
            
            child_instances = query.all()
            deleted_count = 0
            
            # Delete each instance, but skip those with sessions
            for instance in child_instances:
                if instance.is_editable():  # No sessions booked
                    db.session.delete(instance)
                    deleted_count += 1
            
            # If deleting all instances, also delete parent
            if not delete_future_only:
                remaining_instances = Availability.query.filter_by(
                    parent_availability_id=parent_availability_id
                ).count()
                
                if remaining_instances == deleted_count:  # All instances are being deleted
                    db.session.delete(parent_availability)
            
            db.session.commit()
            
            return {
                'success': True,
                'deleted_count': deleted_count,
                'total_instances': len(child_instances),
                'skipped_count': len(child_instances) - deleted_count
            }
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error deleting recurring series: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def add_exception_date(parent_availability_id: str, exception_date: Union[str, date]) -> Dict[str, Union[bool, str]]:
        """
        Add an exception date to skip in the recurring pattern
        
        Args:
            parent_availability_id: ID of the parent recurring availability
            exception_date: Date to skip (ISO format string or date object)
        
        Returns:
            Dict with success status
        """
        try:
            parent_availability = Availability.query.get(parent_availability_id)
            if not parent_availability or not parent_availability.is_recurring:
                return {'success': False, 'error': 'Parent recurring availability not found'}
            
            # Convert to string if date object
            if isinstance(exception_date, date):
                exception_date = exception_date.isoformat()
            
            # Add to exception dates list
            exception_dates = parent_availability.exception_dates or []
            if exception_date not in exception_dates:
                exception_dates.append(exception_date)
                parent_availability.exception_dates = exception_dates
                
                # Also delete any existing instance for this date
                specific_date = datetime.fromisoformat(exception_date).date()
                instance_to_delete = Availability.query.filter_by(
                    parent_availability_id=parent_availability_id,
                    specific_date=specific_date
                ).first()
                
                if instance_to_delete and instance_to_delete.is_editable():
                    db.session.delete(instance_to_delete)
                
                db.session.commit()
            
            return {'success': True, 'message': 'Exception date added successfully'}
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error adding exception date: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def get_availability_with_conflicts(tutor_id: str, start_date: date, end_date: date, user_timezone: str = None, pattern_id: str = None) -> List[Dict]:
        """
        Get all availability slots for a tutor with conflict information using VIRTUAL INSTANCES ONLY

        Args:
            tutor_id: ID of the tutor
            start_date: Start date for the query
            end_date: End date for the query
            user_timezone: User's timezone for display purposes
            pattern_id: Optional filter to get instances from specific pattern only (for testing)

        Returns:
            List of virtual availability instances with conflict and editability information
        """
        try:
            current_app.logger.info(f"🔄 Getting virtual availability instances for tutor {tutor_id} from {start_date} to {end_date}")

            # Use virtual-only instance generation with optional pattern filtering
            if pattern_id:
                current_app.logger.info(f"🎯 Filtering for specific pattern: {pattern_id}")

            availability_instances = RecurringAvailabilityService.get_availability_with_date_instances(
                tutor_id=tutor_id,
                start_date=start_date,
                end_date=end_date,
                pattern_id=pattern_id,  # Pass pattern filter
                user_timezone=user_timezone  # Pass timezone for consistent handling
            )

            # Add conflict information to each virtual instance
            for instance in availability_instances:
                try:
                    # Virtual instances have synthetic IDs for conflict checking
                    instance_id = instance.get('id')
                    parent_id = instance.get('parent_id', instance_id)

                    # Check conflicts using parent pattern ID or instance ID
                    if parent_id and parent_id != instance_id:
                        # This is a virtual instance, check conflicts on parent pattern
                        conflict_info = RecurringAvailabilityService.check_slot_conflicts(parent_id)
                    else:
                        # This is a stored single instance
                        conflict_info = RecurringAvailabilityService.check_slot_conflicts(instance_id)

                    # Add timezone information if provided
                    if user_timezone:
                        instance['userTimezone'] = user_timezone
                        instance['displayTimezone'] = user_timezone

                    # Add conflict and editability information
                    instance.update({
                        'hasConflicts': conflict_info.get('has_conflicts', False),
                        'conflictCount': conflict_info.get('conflict_count', 0),
                        'conflictingSessions': conflict_info.get('conflicting_sessions', []),
                        'isEditable': True,  # Virtual instances are always editable (edit affects pattern)
                        'isFutureDate': True,  # Generated instances are for future dates
                        'availableForBooking': not conflict_info.get('has_conflicts', False),
                        'totalSessions': conflict_info.get('total_sessions', 0),
                        'systemGenerated': instance.get('is_virtual', False)
                    })

                except Exception as e:
                    current_app.logger.error(f"Error processing virtual instance {instance.get('id', 'unknown')}: {str(e)}")
                    # Add default values for this instance
                    instance.update({
                        'hasConflicts': False,
                        'conflictCount': 0,
                        'conflictingSessions': [],
                        'isEditable': True,
                        'isFutureDate': True,
                        'availableForBooking': True,
                        'totalSessions': 0,
                        'systemGenerated': instance.get('is_virtual', False)
                    })

            current_app.logger.info(f"✅ Returning {len(availability_instances)} virtual instances with conflict info")
            return availability_instances

        except Exception as e:
            current_app.logger.error(f"Error getting virtual availability with conflicts: {str(e)}")
            return []

    @staticmethod
    def get_availability_with_date_instances(tutor_id: str, start_date: date = None, end_date: date = None, days_ahead: int = 90, pattern_id: str = None, user_timezone: str = None) -> List[Dict]:
        """
        Get availability slots with specific date instances generated from recurring patterns
        ENHANCED: Enforces strict date boundaries and returns only instances within the specified range

        Args:
            tutor_id: ID of the tutor
            start_date: Start date for generating instances (defaults to today) - INCLUSIVE
            end_date: End date for generating instances (defaults to start_date + days_ahead) - INCLUSIVE
            days_ahead: Number of days to generate instances for (default 90 days)
            pattern_id: Optional filter to get instances from specific pattern only
            user_timezone: User's timezone for consistent timezone handling

        Returns:
            List of availability instance slots with specific dates (no parent records)
            All instances will have dates >= start_date AND <= end_date
        """
        try:
            # Ensure we have valid date boundaries
            if not start_date:
                start_date = datetime.utcnow().date()
            if not end_date:
                end_date = start_date + timedelta(days=days_ahead)

            # Validate date boundaries
            if start_date > end_date:
                current_app.logger.error(f"Invalid date range: start_date {start_date} > end_date {end_date}")
                return []

            current_app.logger.info(f"📅 Strict date boundary enforcement: {start_date} to {end_date} (both inclusive)")

            availability_instances = []

            # Get single-date availabilities (these are actual instances)
            single_date_availabilities = Availability.query.filter(
                and_(
                    Availability.tutor_id == tutor_id,
                    Availability.specific_date.isnot(None),
                    Availability.specific_date >= start_date,
                    Availability.specific_date <= end_date
                )
            ).all()

            current_app.logger.info(f"📅 Found {len(single_date_availabilities)} single-date availabilities")

            for availability in single_date_availabilities:
                availability_dict = availability.to_dict()
                availability_dict['instance_date'] = availability.specific_date.isoformat()
                availability_dict['slot_type'] = 'single'
                availability_dict['base_id'] = availability.id  # For single slots, base_id equals id
                availability_dict['is_virtual'] = False  # Real database record
                availability_instances.append(availability_dict)

            # Get recurring availabilities and generate virtual instances (not parent records)
            recurring_query = Availability.query.filter(
                and_(
                    Availability.tutor_id == tutor_id,
                    Availability.is_recurring == True,
                    Availability.specific_date.is_(None)
                )
            )

            # Add pattern filtering if specified
            if pattern_id:
                recurring_query = recurring_query.filter(Availability.id == pattern_id)
                current_app.logger.info(f"🎯 Filtering for pattern {pattern_id}")

            recurring_availabilities = recurring_query.all()

            current_app.logger.info(f"📅 Found {len(recurring_availabilities)} recurring patterns")

            pattern_summary = []
            for recurring_availability in recurring_availabilities:
                # Log pattern details before processing
                pattern_start = recurring_availability.recurrence_start_date.isoformat() if recurring_availability.recurrence_start_date else "No limit"
                pattern_end = recurring_availability.recurrence_end_date.isoformat() if recurring_availability.recurrence_end_date else "No limit"
                current_app.logger.info(f"🔄 Processing pattern {recurring_availability.id}: {pattern_start} to {pattern_end}")

                # Generate virtual date instances for this recurring pattern
                virtual_instances = RecurringAvailabilityService._generate_recurring_instances(
                    recurring_availability, start_date, end_date, user_timezone
                )
                current_app.logger.info(f"📅 Generated {len(virtual_instances)} virtual instances for pattern {recurring_availability.id}")
                availability_instances.extend(virtual_instances)

                # Track for summary
                pattern_summary.append({
                    'pattern_id': recurring_availability.id,
                    'instances_generated': len(virtual_instances),
                    'pattern_start': pattern_start,
                    'pattern_end': pattern_end
                })

            # Log overall pattern processing summary
            if pattern_summary:
                current_app.logger.info(f"📊 Pattern Processing Summary:")
                for summary in pattern_summary:
                    current_app.logger.info(f"   Pattern {summary['pattern_id']}: {summary['instances_generated']} instances ({summary['pattern_start']} to {summary['pattern_end']})")

            # FINAL BOUNDARY ENFORCEMENT: Filter out any instances that might have slipped through
            filtered_instances = []
            for instance in availability_instances:
                instance_date_str = instance.get('instance_date')
                if instance_date_str:
                    try:
                        instance_date = datetime.fromisoformat(instance_date_str).date()
                        if start_date <= instance_date <= end_date:
                            filtered_instances.append(instance)
                        else:
                            current_app.logger.warning(f"🚫 Filtered out instance {instance.get('id')} with date {instance_date} outside boundaries")
                    except ValueError:
                        current_app.logger.error(f"❌ Invalid instance_date format: {instance_date_str}")
                else:
                    current_app.logger.warning(f"⚠️ Instance missing instance_date: {instance.get('id')}")

            # Sort by date and time
            filtered_instances.sort(key=lambda x: (x['instance_date'], x.get('start_time', '')))

            current_app.logger.info(f"📅 Returning {len(filtered_instances)} instances within strict boundaries {start_date} to {end_date}")
            return filtered_instances

        except Exception as e:
            current_app.logger.error(f"Error getting availability with date instances: {str(e)}")
            return []

    @staticmethod
    def _generate_recurring_instances(recurring_availability: Availability, start_date, end_date, user_timezone: str = None) -> List[Dict]:
        """
        Generate virtual date instances from a recurring availability pattern
        FIXED: Uses proper weekday conversion and generates virtual instances only

        Args:
            recurring_availability: The recurring availability record
            start_date: Start date for generating instances (datetime or date)
            end_date: End date for generating instances (datetime or date)
            user_timezone: User's timezone for consistent timezone handling

        Returns:
            List of virtual availability instances with specific dates (no database records)
        """
        instances = []

        try:
            # Convert datetime to date if needed for consistent date comparisons
            if hasattr(start_date, 'date'):
                start_date = start_date.date()
            if hasattr(end_date, 'date'):
                end_date = end_date.date()

            # PHASE 3 FIX: Mandatory boundary enforcement - fail early if pattern lacks proper boundaries
            if not recurring_availability.recurrence_start_date and not recurring_availability.recurrence_end_date:
                current_app.logger.warning(f"⚠️ Pattern {recurring_availability.id} has no boundary constraints - this may generate incorrect instances")

            # For patterns without start boundary, log this as a potential data issue
            if not recurring_availability.recurrence_start_date:
                current_app.logger.warning(f"⚠️ Pattern {recurring_availability.id} missing recurrence_start_date - may generate instances before intended start")
            # Get the recurrence days (default to the main day_of_week if not set)
            recurrence_days = recurring_availability.recurrence_days or [recurring_availability.day_of_week]
            if isinstance(recurrence_days, str):
                import json
                recurrence_days = json.loads(recurrence_days)

            current_app.logger.info(f"🔄 Generating instances for pattern {recurring_availability.id} with recurrence days: {recurrence_days}")

            # ENHANCED: Calculate effective date range for this specific pattern
            # This ensures each recurring pattern respects its individual start/end dates

            # Get pattern-specific start date (individual pattern boundary)
            pattern_start_date = start_date
            pattern_has_start_limit = False
            if recurring_availability.recurrence_start_date:
                # Convert datetime to date for comparison
                recurrence_start_as_date = recurring_availability.recurrence_start_date.date() if hasattr(recurring_availability.recurrence_start_date, 'date') else recurring_availability.recurrence_start_date
                pattern_start_date = max(start_date, recurrence_start_as_date)
                pattern_has_start_limit = True
                current_app.logger.info(f"📅 Pattern {recurring_availability.id} has start limit: {recurrence_start_as_date}")

            # Get pattern-specific end date (individual pattern boundary)
            pattern_end_date = end_date
            pattern_has_end_limit = False
            if recurring_availability.recurrence_end_date:
                # Convert datetime to date for comparison
                recurrence_end_as_date = recurring_availability.recurrence_end_date.date() if hasattr(recurring_availability.recurrence_end_date, 'date') else recurring_availability.recurrence_end_date
                pattern_end_date = min(end_date, recurrence_end_as_date)
                pattern_has_end_limit = True
                current_app.logger.info(f"📅 Pattern {recurring_availability.id} has end limit: {recurrence_end_as_date}")

            # Log the effective range for this pattern
            current_app.logger.info(f"🎯 Pattern {recurring_availability.id} effective range: {pattern_start_date} to {pattern_end_date}")
            current_app.logger.info(f"   Query range: {start_date} to {end_date}")
            current_app.logger.info(f"   Pattern constraints: start={pattern_has_start_limit}, end={pattern_has_end_limit}")

            # Validate that we have a valid date range for this pattern
            if pattern_start_date > pattern_end_date:
                current_app.logger.warning(f"⚠️ Pattern {recurring_availability.id} has invalid date range: {pattern_start_date} > {pattern_end_date} - skipping")
                return instances

            # Generate virtual instances for each day in the recurrence pattern with TRIPLE boundary checking
            current_date = pattern_start_date
            instances_generated = 0
            while current_date <= pattern_end_date:
                # TRIPLE BOUNDARY CHECK: Query boundaries AND individual pattern boundaries

                # 1. Query-level boundary check
                if current_date < start_date or current_date > end_date:
                    current_date += timedelta(days=1)
                    continue

                # 2. Pattern-level boundary check (redundant but explicit)
                pattern_date_valid = True
                if recurring_availability.recurrence_start_date:
                    recurrence_start_as_date = recurring_availability.recurrence_start_date.date() if hasattr(recurring_availability.recurrence_start_date, 'date') else recurring_availability.recurrence_start_date
                    if current_date < recurrence_start_as_date:
                        pattern_date_valid = False

                if recurring_availability.recurrence_end_date:
                    recurrence_end_as_date = recurring_availability.recurrence_end_date.date() if hasattr(recurring_availability.recurrence_end_date, 'date') else recurring_availability.recurrence_end_date
                    if current_date > recurrence_end_as_date:
                        pattern_date_valid = False

                if not pattern_date_valid:
                    current_app.logger.debug(f"⏭️ Skipping {current_date} - outside pattern {recurring_availability.id} individual boundaries")
                    current_date += timedelta(days=1)
                    continue

                # 3. Weekday pattern check
                python_weekday = current_date.weekday()  # 0=Monday, 6=Sunday
                if python_weekday not in recurrence_days:
                    current_date += timedelta(days=1)
                    continue

                # 4. Exception checking
                exception = AvailabilityException.query.filter_by(
                    parent_availability_id=recurring_availability.id,
                    exception_date=current_date,
                    exception_type='deleted'
                ).first()

                # Also check legacy exception_dates array for backward compatibility
                date_str = current_date.isoformat()
                legacy_exceptions = recurring_availability.exception_dates or []

                if exception or date_str in legacy_exceptions:
                    current_app.logger.debug(f"⏭️ Skipping {current_date} - exception exists")
                    current_date += timedelta(days=1)
                    continue

                # All checks passed - create virtual instance
                instance_dict = recurring_availability.to_dict(user_timezone=user_timezone)
                instance_dict['instance_date'] = current_date.isoformat()
                instance_dict['slot_type'] = 'instance'
                instance_dict['parent_id'] = recurring_availability.id
                instance_dict['base_id'] = recurring_availability.id
                instance_dict['is_virtual'] = True
                instance_dict['id'] = f"{recurring_availability.id}_{current_date.isoformat()}"

                # Add pattern boundary metadata for debugging
                instance_dict['pattern_start_date'] = recurring_availability.recurrence_start_date.isoformat() if recurring_availability.recurrence_start_date else None
                instance_dict['pattern_end_date'] = recurring_availability.recurrence_end_date.isoformat() if recurring_availability.recurrence_end_date else None
                instance_dict['effective_start_date'] = pattern_start_date.isoformat()
                instance_dict['effective_end_date'] = pattern_end_date.isoformat()

                # Ensure consistent timezone information
                if user_timezone:
                    instance_dict['userTimezone'] = user_timezone
                    instance_dict['displayTimezone'] = user_timezone

                instances.append(instance_dict)
                instances_generated += 1

                current_app.logger.debug(f"✅ Generated virtual instance for {current_date} (weekday {python_weekday}) within all boundaries")

                current_date += timedelta(days=1)

            current_app.logger.info(f"🎯 Generated {instances_generated} virtual instances from pattern {recurring_availability.id} within individual pattern boundaries")
            current_app.logger.info(f"   Pattern effective range: {pattern_start_date} to {pattern_end_date}")
            current_app.logger.info(f"   Pattern constraints respected: start={pattern_has_start_limit}, end={pattern_has_end_limit}")

        except Exception as e:
            current_app.logger.error(f"Error generating recurring instances: {str(e)}")

        return instances