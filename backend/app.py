#!/usr/bin/env python3
"""
ORMS Backend API Application
Entry point for the Flask application
"""

# Load environment variables BEFORE any other imports
from dotenv import load_dotenv
import os

# Load environment-specific .env file first, then fallback to .env
env = os.getenv('FLASK_ENV', 'development')
if env == 'development':
    load_dotenv('.env.development')
load_dotenv()  # Fallback to .env for any missing variables
import click
from flask_migrate import Migrate
from flask_socketio import SocketIO
from app import create_app, db

# Create Flask application
app = create_app(os.getenv('FLASK_ENV', 'development'))

# Initialize Flask-Migrate
migrate = Migrate(app, db)

# Initialize SocketIO for WebSocket support
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Initialize WebSocket service
from app.services.websocket_service import websocket_service
websocket_service.init_app(socketio)

@app.cli.command()
def init_db():
    """Initialize the database."""
    db.create_all()
    print('Database initialized!')

@app.cli.command()
def reset_db():
    """Reset the database."""
    db.drop_all()
    db.create_all()
    print('Database reset!')

@app.cli.command()
@click.option('--email', prompt=True, help='Admin email address')
@click.option('--password', prompt=True, hide_input=True, help='Admin password')
@click.option('--name', default='System Administrator', help='Admin full name')
def create_admin(email, password, name):
    """Create an admin user."""
    import uuid
    from app.models import User
    
    # Check if admin already exists
    existing_admin = User.query.filter_by(email=email.lower()).first()
    if existing_admin:
        print(f'❌ User with email {email} already exists!')
        return
    
    # Create admin user
    admin_user = User(
        id=f"admin_{uuid.uuid4().hex[:8]}",
        email=email.lower(),
        account_type='admin',
        profile={
            'name': name,
            'role': 'System Administrator',
            'permissions': ['all'],
            'created_by': 'system'
        },
        is_active=True
    )
    
    admin_user.set_password(password)
    
    try:
        db.session.add(admin_user)
        db.session.commit()
        
        print('✅ Admin user created successfully!')
        print(f'📧 Email: {email}')
        print(f'👤 Name: {name}')
        print(f'🆔 User ID: {admin_user.id}')
        print(f'🔑 Account Type: {admin_user.account_type}')
        
    except Exception as e:
        db.session.rollback()
        print(f'❌ Error creating admin user: {str(e)}')

@app.cli.command()
def seed_db():
    """Initialize clean database with admin user only."""
    import uuid
    from app.models import User
    
    print("🌱 Initializing clean database...")
    
    # Clear existing data
    db.drop_all()
    db.create_all()
    
    # Create admin user only - no sample data
    admin = User(
        id=f"admin_{uuid.uuid4().hex[:8]}",
        email="admin@troupe.academy",
        account_type='admin',
        profile={
            'name': 'System Administrator', 
            'role': 'Super Admin',
            'permissions': ['all'],
            'created_by': 'seed_command'
        },
        is_active=True
    )
    admin.set_password('admin123')
    db.session.add(admin)
    
    db.session.commit()
    print('✅ Clean database initialized successfully!')
    print('🔐 Admin login: admin@troupe.academy / admin123')
    print('📝 Note: No sample data created - database is production-ready')

if __name__ == '__main__':
    # Use SocketIO run instead of regular Flask run for WebSocket support
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)