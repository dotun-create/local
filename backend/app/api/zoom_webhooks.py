"""
Zoom Webhook Integration
Handles real-time events from Zoom to update session status and data
"""

from flask import request, jsonify, current_app
from app.api import api_bp
from app import db
from app.models import Session
from app.services.session_processor import session_processor
from app.services.admin_notification_service import admin_notification_service
import hashlib
import hmac
import json
import logging
from datetime import datetime
import os
import requests

logger = logging.getLogger(__name__)

def verify_webhook_signature(payload, signature):
    """
    Verify Zoom webhook signature for security
    """
    webhook_secret = os.environ.get('ZOOM_WEBHOOK_SECRET_TOKEN')
    if not webhook_secret:
        logger.warning("ZOOM_WEBHOOK_SECRET_TOKEN not configured")
        return False
    
    # Zoom sends signature as 'v0=' + hex(hmac_sha256(webhook_secret, payload))
    if not signature.startswith('v0='):
        return False
    
    expected_signature = hmac.new(
        webhook_secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    received_signature = signature[3:]  # Remove 'v0=' prefix
    
    return hmac.compare_digest(expected_signature, received_signature)

def find_session_by_meeting(meeting_id, meeting_uuid=None):
    """
    Find session by Zoom meeting ID or UUID
    """
    if meeting_uuid:
        session = Session.query.filter_by(meeting_uuid=meeting_uuid).first()
        if session:
            return session
    
    return Session.query.filter_by(meeting_id=str(meeting_id)).first()

@api_bp.route('/zoom/webhook', methods=['POST'])
def zoom_webhook():
    """
    Handle Zoom webhook events for session management
    
    Supported events:
    - meeting.started: Update session status to 'in_progress'
    - meeting.ended: Update session with completion data
    - meeting.participant_joined: Track participant attendance
    - meeting.participant_left: Update participant tracking
    - recording.completed: Process recording and transcripts
    """
    try:
        # Get raw payload for signature verification
        payload = request.get_data()
        signature = request.headers.get('authorization')
        
        # Verify webhook signature if secret is configured
        if os.environ.get('ZOOM_WEBHOOK_SECRET_TOKEN'):
            if not signature:
                logger.warning("Missing webhook signature")
                return jsonify({'error': 'Missing signature'}), 401
                
            if not verify_webhook_signature(payload, signature):
                logger.warning("Invalid webhook signature")
                return jsonify({'error': 'Invalid signature'}), 401
        else:
            logger.warning("Webhook secret not configured - accepting unverified webhook")
        
        # Parse JSON payload
        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            logger.error("Invalid JSON payload")
            return jsonify({'error': 'Invalid JSON'}), 400
        
        # Extract event information
        event_type = data.get('event')
        if not event_type:
            logger.error("Missing event type in webhook")
            return jsonify({'error': 'Missing event type'}), 400
        
        logger.info(f"Received Zoom webhook: {event_type}")
        
        # Route to appropriate handler
        if event_type == 'meeting.started':
            return handle_meeting_started(data)
        elif event_type == 'meeting.ended':
            return handle_meeting_ended(data)
        elif event_type == 'meeting.participant_joined':
            return handle_participant_joined(data)
        elif event_type == 'meeting.participant_left':
            return handle_participant_left(data)
        elif event_type == 'recording.completed':
            return handle_recording_completed(data)
        elif event_type == 'endpoint.url_validation':
            # Zoom webhook validation challenge
            return handle_url_validation(data)
        else:
            logger.info(f"Unhandled webhook event: {event_type}")
            return jsonify({'message': 'Event received but not processed'}), 200
            
    except Exception as e:
        logger.error(f"Error processing Zoom webhook: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def handle_url_validation(data):
    """
    Handle Zoom webhook URL validation challenge
    """
    challenge = data.get('payload', {}).get('plainToken')
    if challenge:
        logger.info("Responding to Zoom webhook validation challenge")
        return jsonify({
            'plainToken': challenge,
            'encryptedToken': hashlib.sha256(
                (challenge + os.environ.get('ZOOM_WEBHOOK_SECRET_TOKEN', '')).encode()
            ).hexdigest()
        }), 200
    
    return jsonify({'error': 'Invalid validation request'}), 400

def handle_meeting_started(data):
    """
    Handle meeting.started event
    """
    try:
        payload = data.get('payload', {})
        object_data = payload.get('object', {})
        
        meeting_id = object_data.get('id')
        meeting_uuid = object_data.get('uuid')
        start_time = object_data.get('start_time')
        
        # Find corresponding session
        session = find_session_by_meeting(meeting_id, meeting_uuid)
        if not session:
            logger.warning(f"No session found for meeting ID: {meeting_id}, UUID: {meeting_uuid}")
            return jsonify({'message': 'Session not found'}), 404
        
        # Update session status
        session.status = 'in_progress'
        if start_time:
            # Convert Zoom timestamp to datetime if needed
            session.scheduled_date = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        
        db.session.commit()
        
        logger.info(f"Session {session.id} marked as in_progress (meeting started)")
        
        return jsonify({'message': 'Meeting started event processed'}), 200
        
    except Exception as e:
        logger.error(f"Error handling meeting.started: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to process meeting started event'}), 500

def handle_meeting_ended(data):
    """
    Handle meeting.ended event
    """
    try:
        payload = data.get('payload', {})
        object_data = payload.get('object', {})
        
        meeting_id = object_data.get('id')
        meeting_uuid = object_data.get('uuid')
        duration = object_data.get('duration', 0)  # in minutes
        start_time = object_data.get('start_time')
        end_time = object_data.get('end_time')
        
        # Find corresponding session
        session = find_session_by_meeting(meeting_id, meeting_uuid)
        if not session:
            logger.warning(f"No session found for meeting ID: {meeting_id}, UUID: {meeting_uuid}")
            return jsonify({'message': 'Session not found'}), 404
        
        # Update session with meeting completion data
        session.status = 'completed'
        session.zoom_meeting_duration = duration
        
        # Store meeting UUID for future reference
        if meeting_uuid and not session.meeting_uuid:
            session.meeting_uuid = meeting_uuid
        
        # Calculate participant count if participant data is available
        participants = object_data.get('participant', [])
        if participants:
            session.zoom_participants_count = len(participants)
            # Create a summary of participants
            participant_names = [p.get('user_name', 'Unknown') for p in participants[:5]]
            if len(participants) > 5:
                session.participants_summary = f"{', '.join(participant_names)} and {len(participants) - 5} others"
            else:
                session.participants_summary = ', '.join(participant_names)
        
        db.session.commit()
        
        logger.info(f"Session {session.id} marked as completed (meeting ended, duration: {duration} minutes)")
        
        # Trigger AI session processing if enabled
        if session_processor and hasattr(session_processor, 'process_completed_session'):
            try:
                # Prepare meeting data for AI processing
                meeting_data = {
                    'id': meeting_id,
                    'uuid': meeting_uuid,
                    'duration': duration,
                    'start_time': start_time,
                    'end_time': end_time,
                    'participants': participants,
                    'participants_count': len(participants) if participants else 0
                }
                
                # Process session asynchronously if possible
                session_processor.process_completed_session(session, meeting_data)
                logger.info(f"Triggered AI processing for session {session.id}")
                
            except Exception as ai_error:
                logger.error(f"Failed to trigger AI processing for session {session.id}: {str(ai_error)}")
                # Don't fail the webhook if AI processing fails
        
        return jsonify({'message': 'Meeting ended event processed'}), 200
        
    except Exception as e:
        logger.error(f"Error handling meeting.ended: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to process meeting ended event'}), 500

def handle_participant_joined(data):
    """
    Handle meeting.participant_joined event
    """
    try:
        payload = data.get('payload', {})
        object_data = payload.get('object', {})
        participant_data = object_data.get('participant', {})
        
        meeting_id = object_data.get('id')
        meeting_uuid = object_data.get('uuid')
        participant_name = participant_data.get('user_name', 'Unknown')
        participant_email = participant_data.get('email', '')
        join_time = participant_data.get('join_time')
        
        # Find corresponding session
        session = find_session_by_meeting(meeting_id, meeting_uuid)
        if not session:
            logger.warning(f"No session found for meeting ID: {meeting_id}, UUID: {meeting_uuid}")
            return jsonify({'message': 'Session not found'}), 404
        
        logger.info(f"Participant {participant_name} ({participant_email}) joined session {session.id}")
        
        # Note: You could store detailed participant tracking in a separate table here
        # For now, we'll update the participant count when the meeting ends
        
        return jsonify({'message': 'Participant joined event processed'}), 200
        
    except Exception as e:
        logger.error(f"Error handling participant_joined: {str(e)}")
        return jsonify({'error': 'Failed to process participant joined event'}), 500

def handle_participant_left(data):
    """
    Handle meeting.participant_left event
    """
    try:
        payload = data.get('payload', {})
        object_data = payload.get('object', {})
        participant_data = object_data.get('participant', {})
        
        meeting_id = object_data.get('id')
        participant_name = participant_data.get('user_name', 'Unknown')
        leave_time = participant_data.get('leave_time')
        duration = participant_data.get('duration', 0)  # in seconds
        
        # Find corresponding session
        session = find_session_by_meeting(meeting_id)
        if session:
            logger.info(f"Participant {participant_name} left session {session.id} (duration: {duration}s)")
        
        return jsonify({'message': 'Participant left event processed'}), 200
        
    except Exception as e:
        logger.error(f"Error handling participant_left: {str(e)}")
        return jsonify({'error': 'Failed to process participant left event'}), 500

def handle_recording_completed(data):
    """
    Handle recording.completed event - sets session to ready_for_analysis
    """
    try:
        payload = data.get('payload', {})
        object_data = payload.get('object', {})
        
        meeting_id = object_data.get('id')
        meeting_uuid = object_data.get('uuid')
        recording_files = object_data.get('recording_files', [])
        
        # Find corresponding session
        session = find_session_by_meeting(meeting_id, meeting_uuid)
        if not session:
            logger.warning(f"No session found for meeting ID: {meeting_id}, UUID: {meeting_uuid}")
            return jsonify({'message': 'Session not found'}), 404
        
        logger.info(f"Recording completed for session {session.id}, {len(recording_files)} files available")
        
        # Check if we have any transcript files
        transcript_files = [f for f in recording_files if f.get('file_type', '').lower() == 'vtt']
        video_files = [f for f in recording_files if f.get('file_type', '').lower() == 'mp4']
        
        if not recording_files:
            # No recording files available - notify admin and keep status as completed
            logger.warning(f"No recording files available for session {session.id}")
            admin_notification_service.notify_no_recordings_available(session)
            return jsonify({'message': 'No recording files available'}), 200
        
        if not transcript_files:
            # Recording available but no transcript - notify admin
            logger.warning(f"No transcript files available for session {session.id}")
            admin_notification_service.notify_no_transcript_available(
                session, 
                "Recording completed but no transcript files were generated by Zoom"
            )
            # Keep status as completed since we can't do AI analysis without transcript
            return jsonify({'message': 'Recording available but no transcript'}), 200
        
        # We have recordings and transcripts - set status to ready_for_analysis
        session.status = 'ready_for_analysis'
        db.session.commit()
        
        logger.info(f"Session {session.id} marked as ready_for_analysis (recordings and transcripts available)")
        
        # Process recordings and transcripts
        for recording_file in recording_files:
            file_type = recording_file.get('file_type', '').lower()
            download_url = recording_file.get('download_url', '')
            
            if file_type == 'mp4' and download_url:
                logger.info(f"Video recording available for session {session.id}: {download_url}")
                # Store recording URL or download the file
                
            elif file_type == 'vtt' and download_url:
                logger.info(f"Transcript available for session {session.id}: {download_url}")
                # Download and process transcript
                try:
                    if session_processor and hasattr(session_processor, 'process_transcript_from_url'):
                        session_processor.process_transcript_from_url(session, download_url)
                except Exception as transcript_error:
                    logger.error(f"Failed to process transcript: {str(transcript_error)}")
                    # Notify admin of transcript processing failure
                    admin_notification_service.notify_transcript_download_failed(
                        session,
                        f"Transcript download/processing failed: {str(transcript_error)}",
                        download_url
                    )
                    # Keep status as ready_for_analysis for potential retry
        
        return jsonify({'message': 'Recording completed event processed'}), 200
        
    except Exception as e:
        logger.error(f"Error handling recording.completed: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Failed to process recording completed event'}), 500

@api_bp.route('/zoom/webhook/status', methods=['GET'])
def webhook_status():
    """
    Check webhook configuration status
    """
    webhook_secret = os.environ.get('ZOOM_WEBHOOK_SECRET_TOKEN')
    
    return jsonify({
        'webhook_configured': bool(webhook_secret),
        'webhook_secret_set': bool(webhook_secret),
        'endpoint_url': request.base_url.replace('/status', ''),
        'supported_events': [
            'meeting.started',
            'meeting.ended', 
            'meeting.participant_joined',
            'meeting.participant_left',
            'recording.completed'
        ]
    }), 200