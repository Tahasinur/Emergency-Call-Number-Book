"""
Emergency Hotline System - Application Factory
"""

from flask import Flask
from flask_cors import CORS
import os


def create_app(config_name='default'):
    """Application factory pattern"""
    app = Flask(__name__,
                static_folder='static',
                template_folder='templates')

    # Configure app and register routes
    from config import config
    app.config.from_object(config[config_name])
    CORS(app)

    from app.routes import auth, services, admin, chat, activities
    app.register_blueprint(auth.bp)
    app.register_blueprint(services.bp)
    app.register_blueprint(admin.bp)
    app.register_blueprint(chat.bp)
    app.register_blueprint(activities.bp)

    # Page routes
    from flask import send_from_directory

    @app.route('/')
    @app.route('/login')
    def login_page():
        return send_from_directory(app.template_folder, 'login.html')

    @app.route('/register')
    def register_page():
        return send_from_directory(app.template_folder, 'register.html')

    @app.route('/dashboard')
    def dashboard_page():
        return send_from_directory(app.template_folder, 'dashboard.html')

    @app.route('/helper')
    def helper_page():
        return send_from_directory(app.template_folder, 'helper.html')

    @app.route('/admin')
    def admin_page():
        return send_from_directory(app.template_folder, 'admin.html')

    # Simple health check endpoint
    @app.route('/api/health')
    def health():
        import datetime
        return {'status': 'healthy', 'timestamp': datetime.datetime.now().isoformat()}

    @app.errorhandler(404)
    def not_found(error):
        from flask import request
        # Return JSON for API requests, otherwise let Flask handle it
        if request.path.startswith('/api/'):
            return {'error': 'Not found'}, 404
        return error

    @app.errorhandler(500)
    def internal_error(error):
        return {'error': 'Internal server error'}, 500

    return app
