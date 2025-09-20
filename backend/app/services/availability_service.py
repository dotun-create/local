from datetime import datetime, date, timedelta
from app.models import Availability, Course, Module
from app import db
from app.services.cache_manager import cache_manager, cached
import pytz
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class AvailabilityService:
    """Service for handling date-specific tutor availability generation"""
    
    @staticmethod
    @cached(ttl=1800, key_prefix="availability")  # Cache for 30 minutes
    def generate_date_specific_availability(tutor_id: str, course_id: str,
                                          start_date: date = None,
                                          end_date: date = None,
                                          timezone: str = 'UTC') -> List[Dict[str, Any]]:
        """
        Generate date-specific availability from tutor's recurring availability patterns
        for a specific course within the given date range.
        
        Args:
            tutor_id: ID of the tutor
            course_id: ID of the course
            start_date: Start date for availability generation (defaults to course module dates)
            end_date: End date for availability generation (defaults to course module dates) 
            timezone: Timezone for date calculations (defaults to course timezone)
            
        Returns:
            List of date-specific availability records
        """
        try:
            course = Course.query.get(course_id)
            if not course:
                return []
                
            # Use course timezone if not specified (fallback to UTC if no timezone field)
            course_timezone = getattr(course, 'timezone', 'UTC')
            if timezone == 'UTC' and course_timezone:
                timezone = course_timezone
                
            # Determine date range from course modules if not provided
            if not start_date or not end_date:
                modules = Module.query.filter_by(course_id=course_id).all()
                if modules:
                    module_start_dates = []
                    module_end_dates = []
                    
                    for m in modules:
                        if m.start_date:
                            if hasattr(m.start_date, 'date'):
                                module_start_dates.append(m.start_date.date())
                            else:
                                module_start_dates.append(m.start_date)
                        if m.end_date:
                            if hasattr(m.end_date, 'date'):
                                module_end_dates.append(m.end_date.date())
                            else:
                                module_end_dates.append(m.end_date)
                    
                    if not start_date and module_start_dates:
                        start_date = min(module_start_dates)
                    if not end_date and module_end_dates:
                        end_date = max(module_end_dates)
            
            # Fallback to reasonable defaults if still no dates
            if not start_date:
                start_date = date.today()
            if not end_date:
                end_date = start_date + timedelta(days=90)  # 3 months default
                
            # Ensure start_date and end_date are date objects, not datetime
            if hasattr(start_date, 'date'):
                start_date = start_date.date()
            if hasattr(end_date, 'date'):
                end_date = end_date.date()
                
            # Get tutor's availability records for this course
            availability_records = Availability.query.filter(
                Availability.tutor_id == tutor_id,
                db.or_(
                    Availability.course_id == course_id,
                    Availability.course_id.is_(None)  # Include general availability
                )
            ).all()
            
            date_specific_slots = []
            
            # Process each availability record
            for record in availability_records:
                if record.specific_date:
                    # Handle specific date instances
                    specific_date = record.specific_date
                    if hasattr(specific_date, 'date'):
                        specific_date = specific_date.date()
                    if start_date <= specific_date <= end_date:
                        date_specific_slots.append({
                            'date': specific_date.isoformat(),
                            'dayOfWeek': AvailabilityService._get_day_name(specific_date.weekday()),
                            'timeSlot': {
                                'id': record.id,
                                'startTime': record.start_time,
                                'endTime': record.end_time,
                                'timezone': record.time_zone or timezone,
                                'available': record.available,
                                'courseId': record.course_id
                            }
                        })
                else:
                    # Handle recurring availability
                    generated_dates = AvailabilityService._generate_recurring_dates(
                        record, start_date, end_date, timezone
                    )
                    date_specific_slots.extend(generated_dates)
            
            # Group by date and sort
            grouped_availability = {}
            for slot in date_specific_slots:
                date_key = slot['date']
                if date_key not in grouped_availability:
                    grouped_availability[date_key] = {
                        'date': slot['date'],
                        'dayOfWeek': slot['dayOfWeek'],
                        'timeSlots': []
                    }
                grouped_availability[date_key]['timeSlots'].append(slot['timeSlot'])
            
            # Convert to list and sort by date
            result = list(grouped_availability.values())
            result.sort(key=lambda x: x['date'])
            
            return result
            
        except Exception as e:
            print(f"Error generating date-specific availability: {str(e)}")
            return []
    
    @staticmethod
    def _generate_recurring_dates(availability_record: Availability, 
                                start_date: date, 
                                end_date: date,
                                timezone: str) -> List[Dict[str, Any]]:
        """Generate specific dates from a recurring availability pattern"""
        generated_slots = []
        
        # Get the day of week for this availability record (0=Monday, 6=Sunday)
        target_day = availability_record.day_of_week
        
        # Normalize start_date and end_date to ensure they are date objects
        if hasattr(start_date, 'date'):
            start_date = start_date.date()
        if hasattr(end_date, 'date'):
            end_date = end_date.date()
        
        # Find first occurrence of target day within range
        current_date = start_date
        while current_date.weekday() != target_day and current_date <= end_date:
            current_date += timedelta(days=1)
        
        # Generate weekly occurrences
        while current_date <= end_date:
            # Check if this date should be skipped (exception dates)
            if (availability_record.exception_dates and 
                current_date.isoformat() in availability_record.exception_dates):
                current_date += timedelta(days=7)
                continue
                
            # Check recurrence end date
            if availability_record.recurrence_end_date:
                recurrence_end = availability_record.recurrence_end_date
                if hasattr(recurrence_end, 'date'):
                    recurrence_end = recurrence_end.date()
                if current_date > recurrence_end:
                    break
                
            generated_slots.append({
                'date': current_date.isoformat(),
                'dayOfWeek': AvailabilityService._get_day_name(current_date.weekday()),
                'timeSlot': {
                    'id': f"{availability_record.id}_{current_date.isoformat()}",
                    'startTime': availability_record.start_time,
                    'endTime': availability_record.end_time,
                    'timezone': availability_record.time_zone or timezone,
                    'available': availability_record.available,
                    'courseId': availability_record.course_id,
                    'parentAvailabilityId': availability_record.id
                }
            })
            
            # Move to next week
            current_date += timedelta(days=7)
        
        return generated_slots
    
    @staticmethod
    def _get_day_name(weekday_index: int) -> str:
        """Convert weekday index to day name"""
        day_names = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        return day_names[weekday_index]
    
    @staticmethod
    @cached(ttl=900, key_prefix="course_availability")  # Cache for 15 minutes
    def get_course_tutor_availability(course_id: str, module_id: str = None, start_date: date = None, end_date: date = None) -> Dict[str, Any]:
        """
        Get all tutors' date-specific availability for a course
        
        Args:
            course_id: Course ID
            module_id: Optional specific module ID to limit date range
            start_date: Optional start date override
            end_date: Optional end date override
            
        Returns:
            Dictionary containing tutors and their date-specific availability
        """
        try:
            course = Course.query.get(course_id)
            if not course:
                return {'tutors': []}
            
            # Determine date range - prioritize provided parameters
            if not start_date or not end_date:
                # If no parameters provided, determine from modules
                if module_id:
                    module = Module.query.get(module_id)
                    if module:
                        if not start_date:
                            start_date = module.start_date
                        if not end_date:
                            end_date = module.end_date
                else:
                    # Use all course modules
                    modules = Module.query.filter_by(course_id=course_id).all()
                    if modules:
                        module_start_dates = [m.start_date for m in modules if m.start_date]
                        module_end_dates = [m.end_date for m in modules if m.end_date]
                        
                        if not start_date and module_start_dates:
                            start_date = min(module_start_dates)
                        if not end_date and module_end_dates:
                            end_date = max(module_end_dates)
            
            print(f"AvailabilityService: Using date range - start: {start_date}, end: {end_date}")
            
            tutors_availability = []
            
            for tutor in course.tutors:
                tutor_availability = AvailabilityService.generate_date_specific_availability(
                    tutor_id=tutor.id,
                    course_id=course_id,
                    start_date=start_date,
                    end_date=end_date,
                    timezone=getattr(course, 'timezone', 'UTC') or 'UTC'
                )
                
                tutor_data = {
                    'id': tutor.id,
                    'name': tutor.profile.get('name', tutor.email),
                    'email': tutor.email,
                    'subjects': tutor.profile.get('subjects', []),
                    'rating': tutor.profile.get('rating'),
                    'totalSessions': tutor.profile.get('totalSessions', 0),
                    'status': 'active' if tutor.is_active else 'inactive',
                    'availability': tutor_availability
                }
                tutors_availability.append(tutor_data)
            
            return {
                'tutors': tutors_availability,
                'courseId': course_id,
                'timezone': getattr(course, 'timezone', 'UTC') or 'UTC',
                'dateRange': {
                    'startDate': start_date.isoformat() if start_date else None,
                    'endDate': end_date.isoformat() if end_date else None
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting course tutor availability: {str(e)}")
            return {
                'tutors': [],
                'dateRange': {
                    'startDate': None,
                    'endDate': None
                }
            }

    @staticmethod
    def invalidate_cache(tutor_id: str = None, course_id: str = None):
        """
        Invalidate cached availability data

        Args:
            tutor_id: Optional tutor ID to invalidate specific tutor cache
            course_id: Optional course ID to invalidate specific course cache
        """
        try:
            if tutor_id and course_id:
                # Invalidate specific tutor-course combination
                cache_manager.clear_pattern(f"availability:*{tutor_id}*{course_id}*")
                cache_manager.clear_pattern(f"course_availability:*{course_id}*")
            elif tutor_id:
                # Invalidate all availability for a tutor
                cache_manager.clear_pattern(f"availability:*{tutor_id}*")
                # Also invalidate course availability that might include this tutor
                cache_manager.clear_pattern("course_availability:*")
            elif course_id:
                # Invalidate all availability for a course
                cache_manager.clear_pattern(f"*{course_id}*")
            else:
                # Invalidate all availability cache
                cache_manager.clear_pattern("availability:*")
                cache_manager.clear_pattern("course_availability:*")

            logger.info(f"Invalidated availability cache for tutor_id={tutor_id}, course_id={course_id}")

        except Exception as e:
            logger.error(f"Error invalidating availability cache: {str(e)}")

    @staticmethod
    def warm_cache(course_id: str, days_ahead: int = 30):
        """
        Pre-warm cache with availability data for a course

        Args:
            course_id: Course ID to warm cache for
            days_ahead: Number of days ahead to cache (default 30)
        """
        try:
            start_date = date.today()
            end_date = start_date + timedelta(days=days_ahead)

            logger.info(f"Warming availability cache for course {course_id}")

            # Pre-load course tutor availability
            AvailabilityService.get_course_tutor_availability(
                course_id=course_id,
                start_date=start_date,
                end_date=end_date
            )

            logger.info(f"Cache warmed for course {course_id}")

        except Exception as e:
            logger.error(f"Error warming availability cache: {str(e)}")

    @staticmethod
    def get_cache_stats() -> Dict[str, Any]:
        """
        Get availability cache statistics

        Returns:
            Dictionary with cache statistics
        """
        try:
            return cache_manager.get_stats()
        except Exception as e:
            logger.error(f"Error getting cache stats: {str(e)}")
            return {}