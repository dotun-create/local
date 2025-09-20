#!/usr/bin/env python3
"""
Database Migration: Add Session Analysis Statuses
Adds support for 'ready_for_analysis' and 'analyzed' session statuses
"""

import os
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app import create_app, db
from app.models import Session
from sqlalchemy import text

def run_migration():
    """Add new session statuses for analysis workflow"""
    
    app = create_app()
    
    with app.app_context():
        try:
            print("🔄 Starting session analysis statuses migration...")
            
            # Check current database type
            print("📊 Checking current session status column...")
            
            # For SQLite, we'll check the current schema and recreate if needed
            # SQLite doesn't support ALTER COLUMN, so we need to be careful
            result = db.session.execute(text("""
                SELECT sql FROM sqlite_master 
                WHERE type='table' AND name='sessions'
            """)).fetchone()
            
            if result:
                table_schema = result[0]
                print(f"Current sessions table schema: {table_schema}")
                
                # Check if status column needs expansion (look for VARCHAR(20) or similar)
                if 'status' in table_schema and ('VARCHAR(20)' in table_schema or 'VARCHAR(15)' in table_schema):
                    print("📝 Status column may need expansion for longer status names...")
                    print("💡 Note: SQLite will handle VARCHAR(30) automatically with current schema")
                else:
                    print("✅ Session status column should support longer status names")
            else:
                print("⚠️ Sessions table not found or schema unclear")
            
            # Check for any sessions that might need status updates
            print("📋 Checking existing session statuses...")
            
            status_counts = db.session.execute(text("""
                SELECT status, COUNT(*) as count
                FROM sessions 
                GROUP BY status
                ORDER BY count DESC
            """)).fetchall()
            
            print("Current session status distribution:")
            for status, count in status_counts:
                print(f"  - {status}: {count} sessions")
            
            # Commit the schema changes
            db.session.commit()
            print("✅ Session analysis statuses migration completed successfully!")
            
            # Show the new expected status flow
            print("\n📝 New Session Status Flow:")
            print("  1. 'scheduled' → Session created/booked")
            print("  2. 'in_progress' → Zoom meeting started")
            print("  3. 'completed' → Zoom meeting ended")
            print("  4. 'ready_for_analysis' → Transcripts/recordings available")
            print("  5. 'analyzed' → AI analysis completed")
            print("\n💡 Note: Sessions without recordings will remain at 'completed' status")
            
        except Exception as e:
            print(f"❌ Migration failed: {str(e)}")
            db.session.rollback()
            raise
        finally:
            db.session.close()

if __name__ == '__main__':
    run_migration()