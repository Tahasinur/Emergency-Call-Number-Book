# 🚨 Emergency Hotline System

Professional Flask emergency service management with JWT auth, role-based access, and real-time chat support.

## Quick Start

```bash
pip install -r requirements.txt   # If needed
python initialize_db.py           # First time only
python run.py                     # Start server
```

**URL:** http://localhost:5000 | **Admin:** `admin` / `admin123`

## Features

**Users:** Browse services, favorites, chat with helpers, responsive design
**Helpers:** Manage chat requests, assign sessions, manual refresh messaging
**Admins:** CRUD services, user role management, system monitoring

## Tech Stack

**Backend:** Flask 3.0, SQLite, JWT, Blueprint architecture
**Frontend:** Tailwind CSS, DaisyUI, Font Awesome, Vanilla JS

## Structure

```
app/
├── routes/          # auth, services, admin, chat
├── static/          # CSS, JS, assets
├── templates/       # HTML pages
├── auth.py          # JWT decorators
└── database.py      # DB helper
```

## Key Endpoints

**Public:** `/api/auth/login`, `/api/auth/register`, `/api/services`
**Auth:** `/api/favorites`
**Admin:** `/api/admin/services`, `/api/admin/users`
**Chat:** `/api/chat/session`, `/api/chat/messages`

## Database

**Tables:** Users, Emergency_Contacts, Chat_Sessions, Chat_Messages, Contact_Favorites
**Default:** Admin user + 9 emergency services

## Configuration

Edit `config.py`:

```python
SECRET_KEY = 'your-secret-key'  # Change in production
DATABASE = 'emergency_hotline.db'
```

## Production

```bash
# Security: Change admin password, update SECRET_KEY, use PostgreSQL, enable HTTPS
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 "run:app"
```

## Troubleshooting

| Issue              | Fix                       |
| ------------------ | ------------------------- |
| Database not found | `python initialize_db.py` |
| Module error       | Activate venv             |
| Port in use        | Change port in `run.py`   |
| Token invalid      | Clear localStorage        |

**Version:** 3.0 | **Status:** Production Ready ✅
