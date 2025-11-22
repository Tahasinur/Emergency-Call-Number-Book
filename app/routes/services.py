"""
Public service routes
"""

from flask import Blueprint, request, jsonify

from app.database import get_db_connection

bp = Blueprint('services', __name__, url_prefix='/api')


@bp.route('/services', methods=['GET'])
def get_services():
    """Get active emergency services"""
    search = request.args.get('search', '')
    category = request.args.get('category', '')

    conn = get_db_connection()

    query = "SELECT * FROM Emergency_Contacts WHERE is_active = 1"
    params = []

    if search:
        query += " AND (service_name LIKE ? OR phone_number LIKE ? OR category LIKE ?)"
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param])

    if category:
        query += " AND category = ?"
        params.append(category)

    query += " ORDER BY service_name ASC"

    services = conn.execute(query, params).fetchall()
    conn.close()

    return jsonify([dict(service) for service in services]), 200


@bp.route('/services/<int:service_id>', methods=['GET'])
def get_service_detail(service_id):
    """Get single service details"""
    conn = get_db_connection()
    service = conn.execute("""
        SELECT * FROM Emergency_Contacts WHERE contact_id = ? AND is_active = 1
    """, (service_id,)).fetchone()
    conn.close()

    if not service:
        return jsonify({'error': 'Service not found'}), 404

    return jsonify(dict(service)), 200


@bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all service categories"""
    conn = get_db_connection()
    categories = conn.execute("""
        SELECT DISTINCT category FROM Emergency_Contacts WHERE is_active = 1 ORDER BY category
    """).fetchall()
    conn.close()

    return jsonify([cat['category'] for cat in categories if cat['category']]), 200
