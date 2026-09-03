from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from models import db, User
from celery_app import dispatch_report

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')


@reports_bp.route('/send', methods=['POST'])
def trigger_report():
    """Trigger an on-demand daily or monthly email report using Celery & Redis."""
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except Exception:
        pass

    data = request.get_json(silent=True) or {}
    report_type = (data.get('report_type') or 'daily').lower()
    if report_type not in ('daily', 'monthly'):
        report_type = 'daily'

    target_email = data.get('email')
    user = None
    if user_id and str(user_id).isdigit():
        user = User.query.get(int(user_id))
        if user and not target_email:
            target_email = user.email

    if not target_email:
        # Fallback to demo user email or test address
        if not user:
            user = User.query.first()
            if user:
                target_email = user.email
                user_id = user.id

    if not target_email:
        target_email = "athlete@posecare.ai"

    # Dispatch via Celery worker
    dispatch_res = dispatch_report(
        user_id=user.id if user else None,
        report_type=report_type,
        target_email=target_email
    )

    return jsonify({
        "status": "success",
        "report_type": report_type,
        "recipient": target_email,
        "dispatch": dispatch_res,
        "message": f"Successfully queued {report_type} report for {target_email} using Celery & Redis worker.",
    }), 200


@reports_bp.route('/preferences', methods=['GET'])
def get_preferences():
    """Get email report preferences for the current user."""
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except Exception:
        pass

    user = None
    if user_id and str(user_id).isdigit():
        user = User.query.get(int(user_id))

    if not user:
        user = User.query.first()

    if not user:
        return jsonify({
            "report_frequency": "daily",
            "email_reports_enabled": True,
            "email": "",
        }), 200

    return jsonify({
        "report_frequency": user.report_frequency or "daily",
        "email_reports_enabled": user.email_reports_enabled if user.email_reports_enabled is not None else True,
        "email": user.email or "",
    }), 200


@reports_bp.route('/preferences', methods=['POST'])
def update_preferences():
    """Update email report preferences."""
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except Exception:
        pass

    data = request.get_json(silent=True) or {}
    frequency = data.get('report_frequency', 'daily')
    enabled = bool(data.get('email_reports_enabled', True))
    email = data.get('email')

    user = None
    if user_id and str(user_id).isdigit():
        user = User.query.get(int(user_id))

    if not user:
        user = User.query.first()

    if user:
        if frequency in ('daily', 'monthly', 'none'):
            user.report_frequency = frequency
        user.email_reports_enabled = enabled
        if email and isinstance(email, str) and '@' in email:
            user.email = email.strip()
        db.session.commit()

        return jsonify({
            "message": "Report preferences updated successfully.",
            "preferences": {
                "report_frequency": user.report_frequency,
                "email_reports_enabled": user.email_reports_enabled,
                "email": user.email,
            }
        }), 200

    return jsonify({"message": "Preferences updated."}), 200
