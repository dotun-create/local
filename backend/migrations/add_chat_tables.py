#!/usr/bin/env python3

import os
import sys
from datetime import datetime

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import SystemSettings

def create_chat_tables():
    """Create chat system tables"""
    app = create_app()
    
    with app.app_context():
        print("Creating chat system tables...")
        
        # Create the chat tables using SQLAlchemy
        try:
            # This will create all tables defined in models.py that don't exist yet
            db.create_all()
            print("✅ Chat tables created successfully!")
            
            # Enable chat system by default (set to False initially for admin to enable)
            existing_setting = SystemSettings.query.filter_by(
                setting_key='chat_system_enabled'
            ).first()
            
            if not existing_setting:
                chat_setting = SystemSettings(
                    setting_key='chat_system_enabled',
                    setting_value='false',
                    setting_type='boolean',
                    description='Enable/disable the course chat system',
                    updated_by='system'
                )
                db.session.add(chat_setting)
                db.session.commit()
                print("✅ Chat system setting initialized (disabled by default)")
            else:
                print("✅ Chat system setting already exists")
            
            print("\n📋 Chat Tables Created:")
            print("- course_chats: Stores course-specific chat rooms")
            print("- chat_participants: Manages chat participants and their roles")
            print("- chat_messages: Stores all chat messages")
            print("- message_read_status: Tracks read status of messages")
            
            print("\n🎯 Next Steps:")
            print("1. Admin can enable the chat system in Admin Panel > System Settings")
            print("2. Students will see chat in course detail pages")
            print("3. Tutors can access chats in their dashboard")
            print("4. Admins can monitor all chats in the admin panel")
            
        except Exception as e:
            print(f"❌ Error creating chat tables: {e}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    create_chat_tables()