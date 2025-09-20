#!/usr/bin/env python3
"""
Check if prices are being set when sessions are created
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Session, Course

def check_session_pricing():
    app = create_app()
    with app.app_context():
        print("=== SESSION PRICING ANALYSIS ===\n")
        
        try:
            # 1. Get all sessions
            sessions = db.session.query(Session).all()
            print(f"📊 Total sessions in database: {len(sessions)}")
            
            if len(sessions) == 0:
                print("❌ No sessions found")
                return
            
            # 2. Analyze pricing data
            sessions_with_price = 0
            sessions_without_price = 0
            price_values = []
            
            print(f"\n🔍 SESSION PRICING DETAILS:")
            
            for i, session in enumerate(sessions, 1):
                print(f"\n--- Session {i}: {session.id} ---")
                print(f"   Title: {getattr(session, 'title', 'N/A')}")
                print(f"   Status: {getattr(session, 'status', 'N/A')}")
                print(f"   Price: {getattr(session, 'price', 'N/A')}")
                print(f"   Duration: {getattr(session, 'duration', 'N/A')} minutes")
                
                # Check if price is set
                session_price = getattr(session, 'price', None)
                if session_price is not None and session_price > 0:
                    sessions_with_price += 1
                    price_values.append(session_price)
                    print(f"   💰 Has price: £{session_price}")
                else:
                    sessions_without_price += 1
                    print(f"   ❌ No price set")
                
                # Check related course pricing
                if hasattr(session, 'course_id') and session.course_id:
                    course = db.session.query(Course).filter(Course.id == session.course_id).first()
                    if course:
                        print(f"   Course: {course.title}")
                        print(f"   Course price: {getattr(course, 'price', 'N/A')}")
                        print(f"   Course currency: {getattr(course, 'currency', 'N/A')}")
                    else:
                        print(f"   Course: Not found (ID: {session.course_id})")
                else:
                    print(f"   Course: No course associated")
            
            # 3. Summary statistics
            print(f"\n📈 PRICING SUMMARY:")
            print(f"   Sessions with price: {sessions_with_price} ({sessions_with_price/len(sessions)*100:.1f}%)")
            print(f"   Sessions without price: {sessions_without_price} ({sessions_without_price/len(sessions)*100:.1f}%)")
            
            if price_values:
                print(f"   Price range: £{min(price_values)} - £{max(price_values)}")
                print(f"   Average price: £{sum(price_values)/len(price_values):.2f}")
            
            # 4. Check session model for price field
            print(f"\n🔍 SESSION MODEL ANALYSIS:")
            if sessions:
                sample_session = sessions[0]
                session_attrs = [attr for attr in dir(sample_session) 
                               if not attr.startswith('_') and not callable(getattr(sample_session, attr))]
                
                price_related_fields = [attr for attr in session_attrs if 'price' in attr.lower()]
                print(f"   Price-related fields: {price_related_fields if price_related_fields else 'None found'}")
                
                financial_fields = [attr for attr in session_attrs 
                                  if any(word in attr.lower() for word in ['price', 'cost', 'fee', 'amount', 'currency'])]
                print(f"   Financial fields: {financial_fields if financial_fields else 'None found'}")
            
            # 5. Course pricing analysis
            print(f"\n💰 RELATED COURSE PRICING:")
            courses = db.session.query(Course).all()
            courses_with_price = sum(1 for c in courses if getattr(c, 'price', None) is not None and c.price > 0)
            print(f"   Total courses: {len(courses)}")
            print(f"   Courses with price: {courses_with_price}")
            
            if courses:
                for course in courses:
                    course_sessions = [s for s in sessions if getattr(s, 'course_id', None) == course.id]
                    print(f"   Course: {course.title}")
                    print(f"     Price: {getattr(course, 'price', 'N/A')}")
                    print(f"     Sessions: {len(course_sessions)}")
            
            # 6. Analysis conclusion
            print(f"\n📋 CONCLUSION:")
            if sessions_without_price > 0:
                print("   ⚠️  PRICING ISSUE DETECTED:")
                print("      • Some sessions are missing price information")
                print("      • This could affect billing and credit calculations")
                print("      • Sessions should inherit course pricing or have individual prices")
            else:
                print("   ✅ All sessions have pricing information")
            
            # 7. Check session creation process
            print(f"\n🔍 SESSION CREATION ANALYSIS:")
            print("   During session creation, prices should be set from:")
            print("   1. Course price (inherited)")
            print("   2. Custom session price (if specified)")
            print("   3. Default pricing rules")
            
            if sessions_without_price > 0:
                print("\n💡 RECOMMENDATIONS:")
                print("   1. Update session creation to inherit course pricing")
                print("   2. Set default prices for sessions without courses")
                print("   3. Add validation to ensure sessions have pricing")
                print("   4. Update existing sessions with missing prices")
            
        except Exception as e:
            print(f"❌ Error during analysis: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    check_session_pricing()