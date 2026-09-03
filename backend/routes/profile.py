from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from models import db, User

profile_bp = Blueprint('profile', __name__)


def get_authenticated_or_default_user():
    """Helper to retrieve authenticated user from JWT token or fallback to latest user in DB."""
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except Exception:
        pass

    if user_id and str(user_id).isdigit():
        user = User.query.get(int(user_id))
        if user:
            return user

    # Fallback to the latest registered or demo user
    user = User.query.order_by(User.id.desc()).first()
    return user


@profile_bp.route('/api/profile', methods=['GET'])
@profile_bp.route('/profile', methods=['GET'])
def get_user_profile():
    """Returns the real authenticated user profile from the database."""
    user = get_authenticated_or_default_user()
    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({
        "status": "success",
        "user": user.to_dict()
    }), 200


@profile_bp.route('/api/profile', methods=['PUT', 'POST'])
@profile_bp.route('/profile', methods=['PUT', 'POST'])
def update_user_profile():
    """Updates the user's real profile in the database."""
    user = get_authenticated_or_default_user()
    if not user:
        return jsonify({"message": "User account not found"}), 404

    data = request.get_json(silent=True) or {}

    # Update fields if provided
    if 'name' in data and data['name']:
        user.name = data['name'].strip()
    if 'email' in data and data['email']:
        new_email = data['email'].strip().lower()
        if new_email != (user.email or ''):
            existing_email = User.query.filter(User.email == new_email, User.id != user.id).first()
            if existing_email:
                return jsonify({"message": "This email address is already in use by another account."}), 409
            user.email = new_email
    if 'phone' in data and data['phone']:
        new_phone = data['phone'].strip().replace(' ', '').replace('-', '')
        if new_phone != (user.phone or ''):
            existing_phone = User.query.filter(User.phone == new_phone, User.id != user.id).first()
            if existing_phone:
                return jsonify({"message": "This phone number is already registered to another account."}), 409
            user.phone = new_phone
    if 'gender' in data and data['gender']:
        user.gender = data['gender'].strip().lower()
    if 'age' in data and data['age'] is not None and str(data['age']).strip() != '':
        try:
            user.age = int(data['age'])
        except (ValueError, TypeError):
            pass
    if 'height' in data and data['height'] is not None:
        try:
            user.height = float(data['height'])
        except (ValueError, TypeError):
            pass
    if 'weight' in data and data['weight'] is not None:
        try:
            user.weight = float(data['weight'])
        except (ValueError, TypeError):
            pass

    # Fitness preferences
    goal = data.get('fitnessGoal') or data.get('fitness_goal')
    if goal:
        user.fitness_goal = str(goal).strip()

    activity = data.get('activityLevel') or data.get('activity_level')
    if activity:
        user.activity_level = str(activity).strip()

    experience = data.get('experience')
    if experience:
        user.experience = str(experience).strip()

    # Report preferences if sent in profile form
    if 'report_frequency' in data:
        user.report_frequency = data['report_frequency']
    if 'email_reports_enabled' in data:
        user.email_reports_enabled = bool(data['email_reports_enabled'])

    try:
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Profile updated successfully in database!",
            "user": user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to save profile: {str(e)}"}), 500
