#!/usr/bin/env python3
"""
WSGI entry point for Gunicorn
This avoids the import conflicts between app.py and the app package
"""

import os
import sys

# Add the backend directory to Python path
sys.path.insert(0, '/app')

# Import the create_app function from the app package
from app import create_app

# Create the Flask application instance
application = create_app(os.getenv('FLASK_ENV', 'production'))

# Also expose as 'app' for compatibility
app = application

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)