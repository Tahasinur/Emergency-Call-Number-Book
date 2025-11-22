"""
Database connection and utility functions
"""

import sqlite3
from config import Config


def get_db_connection():
    """Create database connection"""
    conn = sqlite3.connect(Config.DATABASE)
    conn.row_factory = sqlite3.Row
    return conn
