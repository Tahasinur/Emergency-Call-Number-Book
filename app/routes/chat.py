"""
Chat system routes
"""

from flask import Blueprint, request, jsonify
import sqlite3

from app.database import get_db_connection
from app.auth import token_required

bp = Blueprint('chat', __name__, url_prefix='/api/chat')


@bp.route('/session', methods=['POST'])
@token_required
def create_chat_session(current_user_id, current_user_role):
    """Create a new chat session"""
    if current_user_role not in ['user', 'admin']:
        return jsonify({'error': 'Only users can create chat sessions'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        existing = conn.execute("""
            SELECT session_id FROM Chat_Sessions
            WHERE user_id = ? AND status IN ('waiting', 'active')
        """, (current_user_id,)).fetchone()

        if existing:
            conn.close()
            return jsonify({
                'session_id': existing['session_id'],
                'message': 'Active session already exists'
            }), 200

        cursor.execute("""
            INSERT INTO Chat_Sessions (user_id, status) VALUES (?, 'waiting')
        """, (current_user_id,))

        session_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            'session_id': session_id,
            'message': 'Chat session created successfully'
        }), 201

    except sqlite3.Error:
        conn.rollback()
        conn.close()
        return jsonify({'error': 'Failed to create chat session'}), 500


@bp.route('/sessions/waiting', methods=['GET'])
@token_required
def get_waiting_sessions(current_user_id, current_user_role):
    """Get waiting chat sessions"""
    if current_user_role not in ['helper', 'admin']:
        return jsonify({'error': 'Only helpers can view waiting sessions'}), 403

    conn = get_db_connection()

    try:
        sessions = conn.execute("""
            SELECT cs.session_id, cs.user_id, cs.created_at, cs.updated_at, cs.status, u.username,
                   (SELECT COUNT(*) FROM Chat_Messages WHERE session_id = cs.session_id) as message_count
            FROM Chat_Sessions cs
            JOIN Users u ON cs.user_id = u.user_id
            WHERE cs.status = 'waiting'
            ORDER BY cs.created_at ASC
        """).fetchall()
        conn.close()

        return jsonify([dict(s) for s in sessions]), 200

    except sqlite3.Error:
        conn.close()
        return jsonify({'error': 'Database error occurred'}), 500


@bp.route('/session/<int:session_id>/assign', methods=['POST'])
@token_required
def assign_session(current_user_id, current_user_role, session_id):
    """Assign session to helper"""
    if current_user_role not in ['helper', 'admin']:
        return jsonify({'error': 'Only helpers can assign sessions'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        session = conn.execute("""
            SELECT * FROM Chat_Sessions WHERE session_id = ? AND status = 'waiting'
        """, (session_id,)).fetchone()

        if not session:
            conn.close()
            return jsonify({'error': 'Session not found or already assigned'}), 404

        cursor.execute("""
            UPDATE Chat_Sessions
            SET helper_id = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
            WHERE session_id = ? AND status = 'waiting'
        """, (current_user_id, session_id))

        if cursor.rowcount == 0:
            conn.rollback()
            conn.close()
            return jsonify({'error': 'Session was already assigned to another helper'}), 409

        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Session assigned successfully',
            'session_id': session_id
        }), 200

    except sqlite3.Error:
        conn.rollback()
        conn.close()
        return jsonify({'error': 'Database error while assigning session'}), 500


@bp.route('/sessions/my', methods=['GET'])
@token_required
def get_my_sessions(current_user_id, current_user_role):
    """Get user's/helper's chat sessions"""
    conn = get_db_connection()

    try:
        if current_user_role == 'user':
            sessions = conn.execute("""
                SELECT cs.*, h.username as helper_name
                FROM Chat_Sessions cs
                LEFT JOIN Users h ON cs.helper_id = h.user_id
                WHERE cs.user_id = ? AND cs.status IN ('waiting', 'active')
                ORDER BY cs.updated_at DESC
            """, (current_user_id,)).fetchall()
        elif current_user_role == 'helper':
            sessions = conn.execute("""
                SELECT cs.*, u.username as username,
                       (SELECT COUNT(*) FROM Chat_Messages WHERE session_id = cs.session_id) as message_count
                FROM Chat_Sessions cs
                JOIN Users u ON cs.user_id = u.user_id
                WHERE cs.helper_id = ? AND cs.status = 'active'
                ORDER BY cs.updated_at DESC
            """, (current_user_id,)).fetchall()
        else:
            conn.close()
            return jsonify([]), 200

        conn.close()
        return jsonify([dict(s) for s in sessions]), 200
    except sqlite3.Error:
        conn.close()
        return jsonify({'error': 'Database error occurred'}), 500


@bp.route('/messages/<int:session_id>', methods=['GET'])
@token_required
def get_messages(current_user_id, current_user_role, session_id):
    """Get messages for a chat session"""
    after_timestamp = request.args.get('after', None)

    conn = get_db_connection()

    session = conn.execute("""
        SELECT * FROM Chat_Sessions WHERE session_id = ?
    """, (session_id,)).fetchone()

    if not session:
        conn.close()
        return jsonify({'error': 'Session not found'}), 404

    # Authorization check
    is_authorized = False

    if current_user_role == 'user' and session['user_id'] == current_user_id:
        is_authorized = True
    elif current_user_role == 'helper' and (session['status'] == 'waiting' or session['helper_id'] == current_user_id):
        is_authorized = True
    elif current_user_role == 'admin':
        is_authorized = True

    if not is_authorized:
        conn.close()
        return jsonify({'error': 'Unauthorized'}), 403

    # Get messages
    if after_timestamp:
        messages = conn.execute("""
            SELECT cm.*, u.username as sender_name
            FROM Chat_Messages cm
            JOIN Users u ON cm.sender_id = u.user_id
            WHERE cm.session_id = ? AND cm.created_at > ?
            ORDER BY cm.created_at ASC
        """, (session_id, after_timestamp)).fetchall()
    else:
        messages = conn.execute("""
            SELECT cm.*, u.username as sender_name
            FROM Chat_Messages cm
            JOIN Users u ON cm.sender_id = u.user_id
            WHERE cm.session_id = ?
            ORDER BY cm.created_at ASC
        """, (session_id,)).fetchall()

    conn.close()

    return jsonify({
        'messages': [dict(m) for m in messages],
        'session_status': session['status'],
        'total_count': len(messages),
        'has_more': False
    }), 200


@bp.route('/messages', methods=['POST'])
@token_required
def send_message(current_user_id, current_user_role):
    """Send a message in a chat session"""
    data = request.get_json()

    if 'session_id' not in data or 'message' not in data:
        return jsonify({'error': 'Missing required fields'}), 400

    session_id = data['session_id']
    message = data['message'].strip()

    if not message or len(message) > 2000:
        return jsonify({'error': 'Message must be between 1 and 2000 characters'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify session exists
        session = conn.execute("""
            SELECT * FROM Chat_Sessions WHERE session_id = ?
        """, (session_id,)).fetchone()

        if not session:
            conn.close()
            return jsonify({'error': 'Session not found'}), 404

        # Authorization check
        is_authorized = False

        if current_user_role == 'user' and session['user_id'] == current_user_id:
            is_authorized = True
        elif current_user_role == 'helper' and session['helper_id'] == current_user_id:
            is_authorized = True
        elif current_user_role == 'admin':
            is_authorized = True

        if not is_authorized:
            conn.close()
            return jsonify({'error': 'Unauthorized to send message in this session'}), 403

        # Insert message
        cursor.execute("""
            INSERT INTO Chat_Messages (session_id, sender_id, message)
            VALUES (?, ?, ?)
        """, (session_id, current_user_id, message))

        message_id = cursor.lastrowid

        # Update session timestamp
        cursor.execute("""
            UPDATE Chat_Sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = ?
        """, (session_id,))

        conn.commit()
        conn.close()

        return jsonify({
            'message_id': message_id,
            'message': 'Message sent successfully'
        }), 201

    except sqlite3.Error:
        conn.rollback()
        conn.close()
        return jsonify({'error': 'Failed to send message'}), 500


@bp.route('/session/<int:session_id>/close', methods=['POST'])
@token_required
def close_session(current_user_id, current_user_role, session_id):
    """Close a chat session and permanently delete it"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify session exists
        session = conn.execute("""
            SELECT * FROM Chat_Sessions WHERE session_id = ?
        """, (session_id,)).fetchone()

        if not session:
            conn.close()
            return jsonify({'error': 'Session not found'}), 404

        # Authorization check
        is_authorized = False
        if current_user_role == 'user' and session['user_id'] == current_user_id:
            is_authorized = True
        elif current_user_role == 'helper' and session['helper_id'] == current_user_id:
            is_authorized = True
        elif current_user_role == 'admin':
            is_authorized = True

        if not is_authorized:
            conn.close()
            return jsonify({'error': 'Unauthorized to close this session'}), 403

        # Delete messages first
        cursor.execute("""
            DELETE FROM Chat_Messages WHERE session_id = ?
        """, (session_id,))

        messages_deleted = cursor.rowcount

        # Delete session
        cursor.execute("""
            DELETE FROM Chat_Sessions WHERE session_id = ?
        """, (session_id,))

        if cursor.rowcount == 0:
            conn.rollback()
            conn.close()
            return jsonify({'error': 'Failed to delete session'}), 500

        conn.commit()
        conn.close()

        return jsonify({
            'message': 'Session closed and permanently deleted from database',
            'session_id': session_id,
            'messages_deleted': messages_deleted
        }), 200

    except sqlite3.Error:
        conn.rollback()
        conn.close()
        return jsonify({'error': 'Database error while closing session'}), 500
