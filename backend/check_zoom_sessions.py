#!/usr/bin/env python3
"""
Check if Zoom meeting details are present in sessions stored in the backend database
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Session
from datetime import datetime
import json

def check_zoom_meeting_details():
    app = create_app()
    with app.app_context():
        print("=== ZOOM MEETING DETAILS CHECK ===\n")
        
        try:
            # 1. Get total session count
            total_sessions = db.session.query(Session).count()
            print(f"📊 Total sessions in database: {total_sessions}")
            
            if total_sessions == 0:
                print("❌ No sessions found in database")
                return
            
            # 2. Get all sessions to analyze
            all_sessions = db.session.query(Session).all()
            
            # 3. Analyze Zoom-related fields
            sessions_with_zoom_id = 0
            sessions_with_zoom_url = 0
            sessions_with_zoom_password = 0
            sessions_with_zoom_start_url = 0
            sessions_with_any_zoom_data = 0
            
            zoom_field_analysis = {
                'zoom_meeting_id': 0,
                'zoom_meeting_url': 0,
                'zoom_meeting_password': 0,
                'zoom_start_url': 0
            }
            
            print(f"\n🔍 ANALYZING ZOOM FIELDS IN SESSIONS:")
            
            for session in all_sessions:
                has_zoom_data = False
                
                # Check each Zoom-related field
                if hasattr(session, 'zoom_meeting_id') and session.zoom_meeting_id:
                    sessions_with_zoom_id += 1
                    zoom_field_analysis['zoom_meeting_id'] += 1
                    has_zoom_data = True
                
                if hasattr(session, 'zoom_meeting_url') and session.zoom_meeting_url:
                    sessions_with_zoom_url += 1
                    zoom_field_analysis['zoom_meeting_url'] += 1
                    has_zoom_data = True
                
                if hasattr(session, 'zoom_meeting_password') and session.zoom_meeting_password:
                    sessions_with_zoom_password += 1
                    zoom_field_analysis['zoom_meeting_password'] += 1
                    has_zoom_data = True
                
                if hasattr(session, 'zoom_start_url') and session.zoom_start_url:
                    sessions_with_zoom_start_url += 1
                    zoom_field_analysis['zoom_start_url'] += 1
                    has_zoom_data = True
                
                if has_zoom_data:
                    sessions_with_any_zoom_data += 1
            
            # 4. Print summary statistics
            print(f"📈 ZOOM FIELD STATISTICS:")
            print(f"   Sessions with zoom_meeting_id: {sessions_with_zoom_id} ({sessions_with_zoom_id/total_sessions*100:.1f}%)")
            print(f"   Sessions with zoom_meeting_url: {sessions_with_zoom_url} ({sessions_with_zoom_url/total_sessions*100:.1f}%)")
            print(f"   Sessions with zoom_meeting_password: {sessions_with_zoom_password} ({sessions_with_zoom_password/total_sessions*100:.1f}%)")
            print(f"   Sessions with zoom_start_url: {sessions_with_zoom_start_url} ({sessions_with_zoom_start_url/total_sessions*100:.1f}%)")
            print(f"   Sessions with ANY Zoom data: {sessions_with_any_zoom_data} ({sessions_with_any_zoom_data/total_sessions*100:.1f}%)")
            
            # 5. Show detailed examples of sessions with Zoom data
            sessions_with_zoom = [s for s in all_sessions if (
                (hasattr(s, 'zoom_meeting_id') and s.zoom_meeting_id) or
                (hasattr(s, 'zoom_meeting_url') and s.zoom_meeting_url) or
                (hasattr(s, 'zoom_meeting_password') and s.zoom_meeting_password) or
                (hasattr(s, 'zoom_start_url') and s.zoom_start_url)
            )]
            
            if sessions_with_zoom:
                print(f"\n📋 SAMPLE SESSIONS WITH ZOOM DATA:")
                
                for i, session in enumerate(sessions_with_zoom[:5], 1):  # Show first 5
                    print(f"\n--- Session {i}: {session.id} ---")
                    print(f"   Title: {getattr(session, 'title', 'N/A')}")
                    print(f"   Date: {getattr(session, 'session_date', 'N/A')}")
                    print(f"   Status: {getattr(session, 'status', 'N/A')}")
                    
                    if hasattr(session, 'zoom_meeting_id') and session.zoom_meeting_id:
                        print(f"   ✓ Zoom Meeting ID: {session.zoom_meeting_id}")
                    
                    if hasattr(session, 'zoom_meeting_url') and session.zoom_meeting_url:
                        # Show partial URL for privacy
                        url = str(session.zoom_meeting_url)
                        if len(url) > 50:
                            url = url[:30] + "..." + url[-10:]
                        print(f"   ✓ Zoom Meeting URL: {url}")
                    
                    if hasattr(session, 'zoom_meeting_password') and session.zoom_meeting_password:
                        # Mask password for security
                        password = str(session.zoom_meeting_password)
                        masked = "*" * (len(password) - 2) + password[-2:] if len(password) > 2 else "***"
                        print(f"   ✓ Zoom Password: {masked}")
                    
                    if hasattr(session, 'zoom_start_url') and session.zoom_start_url:
                        url = str(session.zoom_start_url)
                        if len(url) > 50:
                            url = url[:30] + "..." + url[-10:]
                        print(f"   ✓ Zoom Start URL: {url}")
                
                if len(sessions_with_zoom) > 5:
                    print(f"\n   ... and {len(sessions_with_zoom) - 5} more sessions with Zoom data")
            
            else:
                print(f"\n❌ No sessions found with Zoom meeting details")
            
            # 6. Check session model structure
            print(f"\n🔍 SESSION MODEL FIELD CHECK:")
            sample_session = all_sessions[0] if all_sessions else None
            
            if sample_session:
                zoom_fields = ['zoom_meeting_id', 'zoom_meeting_url', 'zoom_meeting_password', 'zoom_start_url']
                
                print("   Zoom-related fields in Session model:")
                for field in zoom_fields:
                    has_field = hasattr(sample_session, field)
                    print(f"   - {field}: {'✓ Present' if has_field else '❌ Not found'}")
                
                # Show all available fields for reference
                print(f"\n   Available Session fields:")
                session_attrs = [attr for attr in dir(sample_session) if not attr.startswith('_') and not callable(getattr(sample_session, attr))]
                for attr in sorted(session_attrs):
                    print(f"   - {attr}")
            
            # 7. Check for sessions by status
            print(f"\n📊 SESSIONS BY STATUS:")
            
            try:
                from sqlalchemy import func
                status_counts = db.session.query(
                    Session.status,
                    func.count(Session.id)
                ).group_by(Session.status).all()
                
                for status, count in status_counts:
                    print(f"   {status or 'None'}: {count} sessions")
                    
                    # For each status, check how many have Zoom data
                    sessions_in_status = db.session.query(Session).filter(Session.status == status).all()
                    with_zoom = sum(1 for s in sessions_in_status if (
                        (hasattr(s, 'zoom_meeting_id') and s.zoom_meeting_id) or
                        (hasattr(s, 'zoom_meeting_url') and s.zoom_meeting_url) or
                        (hasattr(s, 'zoom_meeting_password') and s.zoom_meeting_password) or
                        (hasattr(s, 'zoom_start_url') and s.zoom_start_url)
                    ))
                    
                    print(f"      └─ With Zoom data: {with_zoom} ({with_zoom/count*100:.1f}%)")
                    
            except Exception as e:
                print(f"   Error analyzing by status: {str(e)}")
            
            # 8. Final summary
            print(f"\n📋 FINAL SUMMARY:")
            if sessions_with_any_zoom_data > 0:
                print(f"✅ {sessions_with_any_zoom_data} out of {total_sessions} sessions have Zoom meeting details")
                print(f"   Coverage: {sessions_with_any_zoom_data/total_sessions*100:.1f}%")
            else:
                print(f"❌ No sessions have Zoom meeting details")
            
            print(f"🔍 Most complete Zoom field: {max(zoom_field_analysis.keys(), key=zoom_field_analysis.get)} ({max(zoom_field_analysis.values())} sessions)")
            print(f"🔍 Least complete Zoom field: {min(zoom_field_analysis.keys(), key=zoom_field_analysis.get)} ({min(zoom_field_analysis.values())} sessions)")
            
        except Exception as e:
            print(f"❌ Error during analysis: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    check_zoom_meeting_details()