from flask import Blueprint, jsonify
from models import db, MovementSession, MovementRepLog
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')


@dashboard_bp.route('/summary', methods=['GET'])
def get_summary():
    """Fitness summary stats for the dashboard."""
    total_sessions = db.session.query(func.count(MovementSession.id)).scalar() or 0

    total_reps = db.session.query(func.sum(MovementSession.total_reps)).scalar() or 0
    correct_reps = db.session.query(func.sum(MovementSession.correct_reps)).scalar() or 0

    avg_accuracy = db.session.query(func.avg(MovementSession.accuracy)).scalar()
    avg_accuracy = round(avg_accuracy, 1) if avg_accuracy else 0.0

    # Count sessions per exercise type
    exercise_counts = (
        db.session.query(MovementSession.exercise_type, func.count(MovementSession.id))
        .group_by(MovementSession.exercise_type)
        .all()
    )
    exercise_breakdown = {ex: cnt for ex, cnt in exercise_counts}

    return jsonify({
        'total_sessions': total_sessions,
        'total_reps': int(total_reps),
        'correct_reps': int(correct_reps),
        'avg_accuracy': avg_accuracy,
        'exercise_breakdown': exercise_breakdown,
    })


@dashboard_bp.route('/recent_sessions', methods=['GET'])
def get_recent_sessions():
    """Return the 5 most recent workout sessions."""
    sessions = (
        db.session.query(MovementSession)
        .order_by(MovementSession.started_at.desc())
        .limit(5)
        .all()
    )
    data = [
        {
            'id': s.id,
            'exercise_type': s.exercise_type,
            'total_reps': s.total_reps,
            'correct_reps': s.correct_reps,
            'accuracy': s.accuracy,
            'started_at': s.started_at.isoformat() if s.started_at else None,
            'ended_at': s.ended_at.isoformat() if s.ended_at else None,
            'ai_summary': s.ai_summary,
        }
        for s in sessions
    ]
    return jsonify(data)


@dashboard_bp.route('/weekly', methods=['GET'])
def get_weekly_activity():
    """Return rep counts grouped by day-of-week for a bar chart."""
    from sqlalchemy import extract
    rows = (
        db.session.query(
            extract('dow', MovementSession.started_at).label('dow'),
            func.sum(MovementSession.total_reps).label('reps')
        )
        .group_by('dow')
        .all()
    )
    # dow: 0=Sunday … 6=Saturday
    day_names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    day_map = {int(r.dow): int(r.reps or 0) for r in rows}
    result = [{'day': day_names[i], 'reps': day_map.get(i, 0)} for i in range(7)]
    # Reorder Mon→Sun
    result = result[1:] + result[:1]
    return jsonify(result)
