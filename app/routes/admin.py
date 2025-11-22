"""
Admin routes for service and user management
"""

from flask import Blueprint, request, jsonify
import sqlite3
import os
from werkzeug.utils import secure_filename

from app.database import get_db_connection
from app.auth import token_required, admin_required

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

# Allowed file extensions for images
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'svg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


"""Admin routes for service and user management"""
@bp.route('/services', methods=['GET'])
@token_required
@admin_required
def get_all_services_admin(current_user_id, current_user_role):
    """Get all services (including inactive) for admin"""
    conn = get_db_connection()
    services = conn.execute("""
        SELECT * FROM Emergency_Contacts ORDER BY service_name ASC
    """).fetchall()
    conn.close()

    return jsonify([dict(service) for service in services]), 200


@bp.route('/services', methods=['POST'])
@token_required
@admin_required
def create_service(current_user_id, current_user_role):
    """Create new emergency service"""
    # Check if request has file upload
    if 'image' in request.files:
        return create_service_with_image(current_user_id, current_user_role)

    data = request.get_json()

    required_fields = ['service_name', 'phone_number', 'category']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO Emergency_Contacts
        (service_name, phone_number, category, description)
        VALUES (?, ?, ?, ?)
    """, (data['service_name'], data['phone_number'], data['category'],
          data.get('description', '')))

    service_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        'message': 'Service created successfully',
        'contact_id': service_id
    }), 201

def create_service_with_image(current_user_id, current_user_role):
    """Create service with image upload"""
    # Get form data
    service_name = request.form.get('service_name')
    phone_number = request.form.get('phone_number')
    category = request.form.get('category')
    description = request.form.get('description', '')
    is_active = request.form.get('is_active', '1')

    if not all([service_name, phone_number, category]):
        return jsonify({'error': 'Missing required fields'}), 400

    image_path = None

    # Handle image upload
    if 'image' in request.files:
        file = request.files['image']
        if file.filename != '' and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            # Add timestamp to avoid filename collisions
            import time
            timestamp = str(int(time.time()))
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{timestamp}{ext}"

            # Save to static/assets directory
            from flask import current_app
            upload_path = os.path.join(current_app.root_path, 'static', 'assets', filename)
            file.save(upload_path)
            image_path = f"/static/assets/{filename}"

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO Emergency_Contacts
        (service_name, phone_number, category, description, image_path, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (service_name, phone_number, category, description, image_path, is_active))

    service_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        'message': 'Service created successfully',
        'contact_id': service_id,
        'image_path': image_path
    }), 201


@bp.route('/services/<int:service_id>', methods=['PUT'])
@token_required
@admin_required
def update_service(current_user_id, current_user_role, service_id):
    """Update emergency service"""
    # Check if request has file upload
    if 'image' in request.files:
        return update_service_with_image(current_user_id, current_user_role, service_id)

    data = request.get_json()

    conn = get_db_connection()

    service = conn.execute("SELECT * FROM Emergency_Contacts WHERE contact_id = ?", (service_id,)).fetchone()
    if not service:
        conn.close()
        return jsonify({'error': 'Service not found'}), 404

    conn.execute("""
        UPDATE Emergency_Contacts
        SET service_name = ?, phone_number = ?, category = ?, description = ?, is_active = ?
        WHERE contact_id = ?
    """, (data.get('service_name', service['service_name']),
          data.get('phone_number', service['phone_number']),
          data.get('category', service['category']),
          data.get('description', service['description']),
          data.get('is_active', service['is_active']),
          service_id))

    conn.commit()
    conn.close()

    return jsonify({'message': 'Service updated successfully'}), 200

def update_service_with_image(current_user_id, current_user_role, service_id):
    """Update service with image upload"""
    conn = get_db_connection()

    service = conn.execute("SELECT * FROM Emergency_Contacts WHERE contact_id = ?", (service_id,)).fetchone()
    if not service:
        conn.close()
        return jsonify({'error': 'Service not found'}), 404

    # Get form data
    service_name = request.form.get('service_name', service['service_name'])
    phone_number = request.form.get('phone_number', service['phone_number'])
    category = request.form.get('category', service['category'])
    description = request.form.get('description', service['description'])
    is_active = request.form.get('is_active', service['is_active'])
    image_path = service['image_path']

    # Handle image upload
    if 'image' in request.files:
        file = request.files['image']
        if file.filename != '' and allowed_file(file.filename):
            # Delete old image if exists
            if image_path:
                from flask import current_app
                old_image = os.path.join(current_app.root_path, image_path.lstrip('/'))
                if os.path.exists(old_image):
                    os.remove(old_image)

            filename = secure_filename(file.filename)
            # Add timestamp to avoid filename collisions
            import time
            timestamp = str(int(time.time()))
            name, ext = os.path.splitext(filename)
            filename = f"{name}_{timestamp}{ext}"

            # Save to static/assets directory
            from flask import current_app
            upload_path = os.path.join(current_app.root_path, 'static', 'assets', filename)
            file.save(upload_path)
            image_path = f"/static/assets/{filename}"

    conn.execute("""
        UPDATE Emergency_Contacts
        SET service_name = ?, phone_number = ?, category = ?, description = ?, is_active = ?, image_path = ?
        WHERE contact_id = ?
    """, (service_name, phone_number, category, description, is_active, image_path, service_id))

    conn.commit()
    conn.close()

    return jsonify({
        'message': 'Service updated successfully',
        'image_path': image_path
    }), 200


@bp.route('/services/<int:service_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_service(current_user_id, current_user_role, service_id):
    """Delete emergency service"""
    conn = get_db_connection()
    conn.execute("DELETE FROM Emergency_Contacts WHERE contact_id = ?", (service_id,))
    conn.commit()
    conn.close()

    return jsonify({'message': 'Service deleted successfully'}), 200


# User management endpoints
@bp.route('/users', methods=['GET'])
@token_required
@admin_required
def get_all_users(current_user_id, current_user_role):
    """Get all users"""
    conn = get_db_connection()
    users = conn.execute("""
        SELECT user_id, username, email, role, is_active, created_at
        FROM Users
        ORDER BY created_at DESC
    """).fetchall()
    conn.close()

    return jsonify([dict(user) for user in users]), 200


@bp.route('/users/<int:user_id>/role', methods=['PUT'])
@token_required
@admin_required
def update_user_role(current_user_id, current_user_role, user_id):
    """Update user role"""
    data = request.get_json()

    if 'role' not in data:
        return jsonify({'error': 'Role is required'}), 400

    if data['role'] not in ['user', 'helper', 'admin']:
        return jsonify({'error': 'Invalid role'}), 400

    conn = get_db_connection()
    conn.execute("UPDATE Users SET role = ? WHERE user_id = ?", (data['role'], user_id))
    conn.commit()
    conn.close()

    return jsonify({'message': 'User role updated successfully'}), 200


@bp.route('/users/count', methods=['GET'])
@token_required
@admin_required
def get_users_count(current_user_id, current_user_role):
    """Get total users count"""
    conn = get_db_connection()
    count = conn.execute("SELECT COUNT(*) as count FROM Users").fetchone()
    conn.close()

    return jsonify({'total_users': count['count']}), 200


@bp.route('/calls', methods=['GET'])
@token_required
@admin_required
def admin_get_calls(current_user_id, current_user_role):
    """Admin view: retrieve call history with optional filters"""
    # Query params: user_id, limit, offset
    user_id = request.args.get('user_id')
    try:
        limit = int(request.args.get('limit', 50))
    except (ValueError, TypeError):
        limit = 50

    try:
        offset = int(request.args.get('offset', 0))
    except (ValueError, TypeError):
        offset = 0

    conn = get_db_connection()

    base_sql = """
        SELECT ch.*, u.username as user_username, ec.service_name, h.username as helper_username
        FROM Call_History ch
        LEFT JOIN Users u ON ch.user_id = u.user_id
        LEFT JOIN Emergency_Contacts ec ON ch.contact_id = ec.contact_id
        LEFT JOIN Users h ON ch.helper_id = h.user_id
    """

    params = []
    if user_id:
        base_sql += " WHERE ch.user_id = ?"
        params.append(user_id)

    base_sql += " ORDER BY ch.created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = conn.execute(base_sql, params).fetchall()
    conn.close()

    return jsonify([dict(r) for r in rows]), 200
