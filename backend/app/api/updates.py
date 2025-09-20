"""
Updates API for WebSocket fallback polling

This module provides REST endpoints for checking updates when WebSocket connection fails.
It serves as a fallback mechanism for the hybrid refresh strategy.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('updates', __name__)

# In-memory storage for pending updates (in production, use Redis or database)
pending_updates: Dict[str, List[Dict[str, Any]]] = {}

@bp.route('/updates/check', methods=['GET'])
@jwt_required()
def check_updates():
    """
    Check for pending updates for the current user.
    
    This endpoint is used as a fallback when WebSocket connection fails.
    It returns any pending updates that need to be processed by the client.
    
    Returns:
        JSON array of pending updates or empty array if none
    """
    try:
        user_id = get_jwt_identity()
        
        # Get any pending updates for this user
        user_updates = pending_updates.get(user_id, [])
        
        # Also get any global updates (for all users)
        global_updates = pending_updates.get('*', [])
        
        # Combine and filter updates by timestamp (only recent ones)
        all_updates = user_updates + global_updates
        
        # Filter to only include updates from last 5 minutes
        cutoff_time = datetime.utcnow() - timedelta(minutes=5)
        recent_updates = [
            update for update in all_updates
            if datetime.fromisoformat(update.get('timestamp', '2000-01-01T00:00:00')) > cutoff_time
        ]
        
        # Clear processed updates for this user
        if user_id in pending_updates:
            pending_updates[user_id] = []
        
        # Log the check
        if recent_updates:
            logger.info(f"Updates found for user {user_id}: {len(recent_updates)} updates")
        
        return jsonify(recent_updates), 200
        
    except Exception as e:
        logger.error(f"Error checking updates: {str(e)}")
        return jsonify([]), 200  # Return empty array on error to not break the client

def queue_update(update_data: Dict[str, Any], user_id: str = '*'):
    """
    Queue an update for delivery via polling.
    
    This is called by other parts of the application when WebSocket 
    delivery fails or as a backup mechanism.
    
    Args:
        update_data: The update payload including category, data, affected_entities
        user_id: Target user ID or '*' for all users
    """
    try:
        # Add timestamp if not present
        if 'timestamp' not in update_data:
            update_data['timestamp'] = datetime.utcnow().isoformat()
        
        # Initialize user's update list if needed
        if user_id not in pending_updates:
            pending_updates[user_id] = []
        
        # Add the update
        pending_updates[user_id].append(update_data)
        
        # Keep only last 100 updates per user to prevent memory issues
        if len(pending_updates[user_id]) > 100:
            pending_updates[user_id] = pending_updates[user_id][-100:]
        
        logger.info(f"Update queued for user {user_id}: {update_data.get('category', 'unknown')}")
        
    except Exception as e:
        logger.error(f"Error queuing update: {str(e)}")

def broadcast_admin_update(category: str, data: Dict[str, Any], affected_entities: List[Dict] = None, priority: str = 'IMPORTANT'):
    """
    Broadcast an admin update to all users via polling fallback.
    
    This is typically called when an admin makes changes that affect multiple users.
    
    Args:
        category: Type of update (PAYMENT, ENROLLMENT, etc.)
        data: Update payload
        affected_entities: List of affected entities (courses, users, etc.)
        priority: Update priority level
    """
    update_payload = {
        'category': category,
        'data': data,
        'affected_entities': affected_entities or [],
        'priority': priority,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # Queue for all users
    queue_update(update_payload, '*')
    
    logger.info(f"Admin update broadcast: {category} with priority {priority}")