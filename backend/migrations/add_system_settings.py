#!/usr/bin/env python3
"""
Add system settings table for configurable platform settings like hourly rates
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User
from sqlalchemy import text

def create_system_settings():
    """Create system_settings table for platform configuration"""
    
    # Create system_settings table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR(50) PRIMARY KEY DEFAULT ('setting_' || substr(hex(randomblob(8)), 1, 8)),
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        setting_type VARCHAR(20) DEFAULT 'string',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(50)
    );
    """
    
    # Insert default hourly rate
    insert_default_rate_sql = """
    INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, description)
    VALUES ('hourly_rate_gbp', '21.0', 'float', 'Default hourly rate in GBP for tutor earnings calculations');
    """
    
    # Insert platform currency
    insert_currency_sql = """
    INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, description)
    VALUES ('platform_currency', 'GBP', 'string', 'Primary currency for the platform');
    """
    
    try:
        app = create_app()
        with app.app_context():
            print("🔧 Creating system_settings table...")
            db.session.execute(text(create_table_sql))
            
            print("💰 Adding default hourly rate (£21.00)...")
            db.session.execute(text(insert_default_rate_sql))
            
            print("💷 Adding platform currency (GBP)...")
            db.session.execute(text(insert_currency_sql))
            
            db.session.commit()
            
            # Verify the settings were created
            result = db.session.execute(text("SELECT * FROM system_settings")).fetchall()
            print(f"✅ Created {len(result)} system settings:")
            for setting in result:
                print(f"   - {setting[1]}: {setting[2]} ({setting[3]})")
            
            print("✅ System settings table created successfully!")
            
    except Exception as e:
        print(f"❌ Error creating system settings: {str(e)}")
        raise

if __name__ == "__main__":
    create_system_settings()