#!/usr/bin/env python3
"""
Script to clean up all availability records for a specific tutor
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Availability

app = create_app()

def cleanup_tutor_availability(tutor_id):
    """Remove all availability records for a specific tutor"""
    with app.app_context():
        try:
            # Count existing records
            existing_count = Availability.query.filter_by(tutor_id=tutor_id).count()
            print(f"Found {existing_count} availability record(s) for tutor {tutor_id}")
            
            if existing_count > 0:
                # Show details of records to be deleted
                records = Availability.query.filter_by(tutor_id=tutor_id).all()
                for record in records:
                    print(f"  - ID: {record.id}, Day: {record.day_of_week}, "
                          f"Time: {record.start_time}-{record.end_time}, "
                          f"Date: {record.specific_date}")
                
                # Delete all records
                Availability.query.filter_by(tutor_id=tutor_id).delete()
                db.session.commit()
                print(f"✅ Successfully deleted {existing_count} availability record(s)")
            else:
                print("✅ No availability records found to delete")
                
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error cleaning up availability: {str(e)}")
            return False
    
    return True

if __name__ == "__main__":
    # The tutor ID we want to clean up
    TUTOR_ID = "user_e30c7ffd"
    
    print(f"🧹 Cleaning up availability for tutor: {TUTOR_ID}")
    print("-" * 50)
    
    if cleanup_tutor_availability(TUTOR_ID):
        print("-" * 50)
        print("✅ Cleanup completed successfully!")
    else:
        print("-" * 50)
        print("❌ Cleanup failed!")