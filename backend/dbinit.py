import os
os.environ['FLASK_ENV'] = 'production'
from dotenv import load_dotenv
load_dotenv('.env.production')
from app import create_app, db
app = create_app('production')
with app.app_context():
    db.create_all()
    print('Database initialized successfully!')
