"""
Base schemas for standardized API responses
"""
from typing import Optional, Any, Dict, List
from pydantic import BaseModel, Field
from datetime import datetime

class APIResponse(BaseModel):
    """Base API response schema"""
    success: bool = Field(default=True, description="Whether the request was successful")
    message: Optional[str] = Field(default=None, description="Human-readable message")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    version: str = Field(default="v1", description="API version")

class APIDataResponse(APIResponse):
    """API response with data payload"""
    data: Any = Field(description="Response data payload")

class APIListResponse(APIResponse):
    """API response for paginated lists"""
    data: List[Any] = Field(description="List of items")
    total: int = Field(description="Total number of items")
    page: int = Field(default=1, description="Current page number")
    per_page: int = Field(default=20, description="Items per page")
    pages: int = Field(description="Total number of pages")

class APIErrorResponse(APIResponse):
    """API error response schema"""
    success: bool = Field(default=False)
    error_code: Optional[str] = Field(default=None, description="Machine-readable error code")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional error details")

class ValidationErrorResponse(APIErrorResponse):
    """Validation error response schema"""
    error_code: str = Field(default="VALIDATION_ERROR")
    validation_errors: List[Dict[str, str]] = Field(description="List of validation errors")