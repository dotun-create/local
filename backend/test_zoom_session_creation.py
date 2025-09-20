#!/usr/bin/env python3
"""
Test what happens when session creation attempts to create Zoom meetings
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Session
from app.services.zoom_service import zoom_service

def test_zoom_session_creation():
    app = create_app()
    with app.app_context():
        print("=== TESTING ZOOM SESSION CREATION PROCESS ===\n")
        
        try:
            # 1. Check Zoom configuration
            print("🔍 CHECKING ZOOM CONFIGURATION:")
            is_configured = zoom_service.is_configured()
            print(f"   Zoom configured: {is_configured}")
            
            if not is_configured:
                print("   ❌ Zoom credentials not configured")
                print("   Missing environment variables:")
                print(f"      ZOOM_ACCOUNT_ID: {os.getenv('ZOOM_ACCOUNT_ID', 'NOT SET')}")
                print(f"      ZOOM_CLIENT_ID: {os.getenv('ZOOM_CLIENT_ID', 'NOT SET')}")
                print(f"      ZOOM_CLIENT_SECRET: {'SET' if os.getenv('ZOOM_CLIENT_SECRET') else 'NOT SET'}")
            else:
                print("   ✅ All Zoom credentials configured")
            
            # 2. Test validation
            print(f"\n🧪 TESTING ZOOM CREDENTIAL VALIDATION:")
            try:
                status = zoom_service.validate_credentials()
                print(f"   Validation result: {status}")
            except Exception as e:
                print(f"   ❌ Validation failed: {str(e)}")
            
            # 3. Simulate session creation process
            print(f"\n📝 SIMULATING SESSION CREATION PROCESS:")
            
            # Mock course and session data
            mock_course_data = {
                'id': 'course_test',
                'title': 'Test Course',
                'timezone': 'UTC'
            }
            
            mock_session_data = {
                'id': 'session_test',
                'title': 'Test Session',
                'scheduled_date': '2025-08-30T14:00:00Z',
                'duration': 60,
                'timezone': 'UTC'
            }
            
            print(f"   Course: {mock_course_data['title']}")
            print(f"   Session: {mock_session_data['title']}")
            print(f"   Scheduled: {mock_session_data['scheduled_date']}")
            
            # 4. Attempt to create Zoom meeting
            print(f"\n🔄 ATTEMPTING ZOOM MEETING CREATION:")
            try:
                result = zoom_service.create_course_session_meeting(mock_course_data, mock_session_data)
                
                if result['success']:
                    print(f"   ✅ Zoom meeting created successfully!")
                    print(f"      Meeting ID: {result.get('meeting_id')}")
                    print(f"      Join URL: {result.get('join_url')}")
                    print(f"      Start URL: {result.get('start_url')}")
                    print(f"      Password: {result.get('password')}")
                else:
                    print(f"   ❌ Zoom meeting creation failed:")
                    print(f"      Error: {result.get('error')}")
            except Exception as e:
                print(f"   ❌ Exception during Zoom meeting creation:")
                print(f"      Error: {str(e)}")
            
            # 5. Check what would happen in session update
            print(f"\n💾 SESSION UPDATE SIMULATION:")
            print("   When Zoom meeting creation fails, the session would be created with:")
            print("      meeting_link: NULL")
            print("      meeting_id: NULL")
            print("      meeting_password: NULL")
            print("      meeting_start_url: NULL")
            print("      meeting_uuid: NULL")
            
            # 6. Show current sessions status
            print(f"\n📊 CURRENT SESSIONS STATUS:")
            sessions = db.session.query(Session).all()
            print(f"   Total sessions: {len(sessions)}")
            
            sessions_with_meeting_data = 0
            for session in sessions:
                if (session.meeting_link or session.meeting_id or 
                    session.meeting_password or session.meeting_start_url):
                    sessions_with_meeting_data += 1
            
            print(f"   Sessions with meeting data: {sessions_with_meeting_data}")
            print(f"   Sessions without meeting data: {len(sessions) - sessions_with_meeting_data}")
            
            # 7. Conclusion
            print(f"\n📋 ANALYSIS CONCLUSION:")
            if not is_configured:
                print("   🎯 ROOT CAUSE: Zoom credentials not configured")
                print("      • ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET environment variables missing")
                print("      • Session creation continues but Zoom meeting creation fails silently")
                print("      • Sessions are saved without meeting links, IDs, or passwords")
                print("      • Frontend receives sessions but they have no Zoom data")
            else:
                print("   ✅ Zoom is properly configured")
                print("      • Issue may be elsewhere in the session creation flow")
            
            print(f"\n🔧 RECOMMENDED FIXES:")
            print("   1. Set up Zoom environment variables in backend")
            print("   2. Create Zoom OAuth app and get credentials")
            print("   3. Add error handling to inform users when Zoom fails")
            print("   4. Consider fallback meeting options when Zoom unavailable")
            
        except Exception as e:
            print(f"❌ Error during analysis: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    test_zoom_session_creation()