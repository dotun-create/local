#!/usr/bin/env python3
"""
Manual admin creation - Run this in Python shell or as script
"""

from app import create_app, db
from app.models import User
import uuid

# Create app context
app = create_app()

with app.app_context():
    # Initialize database
    db.create_all()
    
    # Create admin user
    admin = User(
        id=f"admin_{uuid.uuid4().hex[:8]}",
        email="admin@troupe.com",
        account_type="admin",
        profile={
            "name": "System Administrator",
            "role": "Super Admin",
            "permissions": ["all"]
        },
        is_active=True
    )
    
    # Set password
    admin.set_password("admin123")
    
    # Save to database
    db.session.add(admin)
    db.session.commit()
    
    print(f"✅ Admin created: {admin.email} (ID: {admin.id})")