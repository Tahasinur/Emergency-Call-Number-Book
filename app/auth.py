"""
Authentication utilities and decorators
"""

from functools import wraps
from flask import request, jsonify, current_app
import jwt


def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user_id = data['user_id']
            current_user_role = data['role']
        except Exception:
            return jsonify({'error': 'Token is invalid'}), 401

        return f(current_user_id, current_user_role, *args, **kwargs)

    return decorated


def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated(current_user_id, current_user_role, *args, **kwargs):
        if current_user_role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(current_user_id, current_user_role, *args, **kwargs)
    return decorated
