import os
from app import create_app

app = create_app('development')

if __name__ == '__main__':
    print("=" * 50)
    print("Emergency Hotline System - Backend API")
    print("=" * 50)

    if not os.path.exists('emergency_hotline.db'):
        print("\n[ERROR] Database not found!")
        print("Please run: python initialize_db.py")
        print("=" * 50)
        exit(1)

    print("\n[INFO] Starting Flask server...")
    print("[INFO] API URL: http://localhost:5000")
    print("[INFO] Login page: http://localhost:5000")
    print("[INFO] Default admin: username='admin', password='admin123'")
    print("=" * 50)
    print("\nPress CTRL+C to stop the server\n")

    app.run(debug=True, host='0.0.0.0', port=5000)
