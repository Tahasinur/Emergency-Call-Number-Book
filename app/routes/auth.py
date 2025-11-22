"""
Authentication routes
"""

from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import jwt
import datetime

from app.database import get_db_connection
from app.auth import token_required

bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@bp.route('/register', methods=['POST'])
def register():
    """Register new user"""
    data = request.get_json()

    required_fields = ['username', 'email', 'password']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if username exists
        existing_user = cursor.execute(
            "SELECT username FROM Users WHERE username = ?",
            (data['username'],)
        ).fetchone()
        if existing_user:
            return jsonify({'error': f'Username "{data["username"]}" already exists'}), 409

        # Check if email exists
        existing_email = cursor.execute(
            "SELECT email FROM Users WHERE email = ?",
            (data['email'],)
        ).fetchone()
        if existing_email:
            return jsonify({'error': f'Email "{data["email"]}" already exists'}), 409

        hashed_password = generate_password_hash(data['password'])
        cursor.execute("""
            INSERT INTO Users (username, email, password_hash, role)
            VALUES (?, ?, ?, ?)
        """, (data['username'], data['email'], hashed_password, data.get('role', 'user')))

        user_id = cursor.lastrowid

        conn.commit()

        return jsonify({
            'message': 'User registered successfully',
            'user_id': user_id
        }), 201

    except sqlite3.IntegrityError as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 409
    finally:
        conn.close()


@bp.route('/login', methods=['POST'])
def login():
    """User login"""
    from flask import current_app
    data = request.get_json()

    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Missing credentials'}), 400

    conn = get_db_connection()

    user = conn.execute("""
        SELECT * FROM Users WHERE username = ? AND is_active = 1
    """, (data['username'],)).fetchone()

    if not user or not check_password_hash(user['password_hash'], data['password']):
        conn.close()
        return jsonify({'error': 'Invalid credentials'}), 401

    conn.close()

    # Generate JWT token
    token = jwt.encode({
        'user_id': user['user_id'],
        'role': user['role'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, current_app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({
        'token': token,
        'user': {
            'user_id': user['user_id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role']
        }
    }), 200


@bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user_id, current_user_role):
    """User logout"""
    return jsonify({'message': 'Logged out successfully'}), 200
