"""
Sessions API – list, get, and delete MovementSession records.
The Sessions page expects:
  {
    id, pose, score, repetitions, duration, status, date, ai_summary
  }
"""
from flask import Blueprint, jsonify, request
from models import db, MovementSession

sessions_bp = Blueprint('sessions', __name__, url_prefix='/api/sessions')

# Friendly label for exercise_type keys stored in DB
EXERCISE_LABELS = {
    'squat':          'Squat',
    'pushup':         'Push Up',
    'push_up':        'Push Up',
    'lunge':          'Lunge',
    'lunges':         'Lunge',
    'plank':          'Plank',
    'bicep_curl':     'Bicep Curl',
    'shoulder_press': 'Shoulder Press',
    'suryanamaskar':  'Surya Namaskar',
    'surya_namaskar': 'Surya Namaskar',
    'tree_pose':      'Tree Pose',
    'tadasana':       'Tadasana',
    'warrior_two':    'Warrior II',
    'triangle':       'Triangle',
    'downward_dog':   'Downward Dog',
    'cobra':          'Cobra',
    'posture':        'Posture Check',
    'desk_posture':   'Desk Posture',
}


import json

def _serialize(s: MovementSession) -> dict:
    """Convert a MovementSession ORM object to the shape expected by the UI."""
    # Duration: prefer computed from timestamps, else 0
    duration_seconds = 0
    if s.started_at and s.ended_at:
        diff = (s.ended_at - s.started_at).total_seconds()
        duration_seconds = max(int(diff), 0)

    # Date: prefer started_at, fall back to ended_at, then None
    date_val = s.started_at or s.ended_at

    raw_summary = s.ai_summary or ''
    ai_report = None
    ai_summary_text = raw_summary
    if raw_summary.strip().startswith('{') and raw_summary.strip().endswith('}'):
        try:
            ai_report = json.loads(raw_summary)
            if isinstance(ai_report, dict):
                ai_summary_text = ai_report.get('formatted_text') or ai_report.get('overview') or raw_summary
        except Exception:
            ai_report = None

    return {
        'id':            s.id,
        'pose':          EXERCISE_LABELS.get(s.exercise_type, s.exercise_type.replace('_', ' ').title()),
        'exercise_type': s.exercise_type,
        'score':         round(s.accuracy or 0, 1),
        'repetitions':   s.total_reps or 0,
        'correct_reps':  s.correct_reps or 0,
        'incorrect_reps': s.incorrect_reps or 0,
        'duration':      duration_seconds,
        'status':        'Completed',
        'date':          date_val.isoformat() if date_val else None,
        'ai_summary':    ai_summary_text,
        'ai_report':     ai_report,
    }



import time

_SESSIONS_CACHE = {'data': None, 'ts': 0}
SESSIONS_CACHE_TTL = 30.0


def invalidate_sessions_cache():
    """Invalidate cached session listings when a workout finishes or a session is deleted."""
    global _SESSIONS_CACHE
    _SESSIONS_CACHE = {'data': None, 'ts': 0}


@sessions_bp.route('', methods=['GET'])
def list_sessions():
    """Return all sessions ordered by most recent first."""
    now = time.time()
    if _SESSIONS_CACHE['data'] is not None and (now - _SESSIONS_CACHE['ts'] < SESSIONS_CACHE_TTL):
        return jsonify(_SESSIONS_CACHE['data'])

    sessions = (
        db.session.query(MovementSession)
        .order_by(MovementSession.started_at.desc())
        .all()
    )
    serialized = [_serialize(s) for s in sessions]
    _SESSIONS_CACHE['data'] = serialized
    _SESSIONS_CACHE['ts'] = now
    return jsonify(serialized)


@sessions_bp.route('/<int:session_id>', methods=['GET'])
def get_session(session_id):
    """Return a single session by ID."""
    s = db.session.get(MovementSession, session_id)
    if not s:
        return jsonify({'error': 'Session not found'}), 404
    return jsonify(_serialize(s))


@sessions_bp.route('/<int:session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a session and its rep logs."""
    s = db.session.get(MovementSession, session_id)
    if not s:
        return jsonify({'error': 'Session not found'}), 404
    db.session.delete(s)
    db.session.commit()
    invalidate_sessions_cache()
    try:
        from routes.dashboard import invalidate_dashboard_cache
        invalidate_dashboard_cache()
    except Exception:
        pass
    return jsonify({'message': 'Session deleted successfully'})
