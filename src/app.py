from flask import Flask
from flask_cors import CORS
import logging

from .config import Config
from .api.devices import devices_bp
from .api.location import location_bp

def create_app():
    """Create and configure Flask application"""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configure logging
    logging.basicConfig(
        level=getattr(logging, Config.LOG_LEVEL),
        format=Config.LOG_FORMAT
    )

    # Disable Werkzeug logging in production
    if not Config.DEBUG:
        logging.getLogger('werkzeug').disabled = True

    # Configure CORS
    CORS(app, origins=Config.CORS_ORIGINS)

    # Register blueprints
    app.register_blueprint(devices_bp, url_prefix=Config.API_PREFIX)
    app.register_blueprint(location_bp, url_prefix=Config.API_PREFIX)

    # Health check endpoint
    @app.route('/health')
    def health():
        return {'status': 'healthy', 'version': Config.APP_VERSION_NUMBER}

    # Root endpoint
    @app.route('/')
    def root():
        return {
            'name': 'Mirage API',
            'version': Config.APP_VERSION_NUMBER,
            'api_version': Config.API_VERSION
        }

    return app
