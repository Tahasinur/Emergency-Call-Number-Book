"""
Favorites and call history routes
"""

from flask import Blueprint, request, jsonify
import sqlite3

from app.database import get_db_connection
from app.auth import token_required

bp = Blueprint('activities', __name__, url_prefix='/api')


# Favorites endpoints
@bp.route('/favorites', methods=['GET'])
@token_required
def get_favorites(current_user_id, current_user_role):
    """Get user's favorite services"""
    conn = get_db_connection()

    favorites = conn.execute("""
        SELECT ec.*, cf.created_at as favorited_at
        FROM Contact_Favorites cf
        JOIN Emergency_Contacts ec ON cf.contact_id = ec.contact_id
        WHERE cf.user_id = ? AND ec.is_active = 1
        ORDER BY cf.created_at DESC
    """, (current_user_id,)).fetchall()

    conn.close()
    return jsonify([dict(fav) for fav in favorites]), 200


@bp.route('/favorites', methods=['POST'])
@token_required
def add_favorite(current_user_id, current_user_role):
    """Add service to favorites"""
    data = request.get_json()

    if 'contact_id' not in data:
        return jsonify({'error': 'Missing contact_id'}), 400

    conn = get_db_connection()

    try:
        conn.execute("""
            INSERT INTO Contact_Favorites (user_id, contact_id) VALUES (?, ?)
        """, (current_user_id, data['contact_id']))
        conn.commit()
        return jsonify({'message': 'Added to favorites'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Already in favorites'}), 409
    finally:
        conn.close()


@bp.route('/favorites/<int:contact_id>', methods=['DELETE'])
@token_required
def remove_favorite(current_user_id, current_user_role, contact_id):
    """Remove service from favorites"""
    conn = get_db_connection()
    conn.execute("""
        DELETE FROM Contact_Favorites WHERE user_id = ? AND contact_id = ?
    """, (current_user_id, contact_id))

    conn.commit()
    conn.close()

    return jsonify({'message': 'Removed from favorites'}), 200



@bp.route('/calls', methods=['POST'])
@token_required
def record_call(current_user_id, current_user_role):
    """Record a call event to Call_History"""
    data = request.get_json() or {}

    # required fields: start_time (ISO) or at least caller/receiver
    caller_number = data.get('caller_number')
    receiver_number = data.get('receiver_number')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    duration = data.get('duration_seconds')
    contact_id = data.get('contact_id')
    helper_id = data.get('helper_id')
    notes = data.get('notes')

    if not (caller_number or receiver_number or start_time):
        return jsonify({'error': 'Missing call details'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO Call_History
        (user_id, contact_id, helper_id, caller_number, receiver_number, start_time, end_time, duration_seconds, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (current_user_id, contact_id, helper_id, caller_number, receiver_number, start_time, end_time, duration, notes))

    conn.commit()
    call_id = cursor.lastrowid
    conn.close()

    return jsonify({'message': 'Call recorded', 'call_id': call_id}), 201


@bp.route('/calls', methods=['GET'])
@token_required
def get_call_history(current_user_id, current_user_role):
    """Retrieve call history for the current user"""
    # optional query params: limit, offset
    try:
        limit = int(request.args.get('limit', 50))
    except ValueError:
        limit = 50

    try:
        offset = int(request.args.get('offset', 0))
    except ValueError:
        offset = 0

    conn = get_db_connection()
    rows = conn.execute("""
        SELECT ch.*, ec.service_name, u.username as helper_username
        FROM Call_History ch
        LEFT JOIN Emergency_Contacts ec ON ch.contact_id = ec.contact_id
        LEFT JOIN Users u ON ch.helper_id = u.user_id
        WHERE ch.user_id = ?
        ORDER BY ch.created_at DESC
        LIMIT ? OFFSET ?
    """, (current_user_id, limit, offset)).fetchall()

    conn.close()
    return jsonify([dict(r) for r in rows]), 200

 

