from datetime import datetime, timedelta
from sqlalchemy import and_, func
from app import db
from app.models import (
    User, Session, Availability, SystemSettings, 
    TutorEarning, Enrollment
)
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

class EarningsService:
    """Service for calculating tutor earnings and statistics"""
    
    @staticmethod
    def get_hourly_rate():
        """Get the current hourly rate from system settings"""
        return SystemSettings.get_setting('hourly_rate_gbp', 21.0)
    
    @staticmethod
    def get_potential_weekly_earnings(tutor_id):
        """Calculate potential weekly earnings based on availability"""
        try:
            # Get tutor's availability for the current week
            today = datetime.utcnow().date()
            start_of_week = today - timedelta(days=today.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            
            # Get all availability slots for the week
            availabilities = Availability.query.filter(
                and_(
                    Availability.tutor_id == tutor_id,
                    Availability.date >= start_of_week,
                    Availability.date <= end_of_week,
                    Availability.is_available == True
                )
            ).all()
            
            # Calculate total available hours
            total_hours = 0
            hourly_rate = EarningsService.get_hourly_rate()
            
            for availability in availabilities:
                if availability.start_time and availability.end_time:
                    # Convert time to hours
                    start_hour = availability.start_time.hour + availability.start_time.minute / 60
                    end_hour = availability.end_time.hour + availability.end_time.minute / 60
                    hours_in_slot = end_hour - start_hour
                    total_hours += hours_in_slot
            
            potential_earnings = total_hours * hourly_rate
            
            return {
                'totalHours': total_hours,
                'hourlyRate': hourly_rate,
                'potentialEarnings': potential_earnings,
                'weekStart': start_of_week.isoformat(),
                'weekEnd': end_of_week.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error calculating potential weekly earnings for tutor {tutor_id}: {str(e)}")
            return {
                'totalHours': 0,
                'hourlyRate': EarningsService.get_hourly_rate(),
                'potentialEarnings': 0,
                'weekStart': None,
                'weekEnd': None
            }
    
    @staticmethod
    def get_actual_weekly_earnings(tutor_id):
        """Calculate actual weekly earnings based on completed sessions"""
        try:
            today = datetime.utcnow().date()
            start_of_week = today - timedelta(days=today.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            
            # Get completed sessions for the week
            completed_sessions = Session.query.filter(
                and_(
                    Session.tutor_id == tutor_id,
                    Session.date >= start_of_week,
                    Session.date <= end_of_week,
                    Session.status == 'completed'
                )
            ).all()
            
            total_hours = 0
            total_sessions = len(completed_sessions)
            hourly_rate = EarningsService.get_hourly_rate()
            
            for session in completed_sessions:
                if session.start_time and session.end_time:
                    # Calculate session duration
                    start_hour = session.start_time.hour + session.start_time.minute / 60
                    end_hour = session.end_time.hour + session.end_time.minute / 60
                    session_hours = end_hour - start_hour
                    total_hours += session_hours
            
            actual_earnings = total_hours * hourly_rate
            
            return {
                'totalHours': total_hours,
                'totalSessions': total_sessions,
                'hourlyRate': hourly_rate,
                'actualEarnings': actual_earnings,
                'weekStart': start_of_week.isoformat(),
                'weekEnd': end_of_week.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error calculating actual weekly earnings for tutor {tutor_id}: {str(e)}")
            return {
                'totalHours': 0,
                'totalSessions': 0,
                'hourlyRate': EarningsService.get_hourly_rate(),
                'actualEarnings': 0,
                'weekStart': None,
                'weekEnd': None
            }
    
    @staticmethod
    def get_monthly_earnings(tutor_id):
        """Calculate monthly earnings based on completed sessions"""
        try:
            today = datetime.utcnow().date()
            start_of_month = today.replace(day=1)
            
            # Calculate end of month
            if today.month == 12:
                end_of_month = today.replace(year=today.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                end_of_month = today.replace(month=today.month + 1, day=1) - timedelta(days=1)
            
            # Get completed sessions for the month
            completed_sessions = Session.query.filter(
                and_(
                    Session.tutor_id == tutor_id,
                    Session.date >= start_of_month,
                    Session.date <= end_of_month,
                    Session.status == 'completed'
                )
            ).all()
            
            total_hours = 0
            total_sessions = len(completed_sessions)
            hourly_rate = EarningsService.get_hourly_rate()
            
            for session in completed_sessions:
                if session.start_time and session.end_time:
                    start_hour = session.start_time.hour + session.start_time.minute / 60
                    end_hour = session.end_time.hour + session.end_time.minute / 60
                    session_hours = end_hour - start_hour
                    total_hours += session_hours
            
            monthly_earnings = total_hours * hourly_rate
            
            return {
                'totalHours': total_hours,
                'totalSessions': total_sessions,
                'hourlyRate': hourly_rate,
                'monthlyEarnings': monthly_earnings,
                'monthStart': start_of_month.isoformat(),
                'monthEnd': end_of_month.isoformat(),
                'monthName': start_of_month.strftime('%B %Y')
            }
            
        except Exception as e:
            logger.error(f"Error calculating monthly earnings for tutor {tutor_id}: {str(e)}")
            return {
                'totalHours': 0,
                'totalSessions': 0,
                'hourlyRate': EarningsService.get_hourly_rate(),
                'monthlyEarnings': 0,
                'monthStart': None,
                'monthEnd': None,
                'monthName': 'Unknown'
            }
    
    @staticmethod
    def get_total_earnings(tutor_id):
        """Calculate total lifetime earnings for a tutor"""
        try:
            # Get all completed sessions for the tutor
            completed_sessions = Session.query.filter(
                and_(
                    Session.tutor_id == tutor_id,
                    Session.status == 'completed'
                )
            ).all()
            
            total_hours = 0
            total_sessions = len(completed_sessions)
            hourly_rate = EarningsService.get_hourly_rate()
            
            for session in completed_sessions:
                if session.start_time and session.end_time:
                    start_hour = session.start_time.hour + session.start_time.minute / 60
                    end_hour = session.end_time.hour + session.end_time.minute / 60
                    session_hours = end_hour - start_hour
                    total_hours += session_hours
            
            total_earnings = total_hours * hourly_rate
            
            # Get first session date for experience calculation
            first_session = Session.query.filter(
                and_(
                    Session.tutor_id == tutor_id,
                    Session.status == 'completed'
                )
            ).order_by(Session.date.asc()).first()
            
            teaching_since = first_session.date if first_session else None
            
            return {
                'totalHours': total_hours,
                'totalSessions': total_sessions,
                'hourlyRate': hourly_rate,
                'totalEarnings': total_earnings,
                'teachingSince': teaching_since.isoformat() if teaching_since else None
            }
            
        except Exception as e:
            logger.error(f"Error calculating total earnings for tutor {tutor_id}: {str(e)}")
            return {
                'totalHours': 0,
                'totalSessions': 0,
                'hourlyRate': EarningsService.get_hourly_rate(),
                'totalEarnings': 0,
                'teachingSince': None
            }
    
    @staticmethod
    def get_upcoming_sessions_this_week(tutor_id):
        """Get upcoming sessions for the current week"""
        try:
            today = datetime.utcnow().date()
            start_of_week = today - timedelta(days=today.weekday())
            end_of_week = start_of_week + timedelta(days=6)
            
            # Get sessions scheduled for this week
            upcoming_sessions = Session.query.filter(
                and_(
                    Session.tutor_id == tutor_id,
                    Session.date >= today,  # From today onwards
                    Session.date <= end_of_week,
                    Session.status.in_(['scheduled', 'confirmed'])
                )
            ).order_by(Session.date.asc(), Session.start_time.asc()).all()
            
            sessions_data = []
            for session in upcoming_sessions:
                # Get enrolled students
                enrolled_students = session.students
                
                sessions_data.append({
                    'id': session.id,
                    'title': session.title,
                    'date': session.date.isoformat(),
                    'startTime': session.start_time.strftime('%H:%M') if session.start_time else None,
                    'endTime': session.end_time.strftime('%H:%M') if session.end_time else None,
                    'enrolledStudents': len(enrolled_students),
                    'maxStudents': session.max_students,
                    'status': session.status,
                    'courseTitle': session.course.title if session.course else 'Independent Session'
                })
            
            return {
                'upcomingSessions': sessions_data,
                'totalSessions': len(sessions_data),
                'weekStart': start_of_week.isoformat(),
                'weekEnd': end_of_week.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting upcoming sessions for tutor {tutor_id}: {str(e)}")
            return {
                'upcomingSessions': [],
                'totalSessions': 0,
                'weekStart': None,
                'weekEnd': None
            }
    
    @staticmethod
    def get_comprehensive_earnings_data(tutor_id):
        """Get all earnings data for a tutor in one call"""
        try:
            potential_weekly = EarningsService.get_potential_weekly_earnings(tutor_id)
            actual_weekly = EarningsService.get_actual_weekly_earnings(tutor_id)
            monthly = EarningsService.get_monthly_earnings(tutor_id)
            total = EarningsService.get_total_earnings(tutor_id)
            upcoming = EarningsService.get_upcoming_sessions_this_week(tutor_id)
            
            # Calculate efficiency rate (actual vs potential)
            efficiency_rate = 0
            if potential_weekly['potentialEarnings'] > 0:
                efficiency_rate = (actual_weekly['actualEarnings'] / potential_weekly['potentialEarnings']) * 100
            
            return {
                'tutorId': tutor_id,
                'hourlyRate': EarningsService.get_hourly_rate(),
                'currency': SystemSettings.get_setting('platform_currency', 'GBP'),
                'potentialWeekly': potential_weekly,
                'actualWeekly': actual_weekly,
                'monthly': monthly,
                'total': total,
                'upcoming': upcoming,
                'efficiency': {
                    'rate': round(efficiency_rate, 2),
                    'description': f"{efficiency_rate:.1f}% of potential earnings achieved"
                },
                'lastUpdated': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting comprehensive earnings data for tutor {tutor_id}: {str(e)}")
            raise e