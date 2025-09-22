# Production Dockerfile for TroupeDev Backend
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching (Step 3: Install Dependencies)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables for production
ENV PYTHONPATH=/app
ENV FLASK_APP=wsgi.py
ENV FLASK_ENV=production
ENV FLASK_DEBUG=0

# Expose port 5000
EXPOSE 5000

# Create startup script that emulates the manual steps
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
echo "Starting TroupeDev Backend Production Container..."\n\
\n\
# Step 4: Initialize Database\n\
echo "Step 4: Initializing Database..."\n\
python -c "\n\
import os\n\
os.environ['\''FLASK_ENV'\''] = '\''production'\''\n\
from dotenv import load_dotenv\n\
load_dotenv('\''.env.production'\'')\n\
from app import create_app, db\n\
app = create_app('\''production'\'')\n\
with app.app_context():\n\
    db.create_all()\n\
    print('\''Database initialized successfully!'\'')\n\
"\n\
\n\
echo "Database initialization completed."\n\
\n\
# Step 5: Start Production Server\n\
echo "Step 5: Starting Production Server..."\n\
echo "Starting Gunicorn with 4 workers on port 5000..."\n\
exec gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app --timeout 60\n\
' > /app/start-production.sh && chmod +x /app/start-production.sh

# Health check (Verification step)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/api/test || exit 1

# Default command - run the startup script that follows the manual steps
CMD ["./start-production.sh"]