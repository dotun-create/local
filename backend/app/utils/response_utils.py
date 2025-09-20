"""
Utility functions for standardized API responses
"""
from typing import Any, Dict, List, Optional
from flask import jsonify
from datetime import datetime
from app.schemas.base_schemas import (
    APIResponse, APIDataResponse, APIListResponse,
    APIErrorResponse, ValidationErrorResponse
)

def create_success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200
):
    """Create a standardized success response"""
    if data is None:
        response_data = APIResponse(
            success=True,
            message=message,
            timestamp=datetime.utcnow(),
            version="v1"
        )
    else:
        response_data = APIDataResponse(
            success=True,
            message=message,
            timestamp=datetime.utcnow(),
            version="v1",
            data=data
        )

    return jsonify(response_data.dict()), status_code

def create_list_response(
    data: List[Any],
    total: int,
    page: int = 1,
    per_page: int = 20,
    message: str = "Data retrieved successfully",
    status_code: int = 200
):
    """Create a standardized list response with pagination"""
    pages = (total + per_page - 1) // per_page if per_page > 0 else 1

    response_data = APIListResponse(
        success=True,
        message=message,
        timestamp=datetime.utcnow(),
        version="v1",
        data=data,
        total=total,
        page=page,
        per_page=per_page,
        pages=pages
    )

    return jsonify(response_data.dict()), status_code

def create_error_response(
    message: str,
    error_code: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    status_code: int = 400
):
    """Create a standardized error response"""
    response_data = APIErrorResponse(
        success=False,
        message=message,
        timestamp=datetime.utcnow(),
        version="v1",
        error_code=error_code,
        details=details
    )

    return jsonify(response_data.dict()), status_code

def create_validation_error_response(
    validation_errors: List[Dict[str, str]],
    message: str = "Validation failed",
    status_code: int = 422
):
    """Create a standardized validation error response"""
    response_data = ValidationErrorResponse(
        success=False,
        message=message,
        timestamp=datetime.utcnow(),
        version="v1",
        error_code="VALIDATION_ERROR",
        validation_errors=validation_errors
    )

    return jsonify(response_data.dict()), status_code

def create_not_found_response(resource: str = "Resource"):
    """Create a standardized 404 response"""
    return create_error_response(
        message=f"{resource} not found",
        error_code="NOT_FOUND",
        status_code=404
    )

def create_unauthorized_response():
    """Create a standardized 401 response"""
    return create_error_response(
        message="Unauthorized access",
        error_code="UNAUTHORIZED",
        status_code=401
    )

def create_forbidden_response():
    """Create a standardized 403 response"""
    return create_error_response(
        message="Access forbidden",
        error_code="FORBIDDEN",
        status_code=403
    )

def create_conflict_response(message: str, conflicts: List[Dict[str, Any]] = None):
    """Create a standardized conflict response"""
    details = {"conflicts": conflicts} if conflicts else None
    return create_error_response(
        message=message,
        error_code="CONFLICT",
        details=details,
        status_code=409
    )

def handle_exception_response(e: Exception, status_code: int = 500):
    """Handle unexpected exceptions with standardized response"""
    return create_error_response(
        message="An unexpected error occurred",
        error_code="INTERNAL_ERROR",
        details={"exception": str(e)},
        status_code=status_code
    )