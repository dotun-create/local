"""
Session API response schemas
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from .base_schemas import APIDataResponse, APIListResponse

class SessionParticipantSchema(BaseModel):
    """Session participant schema"""
    id: str = Field(description="User ID")
    email: str = Field(description="User email")
    name: Optional[str] = Field(default=None, description="User name")
    role: str = Field(description="Participant role (student, tutor)")

class SessionSchema(BaseModel):
    """Session schema"""
    id: str = Field(description="Session ID")
    title: str = Field(description="Session title")
    description: Optional[str] = Field(default=None, description="Session description")
    scheduled_date: datetime = Field(description="Scheduled date and time")
    duration: int = Field(description="Duration in minutes")
    status: str = Field(description="Session status")
    tutor_id: str = Field(description="Tutor ID")
    tutor_name: Optional[str] = Field(default=None, description="Tutor name")
    course_id: Optional[str] = Field(default=None, description="Course ID")
    module_id: Optional[str] = Field(default=None, description="Module ID")
    lesson_id: Optional[str] = Field(default=None, description="Lesson ID")
    max_students: int = Field(default=3, description="Maximum number of students")
    price: float = Field(default=0.0, description="Session price")
    meeting_link: Optional[str] = Field(default=None, description="Meeting link")
    timezone: str = Field(default="UTC", description="Session timezone")
    participants: List[SessionParticipantSchema] = Field(default=[], description="Session participants")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")

class SessionStatsSchema(BaseModel):
    """Session statistics schema"""
    total_sessions: int = Field(description="Total number of sessions")
    scheduled: int = Field(description="Number of scheduled sessions")
    in_progress: int = Field(description="Number of sessions in progress")
    completed: int = Field(description="Number of completed sessions")
    cancelled: int = Field(description="Number of cancelled sessions")
    no_show: int = Field(description="Number of no-show sessions")

class SessionCreateRequest(BaseModel):
    """Request schema for creating a session"""
    title: str = Field(description="Session title")
    description: Optional[str] = Field(default=None, description="Session description")
    scheduled_date: str = Field(description="Scheduled date and time (ISO format)")
    duration: int = Field(default=60, description="Duration in minutes")
    tutor_id: str = Field(description="Tutor ID")
    course_id: Optional[str] = Field(default=None, description="Course ID")
    module_id: Optional[str] = Field(default=None, description="Module ID")
    lesson_id: Optional[str] = Field(default=None, description="Lesson ID")
    max_students: int = Field(default=3, description="Maximum number of students")
    price: float = Field(default=0.0, description="Session price")
    timezone: str = Field(default="UTC", description="Session timezone")
    availability_id: Optional[str] = Field(default=None, description="Associated availability slot ID")

class SessionUpdateRequest(BaseModel):
    """Request schema for updating a session"""
    title: Optional[str] = Field(default=None, description="Session title")
    description: Optional[str] = Field(default=None, description="Session description")
    scheduled_date: Optional[str] = Field(default=None, description="Scheduled date and time (ISO format)")
    duration: Optional[int] = Field(default=None, description="Duration in minutes")
    status: Optional[str] = Field(default=None, description="Session status")
    max_students: Optional[int] = Field(default=None, description="Maximum number of students")
    price: Optional[float] = Field(default=None, description="Session price")

class BulkSessionCreateRequest(BaseModel):
    """Request schema for creating multiple sessions"""
    sessions: List[SessionCreateRequest] = Field(description="List of sessions to create")
    validate_conflicts: bool = Field(default=True, description="Whether to validate conflicts")

class SessionConflictSchema(BaseModel):
    """Session conflict schema"""
    session_data: Dict[str, Any] = Field(description="Conflicting session data")
    conflict_type: str = Field(description="Type of conflict (tutor_conflict, time_overlap, etc.)")
    conflict_details: str = Field(description="Human-readable conflict description")
    conflicting_session_id: Optional[str] = Field(default=None, description="ID of conflicting session")

class SessionResponse(APIDataResponse):
    """Single session response"""
    data: SessionSchema = Field(description="Session data")

class SessionListResponse(APIListResponse):
    """List of sessions response"""
    data: List[SessionSchema] = Field(description="List of sessions")

class SessionStatsResponse(APIDataResponse):
    """Session statistics response"""
    data: SessionStatsSchema = Field(description="Session statistics")

class BulkSessionResponse(APIDataResponse):
    """Bulk session creation response"""
    data: Dict[str, Any] = Field(description="Bulk operation results")

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "message": "Bulk session creation completed",
                "timestamp": "2024-01-01T12:00:00Z",
                "version": "v1",
                "data": {
                    "created_sessions": [],
                    "conflicts": [],
                    "created_count": 0,
                    "conflict_count": 0
                }
            }
        }