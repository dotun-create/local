"""
Database migration for password management features

This migration adds tables for:
- Admin actions audit trail
- Password reset tokens
- Secure admin sessions  
- Password viewing audit
- Password vault for encrypted storage
- Admin security configuration

Run this migration after updating the models.py file.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import (
    AdminAction, PasswordResetToken, AdminSecureSession,
    PasswordViewAudit, PasswordVault, AdminSecurityConfig
)

def upgrade():
    """Create new tables for password management"""
    app = create_app()
    
    with app.app_context():
        # Create all new tables
        db.create_all()
        
        # Initialize default security configurations
        from app.services.admin_security_service import AdminSecurityService
        AdminSecurityService.initialize_default_configs()
        
        print("✅ Password management tables created successfully")
        print("✅ Default security configurations initialized")
        
        # Add temporary password fields to existing users table
        try:
            with db.engine.connect() as conn:
                conn.execute(db.text("""
                    ALTER TABLE users 
                    ADD COLUMN temp_password_hash VARCHAR(255)
                """))
                conn.execute(db.text("""
                    ALTER TABLE users 
                    ADD COLUMN temp_password_expires_at TIMESTAMP
                """))
                conn.execute(db.text("""
                    ALTER TABLE users 
                    ADD COLUMN force_password_change BOOLEAN DEFAULT FALSE
                """))
                conn.execute(db.text("""
                    ALTER TABLE users 
                    ADD COLUMN temp_password_created_by VARCHAR(50)
                """))
                conn.commit()
            print("✅ User table updated with temporary password fields")
        except Exception as e:
            print(f"⚠️  User table update may have already been applied: {e}")

def downgrade():
    """Remove password management tables"""
    app = create_app()
    
    with app.app_context():
        # Drop all password management tables
        tables_to_drop = [
            'admin_security_config',
            'user_password_vault', 
            'password_view_audit',
            'admin_secure_sessions',
            'password_reset_tokens',
            'admin_actions'
        ]
        
        for table in tables_to_drop:
            try:
                with db.engine.connect() as conn:
                    conn.execute(db.text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                    conn.commit()
                print(f"✅ Dropped table: {table}")
            except Exception as e:
                print(f"❌ Error dropping {table}: {e}")
        
        # Remove temporary password columns from users table (SQLite doesn't support DROP COLUMN)
        try:
            print("⚠️  SQLite doesn't support dropping columns - temporary columns will remain")
        except Exception as e:
            print(f"❌ Error removing columns from users table: {e}")

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'downgrade':
        print("🔄 Running downgrade migration...")
        downgrade()
    else:
        print("🔄 Running upgrade migration...")
        upgrade()
    
    print("✅ Migration completed!")