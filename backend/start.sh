#!/bin/bash
set -e

echo "🚀 Starting ORMS Backend..."

# Wait for database if DATABASE_URL is provided
if [ ! -z "$DATABASE_URL" ]; then
    echo "⏳ Waiting for database connection..."
    
    # Simple Python script to test database connection
    python3 -c "
import time
import os
import sys

# Try importing psycopg2 or use a simple connection test
try:
    import psycopg2
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        for i in range(30):
            try:
                conn = psycopg2.connect(db_url)
                conn.close()
                print('✅ Database connected!')
                sys.exit(0)
            except Exception as e:
                print(f'⏳ Database not ready, attempt {i+1}/30...')
                time.sleep(10)
        print('❌ Database connection timeout')
        sys.exit(1)
except ImportError:
    print('⚠️  psycopg2 not installed, skipping database check')
" || echo "⚠️  Database check skipped"
    
    echo "🔧 Running database migrations..."
    
    # First, try to run the migration script if it exists
    if [ -f "/app/run_migrations.py" ]; then
        python3 /app/run_migrations.py
    elif [ -f "run_migrations.py" ]; then
        python3 run_migrations.py
    else
        # Fallback to simple create_all
        echo "⚠️  Migration script not found, using simple setup..."
        python3 -c "
try:
    from app import create_app, db
    app = create_app()
    with app.app_context():
        db.create_all()
        print('✅ Database tables created')
except Exception as e:
    print(f'⚠️  Database setup warning: {e}')
"
    fi || echo "⚠️  Database setup completed with warnings"
    
    echo "👤 Checking for admin user..."
    python3 -c "
import uuid
from app import create_app, db
from app.models import User

app = create_app()
with app.app_context():
    # Check if admin exists
    admin_email = 'admin@troupe.academy'
    existing_admin = User.query.filter_by(email=admin_email).first()
    
    if existing_admin:
        print(f'✅ Admin user already exists: {admin_email}')
    else:
        print(f'📝 Creating admin user: {admin_email}')
        
        # Create admin user
        admin = User(
            id=f'admin_{uuid.uuid4().hex[:8]}',
            email=admin_email,
            account_type='admin',
            profile={
                'name': 'System Administrator',
                'role': 'Super Admin',
                'permissions': ['all'],
                'created_by': 'startup_script'
            },
            is_active=True
        )
        
        # Set password
        admin.set_password('admin123')
        
        # Save to database
        try:
            db.session.add(admin)
            db.session.commit()
            print(f'✅ Admin created successfully!')
            print(f'📧 Email: {admin_email}')
            print(f'🔑 Password: admin123')
            print(f'⚠️  Please change this password immediately!')
        except Exception as e:
            print(f'❌ Failed to create admin: {e}')
            db.session.rollback()
" || echo "⚠️  Admin check skipped"
fi

echo "🌟 Starting Flask application with Gunicorn..."
# Ensure we're in the correct directory and Python can find the app module
cd /app
export PYTHONPATH=/app:$PYTHONPATH

exec gunicorn \
    --bind 0.0.0.0:5000 \
    --workers 2 \
    --worker-class gthread \
    --threads 4 \
    --timeout 120 \
    --keep-alive 2 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    --log-level info \
    --access-logfile - \
    --error-logfile - \
    wsgi:app