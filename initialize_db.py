"""
This script creates the database and all necessary tables. This will delete any existing database file.
"""

import sqlite3
import os

def create_database():
    """Create the SQLite database with all tables and indexes"""

    db_path = os.path.join(os.path.dirname(__file__), 'emergency_hotline.db')

    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"[INFO] Removed existing database at: {db_path}")

    sql_script_path = os.path.join(os.path.dirname(__file__), 'docs', 'create_database.sql')
    with open(sql_script_path, 'r', encoding='utf-8') as f:
        sql_script = f.read()

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.executescript(sql_script)
        conn.commit()
        print(f"[SUCCESS] Database created successfully at: {db_path}")

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()

        print(f"\n[SUCCESS] Created {len(tables)} tables:")
        for table in tables:
            print(f"  - {table[0]}")

        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' ORDER BY name")
        indexes = cursor.fetchall()
        print(f"\n[SUCCESS] Created {len(indexes)} indexes")

        cursor.execute("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name")
        triggers = cursor.fetchall()
        print(f"[SUCCESS] Created {len(triggers)} triggers")

    except sqlite3.Error as e:
        print(f"[ERROR] Error creating database: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    create_database()
