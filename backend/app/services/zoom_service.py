import os
import requests
import json
import base64
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import time

class ZoomService:
    """Service for handling Zoom API integrations"""
    
    def __init__(self):
        self.base_url = 'https://api.zoom.us/v2'
        self.oauth_url = 'https://zoom.us/oauth/token'
        self._access_token = None
        self._token_expiry = None
        # Don't initialize credentials here - load them when needed

    @property
    def account_id(self):
        return os.getenv('ZOOM_ACCOUNT_ID')

    @property
    def client_id(self):
        return os.getenv('ZOOM_CLIENT_ID')

    @property
    def client_secret(self):
        return os.getenv('ZOOM_CLIENT_SECRET')
        
    def is_configured(self) -> bool:
        """Check if Zoom credentials are properly configured"""
        return all([self.account_id, self.client_id, self.client_secret])
    
    def _get_access_token(self) -> str:
        """Get a valid access token, refreshing if necessary"""
        if self._access_token and self._token_expiry and datetime.now() < self._token_expiry:
            return self._access_token
            
        if not self.is_configured():
            raise ValueError("Zoom credentials not configured. Please set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET environment variables.")
        
        try:
            # Create basic auth header
            credentials = f"{self.client_id}:{self.client_secret}"
            encoded_credentials = base64.b64encode(credentials.encode()).decode()
            
            headers = {
                'Authorization': f'Basic {encoded_credentials}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            data = {
                'grant_type': 'account_credentials',
                'account_id': self.account_id
            }
            
            response = requests.post(self.oauth_url, headers=headers, data=data, timeout=30)
            response.raise_for_status()
            
            token_data = response.json()
            self._access_token = token_data['access_token']
            # Set expiry 1 minute before actual expiry for safety
            self._token_expiry = datetime.now() + timedelta(seconds=token_data['expires_in'] - 60)
            
            return self._access_token
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to obtain Zoom access token: {str(e)}")
    
    def _make_api_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[Any, Any]:
        """Make an authenticated request to the Zoom API"""
        token = self._get_access_token()
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method.upper() == 'PATCH':
                response = requests.patch(url, headers=headers, json=data, timeout=30)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            return response.json() if response.content else {}
            
        except requests.exceptions.RequestException as e:
            error_msg = f"Zoom API request failed: {str(e)}"
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    error_msg += f" - {error_data.get('message', 'Unknown error')}"
                    # Enhanced logging for debugging
                    print(f"ZOOM API ERROR DETAILS:")
                    print(f"Status Code: {e.response.status_code}")
                    print(f"Response: {error_data}")
                    print(f"URL: {url}")
                    print(f"Method: {method}")
                    if data:
                        print(f"Payload: {json.dumps(data, indent=2)}")
                except json.JSONDecodeError:
                    error_msg += f" - Raw response: {e.response.text}"
                    print(f"ZOOM API RAW ERROR: Status {e.response.status_code} - {e.response.text}")
                except:
                    pass
            raise Exception(error_msg)
    
    def create_meeting(self, meeting_data: Dict[str, Any], user_id: str = 'me') -> Dict[str, Any]:
        """Create a new Zoom meeting"""
        if not self.is_configured():
            return {
                'success': False,
                'error': 'Zoom integration not configured',
                'meeting_id': None,
                'join_url': None,
                'start_url': None,
                'password': None,
                'uuid': None
            }
        
        try:
            # Default meeting settings for educational sessions
            default_settings = {
                'host_video': True,
                'participant_video': True,
                'cn_meeting': False,
                'in_meeting': False,
                'join_before_host': False,
                'mute_upon_entry': True,
                'watermark': False,
                'use_pmi': False,
                'approval_type': 2,  # Manual approval
                'audio': 'both',
                'auto_recording': 'cloud',  # Enable cloud recording by default
                'enforce_login': False,
                'registrants_email_notification': True,
                'waiting_room': True,
                'allow_multiple_devices': False,
                # Transcript settings for AI analysis
                'auto_recording_transcript': True,  # Enable transcript generation
                'recording_transcript': {
                    'auto_save_locally': False,  # Save to cloud only
                    'auto_save_to_cloud': True,  # Save transcript to cloud
                    'enable': True  # Enable transcript feature
                }
            }
            
            # Prepare meeting payload
            payload = {
                'topic': meeting_data.get('topic', 'Course Session'),
                'type': 2,  # Scheduled meeting
                'duration': meeting_data.get('duration', 60),
                'timezone': meeting_data.get('timezone', 'UTC'),
                'settings': {**default_settings, **(meeting_data.get('settings', {}))}
            }
            
            # Add start time if provided
            if 'start_time' in meeting_data:
                start_time = meeting_data['start_time']
                if isinstance(start_time, str):
                    # Parse ISO string
                    start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                elif isinstance(start_time, datetime):
                    pass
                else:
                    raise ValueError("start_time must be a datetime object or ISO string")
                
                payload['start_time'] = start_time.strftime('%Y-%m-%dT%H:%M:%SZ')
            
            # Generate a password if not provided
            if 'password' not in meeting_data:
                payload['password'] = self._generate_meeting_password()
            else:
                payload['password'] = meeting_data['password']
            
            # Create the meeting
            response = self._make_api_request('POST', f'/users/{user_id}/meetings', payload)
            
            return {
                'success': True,
                'meeting_id': str(response['id']),
                'join_url': response['join_url'],
                'start_url': response['start_url'],
                'password': response.get('password', payload['password']),
                'uuid': response['uuid'],
                'topic': response['topic'],
                'start_time': response.get('start_time'),
                'duration': response['duration']
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'meeting_id': None,
                'join_url': None,
                'start_url': None,
                'password': None,
                'uuid': None
            }
    
    def get_meeting(self, meeting_id: str) -> Dict[str, Any]:
        """Get meeting details"""
        if not self.is_configured():
            return {'success': False, 'error': 'Zoom integration not configured'}
        
        try:
            response = self._make_api_request('GET', f'/meetings/{meeting_id}')
            return {
                'success': True,
                'meeting': response
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def update_meeting(self, meeting_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update meeting details"""
        if not self.is_configured():
            return {'success': False, 'error': 'Zoom integration not configured'}
        
        try:
            # Format start_time if provided
            if 'start_time' in update_data:
                start_time = update_data['start_time']
                if isinstance(start_time, str):
                    start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                elif isinstance(start_time, datetime):
                    pass
                else:
                    raise ValueError("start_time must be a datetime object or ISO string")
                
                update_data['start_time'] = start_time.strftime('%Y-%m-%dT%H:%M:%SZ')
            
            self._make_api_request('PATCH', f'/meetings/{meeting_id}', update_data)
            
            return {
                'success': True,
                'message': 'Meeting updated successfully'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def delete_meeting(self, meeting_id: str) -> Dict[str, Any]:
        """Delete a meeting"""
        if not self.is_configured():
            return {'success': False, 'error': 'Zoom integration not configured'}
        
        try:
            self._make_api_request('DELETE', f'/meetings/{meeting_id}')
            
            return {
                'success': True,
                'message': 'Meeting deleted successfully'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_meetings(self, user_id: str = 'me', meeting_type: str = 'scheduled') -> Dict[str, Any]:
        """List meetings for a user"""
        if not self.is_configured():
            return {'success': False, 'error': 'Zoom integration not configured'}
        
        try:
            params = f"?type={meeting_type}&page_size=30"
            response = self._make_api_request('GET', f'/users/{user_id}/meetings{params}')
            
            return {
                'success': True,
                'meetings': response.get('meetings', []),
                'total_records': response.get('total_records', 0)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_course_session_meeting(self, course_data: Dict[str, Any], session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a Zoom meeting specifically for a course session with recording and transcript enabled"""
        # Extract session object if it's nested
        session = session_data.get('session', session_data)
        
        meeting_data = {
            'topic': f"{course_data.get('title', 'Course')} - {session.get('title', 'Session')}",
            'start_time': session.get('scheduledDate'),
            'duration': session.get('duration', 60),
            'timezone': session.get('timezone', 'UTC'),
            'settings': {
                'host_video': True,
                'participant_video': True,
                'join_before_host': False,
                'mute_upon_entry': True,
                'waiting_room': True,
                'approval_type': 2,
                'audio': 'both',
                'auto_recording': 'cloud',  # Enable cloud recording for session analysis
                'enforce_login': False,
                'registrants_email_notification': True,
                # Transcript settings for AI analysis
                'auto_recording_transcript': True,
                'recording_transcript': {
                    'auto_save_locally': False,
                    'auto_save_to_cloud': True,
                    'enable': True
                }
            }
        }
        
        # Create the meeting
        result = self.create_meeting(meeting_data)
        
        # Check if recording settings were properly applied
        if result.get('success') and result.get('meeting_id'):
            # If meeting creation succeeded but we suspect recording might not be enabled,
            # we'll handle notifications in the webhook handlers when we don't receive recording events
            pass
        
        return result
    
    def _generate_meeting_password(self, length: int = 8) -> str:
        """Generate a random meeting password"""
        import random
        import string
        
        # Use alphanumeric characters for password
        chars = string.ascii_letters + string.digits
        return ''.join(random.choice(chars) for _ in range(length))
    
    def validate_credentials(self) -> Dict[str, Any]:
        """Validate Zoom API credentials"""
        if not self.is_configured():
            return {
                'success': False,
                'error': 'Zoom credentials not configured',
                'configured': False
            }
        
        try:
            # Try to get user info to validate credentials
            response = self._make_api_request('GET', '/users/me')
            
            return {
                'success': True,
                'message': 'Zoom credentials are valid',
                'configured': True,
                'user': {
                    'id': response.get('id'),
                    'email': response.get('email'),
                    'account_id': response.get('account_id')
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': f'Invalid Zoom credentials: {str(e)}',
                'configured': True  # Configured but invalid
            }
    
    # AI Feedback System Methods
    
    def get_meeting_report(self, meeting_id: str) -> Optional[Dict]:
        """Get meeting report including duration and participants for AI feedback"""
        if not self.is_configured():
            return None
            
        try:
            # Get meeting details
            meeting_data = self._make_api_request('GET', f'/meetings/{meeting_id}')
            
            # Get meeting participants report
            participants_data = self._make_api_request('GET', f'/report/meetings/{meeting_id}/participants')
            
            # Format response for AI feedback processing
            report = {
                'meeting_id': meeting_id,
                'topic': meeting_data.get('topic', ''),
                'start_time': meeting_data.get('start_time'),
                'duration': meeting_data.get('duration', 0),  # in minutes
                'participants_count': len(participants_data.get('participants', [])) if participants_data else 0,
                'participants': []
            }
            
            # Add detailed participant information
            if participants_data and 'participants' in participants_data:
                for participant in participants_data['participants']:
                    report['participants'].append({
                        'user_id': participant.get('user_id'),
                        'name': participant.get('name'),
                        'user_email': participant.get('user_email'),
                        'join_time': participant.get('join_time'),
                        'leave_time': participant.get('leave_time'),
                        'duration': participant.get('duration', 0),  # participant's duration in minutes
                        'attentiveness_score': participant.get('attentiveness_score')
                    })
            
            return report
            
        except Exception as e:
            print(f"Error getting meeting report: {e}")
            return None
    
    def get_meeting_recordings(self, meeting_id: str) -> Optional[Dict]:
        """Get meeting recordings including transcripts"""
        if not self.is_configured():
            return None
            
        try:
            recordings_data = self._make_api_request('GET', f'/meetings/{meeting_id}/recordings')
            return recordings_data
            
        except Exception as e:
            print(f"Error getting meeting recordings: {e}")
            return None
    
    def get_meeting_transcript(self, meeting_id: str) -> Optional[Dict]:
        """Extract transcript from meeting recordings for AI processing"""
        try:
            recordings = self.get_meeting_recordings(meeting_id)
            
            if not recordings or 'recording_files' not in recordings:
                return None
            
            # Look for transcript files
            for recording_file in recordings['recording_files']:
                if recording_file.get('file_type') == 'TRANSCRIPT':
                    transcript_data = {
                        'text': '',
                        'language': recording_file.get('detected_language', 'en'),
                        'download_url': recording_file.get('download_url'),
                        'file_size': recording_file.get('file_size', 0)
                    }
                    
                    # Download transcript content
                    if transcript_data['download_url']:
                        transcript_text = self._download_transcript(transcript_data['download_url'])
                        if transcript_text:
                            transcript_data['text'] = transcript_text
                    
                    return transcript_data
            
            return None
            
        except Exception as e:
            print(f"Error getting meeting transcript: {e}")
            return None
    
    def _download_transcript(self, download_url: str) -> Optional[str]:
        """Download transcript content from URL"""
        try:
            token = self._get_access_token()
            
            headers = {
                'Authorization': f'Bearer {token}'
            }
            
            response = requests.get(download_url, headers=headers, timeout=30)
            response.raise_for_status()
            
            # Handle different transcript formats
            content = response.text
            
            # If it's VTT format, extract just the text
            if 'WEBVTT' in content:
                lines = content.split('\n')
                transcript_lines = []
                for line in lines:
                    # Skip VTT headers, timestamps, and empty lines
                    if (not line.startswith('WEBVTT') and 
                        not line.startswith('NOTE') and
                        not '-->' in line and
                        line.strip() and
                        not line.strip().isdigit()):
                        transcript_lines.append(line.strip())
                return '\n'.join(transcript_lines)
            else:
                return content
                
        except Exception as e:
            print(f"Error downloading transcript: {e}")
            return None
    
    def validate_meeting_duration(self, meeting_report: Dict, minimum_minutes: int = 15) -> bool:
        """Validate if meeting met minimum duration requirement for AI feedback"""
        try:
            duration = meeting_report.get('duration', 0)
            return duration >= minimum_minutes
            
        except Exception as e:
            print(f"Error validating meeting duration: {e}")
            return False
    
    def validate_meeting_attendance(self, meeting_report: Dict, tutor_email: str) -> Dict:
        """Validate meeting attendance for AI feedback eligibility"""
        try:
            participants = meeting_report.get('participants', [])
            participant_emails = [p.get('user_email', '').lower() for p in participants]
            
            tutor_attended = tutor_email.lower() in participant_emails
            has_students = len(participants) >= 2  # At least tutor + 1 student
            
            return {
                'total_participants': len(participants),
                'tutor_attended': tutor_attended,
                'has_students': has_students,
                'meeting_valid': tutor_attended and has_students,
                'participant_emails': participant_emails
            }
            
        except Exception as e:
            print(f"Error validating meeting attendance: {e}")
            return {'meeting_valid': False}
    
    def get_student_attendance_info(self, meeting_report: Dict, student_email: str) -> Optional[Dict]:
        """Get specific student's attendance information from meeting"""
        try:
            participants = meeting_report.get('participants', [])
            
            for participant in participants:
                if participant.get('user_email', '').lower() == student_email.lower():
                    return {
                        'attended': True,
                        'name': participant.get('name'),
                        'join_time': participant.get('join_time'),
                        'leave_time': participant.get('leave_time'),
                        'duration': participant.get('duration', 0),
                        'attentiveness_score': participant.get('attentiveness_score')
                    }
            
            return {'attended': False}
            
        except Exception as e:
            print(f"Error getting student attendance: {e}")
            return {'attended': False}

# Global instance
zoom_service = ZoomService()