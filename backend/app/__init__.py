from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_marshmallow import Marshmallow
import logging
from logging.handlers import RotatingFileHandler
import os
from app.cors_config import get_cors_origin, get_allowed_headers

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
cors = CORS()
jwt = JWTManager()
bcrypt = Bcrypt()
ma = Marshmallow()
socketio = None

def create_app(config_name='default'):
    """Application factory pattern"""
    from config import config
    
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Configure session for admin creation
    app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.permanent_session_lifetime = 3600  # 1 hour session
    
    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Note: CORS configured manually in after_request handler below
    # cors.init_app(app)
    
    jwt.init_app(app)
    bcrypt.init_app(app)
    ma.init_app(app)
    
    # Configure logging
    if not app.debug and not app.testing:
        if not os.path.exists('logs'):
            os.mkdir('logs')
        file_handler = RotatingFileHandler('logs/orms.log', maxBytes=10240000, backupCount=10)
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('ORMS API startup')
    
    # Register blueprints
    app.logger.info("Registering API blueprint...")
    from app.api import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    app.logger.info("API blueprint registered successfully")
    
    # Handle CORS preflight requests
    @app.before_request
    def handle_preflight():
        from flask import request
        if request.method == "OPTIONS":
            from flask import make_response
            res = make_response()

            cors_origin = get_cors_origin(request)
            if cors_origin:
                res.headers['Access-Control-Allow-Origin'] = cors_origin
                res.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,PATCH,OPTIONS'
                res.headers['Access-Control-Allow-Headers'] = get_allowed_headers()
                res.headers['Access-Control-Allow-Credentials'] = 'true'

            return res

    # Add CORS headers to all non-OPTIONS responses
    @app.after_request
    def after_request(response):
        from flask import request
        # Only add headers if not already handled by preflight
        if request.method != "OPTIONS":
            cors_origin = get_cors_origin(request)
            if cors_origin:
                response.headers['Access-Control-Allow-Origin'] = cors_origin
                response.headers['Access-Control-Allow-Headers'] = get_allowed_headers()
                response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,PATCH,OPTIONS'
                response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    # Add a simple health check route
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'message': 'ORMS API is running'}
    
    # Serve uploaded files
    @app.route('/uploads/<filename>')
    def uploaded_file(filename):
        from flask import send_from_directory
        upload_folder = app.config.get('UPLOAD_FOLDER', 'uploads')
        return send_from_directory(upload_folder, filename)
    
    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {'error': 'Token has expired'}, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {'error': 'Invalid token'}, 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {'error': 'Authorization token is missing'}, 401
    
    # Create upload folder if it doesn't exist
    upload_folder = app.config.get('UPLOAD_FOLDER', 'uploads')
    if not os.path.exists(upload_folder):
        os.makedirs(upload_folder)
    
    # Initialize SocketIO for real-time chat (with graceful degradation)
    global socketio
    try:
        from app.services.chat_socket_service import init_socketio
        socketio = init_socketio(app)
        app.logger.info("SocketIO initialized for chat system")
    except ImportError as e:
        app.logger.warning(f"SocketIO dependencies not available: {e}")
        socketio = None
    except Exception as e:
        app.logger.error(f"Failed to initialize SocketIO: {e}")
        socketio = None

    # Initialize AI session processor (with graceful degradation)
    with app.app_context():
        ai_enabled = os.getenv('AI_SESSION_PROCESSOR_ENABLED', 'false').lower() == 'true'
        if ai_enabled:
            try:
                # Check if required dependencies are available
                import openai
                from app.services.session_processor import session_processor
                
                # Verify AI service configuration
                from app.services.ai_service import ai_service
                if not ai_service.is_configured():
                    app.logger.warning("AI service not configured, skipping session processor")
                else:
                    session_processor.start_scheduler()
                    app.logger.info("AI session processor started successfully")
            except ImportError as e:
                app.logger.warning(f"AI dependencies not available: {e}")
            except Exception as e:
                app.logger.error(f"Failed to start AI session processor: {e}")
        else:
            app.logger.info("AI session processor disabled by configuration")
        
        # Initialize session timeout service (always enabled)
        try:
            from app.services.session_timeout_service import session_timeout_service
            session_timeout_service.start_scheduler()
            app.logger.info("Session timeout service started successfully")
        except Exception as e:
            app.logger.error(f"Failed to start session timeout service: {e}")
    
    return app