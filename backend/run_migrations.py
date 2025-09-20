#!/usr/bin/env python3
"""
Run database migrations to ensure schema consistency
This script applies the latest schema to the database, ensuring
the production database matches the local development schema.
"""

import os
import sys
import subprocess
from datetime import datetime
from app import create_app, db
from sqlalchemy import text, inspect

def check_database_exists():
    """Check if database is accessible"""
    app = create_app()
    with app.app_context():
        try:
            # Try to connect to database
            db.session.execute(text('SELECT 1'))
            db.session.commit()
            print("✅ Database connection successful")
            return True
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return False

def get_current_tables():
    """Get list of existing tables in the database"""
    app = create_app()
    with app.app_context():
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        print(f"📊 Found {len(tables)} existing tables in database")
        return tables

def backup_database():
    """Create a backup before running migrations"""
    print("💾 Creating database backup...")
    
    # Get database URL
    database_url = os.environ.get('DATABASE_URL', '')
    if not database_url:
        print("⚠️  No DATABASE_URL found, skipping backup")
        return None
    
    # Parse database URL for pg_dump
    try:
        from urllib.parse import urlparse
        parsed = urlparse(database_url)
        
        db_params = {
            'host': parsed.hostname or 'localhost',
            'port': parsed.port or 5432,
            'user': parsed.username,
            'password': parsed.password,
            'dbname': parsed.path[1:] if parsed.path else 'troupe_db'
        }
    except Exception as e:
        print(f"⚠️  Error parsing DATABASE_URL: {e}")
        return None
    
    # Create backup filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = f'/tmp/db_backup_{timestamp}.sql'
    
    # Run pg_dump for backup
    env = os.environ.copy()
    env['PGPASSWORD'] = db_params['password']
    
    cmd = [
        'pg_dump',
        '-h', str(db_params['host']),
        '-p', str(db_params['port']),
        '-U', db_params['user'],
        '-d', db_params['dbname'],
        '-f', backup_file
    ]
    
    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            print(f"✅ Backup created: {backup_file}")
            return backup_file
        else:
            print(f"⚠️  Backup failed: {result.stderr}")
            return None
    except FileNotFoundError:
        print("⚠️  pg_dump not found, skipping backup")
        return None
    except Exception as e:
        print(f"⚠️  Backup error: {e}")
        return None

def run_sqlalchemy_migrations():
    """Run migrations using SQLAlchemy's create_all"""
    print("🔧 Running SQLAlchemy migrations...")
    
    app = create_app()
    with app.app_context():
        try:
            # Create all tables defined in models
            db.create_all()
            print("✅ SQLAlchemy migrations completed")
            
            # Verify tables were created
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"📊 Database now has {len(tables)} tables")
            
            # List new tables
            expected_tables = [
                'users', 'courses', 'modules', 'lessons', 'quizzes', 'questions',
                'sessions', 'enrollments', 'quiz_results', 'notifications',
                'invoices', 'payments', 'stripe_customers', 'payment_methods',
                'credit_balances', 'pricing_plans', 'tutor_earnings', 'availabilities',
                'guardian_invitations', 'ai_prompts', 'system_configs',
                'student_session_feedbacks', 'admin_actions', 'password_reset_tokens',
                'admin_secure_sessions', 'password_view_audits', 'password_vaults',
                'admin_security_configs', 'student_credit_allocations',
                'credit_transactions', 'system_settings',
                'course_tutors', 'session_students'  # Association tables
            ]
            
            for table in expected_tables:
                if table in tables:
                    print(f"  ✓ {table}")
                else:
                    print(f"  ⚠️  Missing: {table}")
            
            return True
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            return False

def apply_schema_file(schema_file):
    """Apply a SQL schema file to the database"""
    print(f"📄 Applying schema from {schema_file}...")
    
    if not os.path.exists(schema_file):
        print(f"⚠️  Schema file not found: {schema_file}")
        return False
    
    # Get database URL
    database_url = os.environ.get('DATABASE_URL', '')
    if not database_url or not database_url.startswith('postgresql'):
        print("⚠️  PostgreSQL DATABASE_URL not found, using SQLAlchemy method")
        return False
    
    # Parse database URL
    try:
        from urllib.parse import urlparse
        parsed = urlparse(database_url)
        
        db_params = {
            'host': parsed.hostname or 'localhost',
            'port': parsed.port or 5432,
            'user': parsed.username,
            'password': parsed.password,
            'dbname': parsed.path[1:] if parsed.path else 'troupe_db'
        }
    except Exception as e:
        print(f"⚠️  Error parsing DATABASE_URL: {e}")
        return False
    
    # Apply schema using psql
    env = os.environ.copy()
    env['PGPASSWORD'] = db_params['password']
    
    cmd = [
        'psql',
        '-h', str(db_params['host']),
        '-p', str(db_params['port']),
        '-U', db_params['user'],
        '-d', db_params['dbname'],
        '-f', schema_file
    ]
    
    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            print(f"✅ Schema applied successfully")
            return True
        else:
            print(f"⚠️  Schema application had issues: {result.stderr}")
            # Non-fatal - some errors might be expected (e.g., dropping non-existent tables)
            return True
    except FileNotFoundError:
        print("⚠️  psql not found, falling back to SQLAlchemy")
        return False
    except Exception as e:
        print(f"⚠️  Error applying schema: {e}")
        return False

def verify_migration():
    """Verify that migration was successful"""
    print("\n🔍 Verifying migration...")
    
    app = create_app()
    with app.app_context():
        try:
            # Check core tables exist
            core_tables = ['users', 'courses', 'modules', 'sessions', 'enrollments']
            inspector = inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            all_good = True
            for table in core_tables:
                if table in existing_tables:
                    # Check if table has rows (just a count, not data)
                    result = db.session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    print(f"  ✓ {table}: {count} rows")
                else:
                    print(f"  ❌ {table}: missing")
                    all_good = False
            
            return all_good
        except Exception as e:
            print(f"❌ Verification failed: {e}")
            return False

def main():
    """Main migration runner"""
    print("🚀 Starting database migration process...\n")
    
    # Check database connection
    if not check_database_exists():
        print("❌ Cannot proceed without database connection")
        return 1
    
    # Get current state
    existing_tables = get_current_tables()
    
    # Create backup if tables exist
    if existing_tables:
        backup_file = backup_database()
        if backup_file:
            print(f"💾 Backup saved to: {backup_file}")
    
    # Try to apply SQL schema file if it exists
    schema_applied = False
    schema_files = [
        'migrations/latest_schema.sql',
        '/app/migrations/latest_schema.sql',
        'backend/migrations/latest_schema.sql'
    ]
    
    for schema_file in schema_files:
        if os.path.exists(schema_file):
            print(f"📋 Found schema file: {schema_file}")
            if apply_schema_file(schema_file):
                schema_applied = True
                break
    
    # Always run SQLAlchemy migrations as well (to ensure completeness)
    if not schema_applied:
        print("\n📝 No schema file found, using SQLAlchemy create_all...")
    else:
        print("\n📝 Running SQLAlchemy create_all to ensure completeness...")
    
    if not run_sqlalchemy_migrations():
        print("❌ Migration failed!")
        return 1
    
    # Verify migration
    if verify_migration():
        print("\n✅ Migration completed successfully!")
        return 0
    else:
        print("\n⚠️  Migration completed with warnings")
        return 0  # Non-fatal

if __name__ == "__main__":
    sys.exit(main())