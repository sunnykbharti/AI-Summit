"""
app.py – PostureTrek Flask application entry point.

Start-up sequence:
  1. Create Flask app + configure
  2. Initialise extensions (DB, JWT, CORS, Cache)
  3. Create all tables (safe – only creates missing ones)
  4. Auto-seed with demo data if the database is empty
  5. Register blueprints
  6. Serve React SPA from frontend/dist (production)
"""

import os
from flask import Flask, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_caching import Cache
from seed import seed

# ── paths ────────────────────────────────────────────────────────────────────
BASE_DIR      = os.path.dirname(__file__)
FRONTEND_DIST = os.path.abspath(os.path.join(BASE_DIR, '../frontend/dist'))
DB_PATH       = os.path.join(BASE_DIR, 'instance', 'postretrek.sqlite')

# ── app ──────────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder=FRONTEND_DIST, static_url_path='')

app.config.update(
    SQLALCHEMY_DATABASE_URI      = f'sqlite:///{DB_PATH}',
    SQLALCHEMY_TRACK_MODIFICATIONS = False,
    SECRET_KEY                   = os.getenv('SECRET_KEY',     'dev-secret-change-me'),
    JWT_SECRET_KEY               = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret-change-me'),
    JWT_TOKEN_LOCATION           = ['headers', 'query_string'],
    CACHE_TYPE                   = 'SimpleCache',
    CACHE_DEFAULT_TIMEOUT        = 300,
)

# ── extensions ───────────────────────────────────────────────────────────────
from models import db
db.init_app(app)

jwt   = JWTManager(app)
cache = Cache(app)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# ── database init + auto-seed ────────────────────────────────────────────────
with app.app_context():
    # Ensure instance/ directory exists for SQLite file
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    db.create_all()          # Creates tables if they don't exist yet

    # Safe migration helper for User columns in existing SQLite databases
    try:
        with db.engine.connect() as conn:
            for col_name, col_type in [
                ("gender", "VARCHAR(20) DEFAULT 'prefer_not_to_say'"),
                ("report_frequency", "VARCHAR(20) DEFAULT 'daily'"),
                ("email_reports_enabled", "BOOLEAN DEFAULT 1"),
                ("age", "INTEGER"),
                ("height", "FLOAT"),
                ("weight", "FLOAT"),
                ("fitness_goal", "VARCHAR(50) DEFAULT 'posture'"),
                ("activity_level", "VARCHAR(50) DEFAULT 'moderate'"),
                ("experience", "VARCHAR(50) DEFAULT 'intermediate'"),
            ]:
                try:
                    conn.execute(db.text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                except Exception:
                    pass
    except Exception:
        pass

    # Auto-seed with demo data when the DB is fresh (empty users table)
    try:
        seed()            # seed() is a no-op when data already exists
    except Exception as e:
        print(f"[app] Seed warning: {e}")

# ── blueprints ───────────────────────────────────────────────────────────────
from routes.auth      import auth_bp
from routes.movement  import movement_bp
from routes.dashboard import dashboard_bp
from routes.sessions  import sessions_bp
from routes.reports   import reports_bp
from routes.profile   import profile_bp

app.register_blueprint(auth_bp)
app.register_blueprint(movement_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(sessions_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(profile_bp)

# ── SPA catch-all (serves React app for all non-API routes) ─────────────────
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    full = os.path.join(app.static_folder, path)
    if path and os.path.exists(full):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

# ── health check & direct aliases ───────────────────────────────────────────
@app.route('/api/health')
def health():
    return jsonify({"status": "ok", "app": "PostureTrek API"})

@app.route('/leaderboard', methods=['GET'])
@app.route('/api/leaderboard', methods=['GET'])
def direct_leaderboard():
    from routes.movement import get_leaderboard
    return get_leaderboard()

# ── run ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() in ('true', '1', 't')

    import socket
    local_ip = "127.0.0.1"
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        pass

    print("\n" + "=" * 55)
    print(" 🚀 PostureTrek Backend Server")
    print("=" * 55)
    print(f" Local:   http://127.0.0.1:{port}")
    print(f" Network: http://{local_ip}:{port} (accessible on local WiFi)")
    print(f" Binding: http://{host}:{port}")
    print("=" * 55 + "\n")

    app.run(host=host, port=port, debug=debug)