"""
Availability API response schemas
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, date, time
from .base_schemas import APIDataResponse, APIListResponse

class TimeSlotSchema(BaseModel):
    """Time slot schema"""
    id: str = Field(description="Unique time slot identifier")
    start_time: str = Field(description="Start time in HH:MM format")
    end_time: str = Field(description="End time in HH:MM format")
    timezone: str = Field(description="Timezone identifier")
    available: bool = Field(description="Whether the slot is available")
    course_id: Optional[str] = Field(default=None, description="Associated course ID")
    parent_availability_id: Optional[str] = Field(default=None, description="Parent recurring availability ID")

class DateAvailabilitySchema(BaseModel):
    """Date-specific availability schema"""
    date: str = Field(description="Date in YYYY-MM-DD format")
    day_of_week: str = Field(description="Day of week name")
    time_slots: List[TimeSlotSchema] = Field(description="Available time slots for this date")

class TutorAvailabilitySchema(BaseModel):
    """Tutor availability schema"""
    id: str = Field(description="Tutor ID")
    name: str = Field(description="Tutor name")
    email: str = Field(description="Tutor email")
    subjects: List[str] = Field(default=[], description="Tutor subjects")
    rating: Optional[float] = Field(default=None, description="Tutor rating")
    total_sessions: int = Field(default=0, description="Total sessions conducted")
    status: str = Field(description="Tutor status")
    availability: List[DateAvailabilitySchema] = Field(description="Date-specific availability")

class AvailabilityRecordSchema(BaseModel):
    """Individual availability record schema"""
    id: str = Field(description="Availability record ID")
    tutor_id: str = Field(description="Tutor ID")
    course_id: Optional[str] = Field(default=None, description="Course ID")
    day_of_week: Optional[int] = Field(default=None, description="Day of week (0=Monday)")
    specific_date: Optional[str] = Field(default=None, description="Specific date if not recurring")
    start_time: str = Field(description="Start time")
    end_time: str = Field(description="End time")
    timezone: str = Field(description="Timezone")
    available: bool = Field(description="Availability status")
    exception_dates: Optional[List[str]] = Field(default=None, description="Exception dates for recurring")
    recurrence_end_date: Optional[str] = Field(default=None, description="End date for recurring pattern")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")

class CourseAvailabilityResponse(APIDataResponse):
    """Course tutor availability response"""
    data: Dict[str, Any] = Field(description="Availability data")

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "message": "Tutors availability retrieved successfully",
                "timestamp": "2024-01-01T12:00:00Z",
                "version": "v1",
                "data": {
                    "tutors": [],
                    "course_id": "course_123",
                    "timezone": "UTC",
                    "date_range": {
                        "start_date": "2024-01-01",
                        "end_date": "2024-01-31"
                    }
                }
            }
        }

class TutorAvailabilityResponse(APIDataResponse):
    """Single tutor availability response"""
    data: List[DateAvailabilitySchema] = Field(description="Tutor's date-specific availability")

class AvailabilityListResponse(APIListResponse):
    """List of availability records response"""
    data: List[AvailabilityRecordSchema] = Field(description="List of availability records")

class AvailabilityCreateRequest(BaseModel):
    """Request schema for creating availability"""
    tutor_id: str = Field(description="Tutor ID")
    course_id: Optional[str] = Field(default=None, description="Course ID")
    day_of_week: Optional[int] = Field(default=None, description="Day of week (0=Monday)")
    specific_date: Optional[str] = Field(default=None, description="Specific date if not recurring")
    start_time: str = Field(description="Start time in HH:MM format")
    end_time: str = Field(description="End time in HH:MM format")
    timezone: str = Field(default="UTC", description="Timezone")
    available: bool = Field(default=True, description="Availability status")
    recurrence_end_date: Optional[str] = Field(default=None, description="End date for recurring pattern")

class AvailabilityUpdateRequest(BaseModel):
    """Request schema for updating availability"""
    start_time: Optional[str] = Field(default=None, description="Start time in HH:MM format")
    end_time: Optional[str] = Field(default=None, description="End time in HH:MM format")
    timezone: Optional[str] = Field(default=None, description="Timezone")
    available: Optional[bool] = Field(default=None, description="Availability status")
    exception_dates: Optional[List[str]] = Field(default=None, description="Exception dates for recurring")
    recurrence_end_date: Optional[str] = Field(default=None, description="End date for recurring pattern")