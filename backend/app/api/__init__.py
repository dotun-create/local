from flask import Blueprint, request
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

api_bp = Blueprint('api', __name__)
logger.info("API Blueprint created")

# Note: CORS handled at app level in __init__.py

# Add a test route to verify API blueprint works
@api_bp.route('/test', methods=['GET'])
def test_route():
    logger.info("Test route called")
    return {'message': 'API blueprint is working', 'status': 'success'}

# Debug route to list all available routes
@api_bp.route('/debug/routes', methods=['GET'])
def debug_routes():
    from flask import current_app
    routes = []
    for rule in current_app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'rule': str(rule)
        })
    return {'routes': routes}

# Import all route modules to register them
try:
    logger.info("Importing API modules...")
    from app.api import auth, users, courses, modules, lessons, quizzes, sessions, enrollments, notifications, payments, analytics, availability, guardian_auth, admin_creation, recurring_availability, admin, credits, invoices, credits_add, environment, student_tasks, system_settings, earnings, database_migration, health, zoom, zoom_webhooks, zoom_webhook_management, chat, admin_password_management, updates, bulk_import, guardian_requests
    # Import initial_admin separately with explicit error handling
    try:
        from app.api import initial_admin
        logger.info("initial_admin module imported successfully")
        # Verify the routes were registered
        logger.info(f"initial_admin module has: {dir(initial_admin)}")
    except ImportError as ie:
        logger.error(f"ImportError for initial_admin module: {ie}")
    except Exception as e:
        logger.error(f"Failed to import initial_admin module: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
    logger.info("All API modules imported successfully")
except Exception as e:
    logger.error(f"Error importing API modules: {e}")

# Register admin creation blueprint
try:
    from app.api.admin_creation import admin_creation_bp
    api_bp.register_blueprint(admin_creation_bp, url_prefix='/admin-creation')
    logger.info("Admin creation blueprint registered")
except Exception as e:
    logger.error(f"Error registering admin creation blueprint: {e}")

# Register recurring availability blueprint  
try:
    from app.api.recurring_availability import recurring_availability_bp
    api_bp.register_blueprint(recurring_availability_bp)
    logger.info("Recurring availability blueprint registered")
except Exception as e:
    logger.error(f"Error registering recurring availability blueprint: {e}")

# Register chat blueprint
try:
    from app.api.chat import chat_bp
    api_bp.register_blueprint(chat_bp, url_prefix='/chat')
    logger.info("Chat blueprint registered")
except Exception as e:
    logger.error(f"Error registering chat blueprint: {e}")

# Register updates blueprint for WebSocket fallback
try:
    from app.api.updates import bp as updates_bp
    api_bp.register_blueprint(updates_bp)
    logger.info("Updates blueprint registered")
except Exception as e:
    logger.error(f"Error registering updates blueprint: {e}")

# Register guardian requests blueprint
try:
    from app.api.guardian_requests import guardian_requests_bp
    api_bp.register_blueprint(guardian_requests_bp)
    logger.info("Guardian requests blueprint registered")
except Exception as e:
    logger.error(f"Error registering guardian requests blueprint: {e}")

# System settings and earnings are now registered with api_bp directly in their respective files