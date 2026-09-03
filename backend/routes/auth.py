import re
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User

auth_bp = Blueprint('auth', __name__)

OTP_STORE = {}


def validate_email(email):
    if not email or not isinstance(email, str):
        return False
    return re.match(r"^[^@]+@[^@]+\.[^@]+$", email.strip()) is not None


@auth_bp.route('/api/register', methods=['POST'])
@auth_bp.route('/register', methods=['POST'])
def register():
    """Mandatorily registers a new user with name, email, phone, and gender."""
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip().replace(' ', '').replace('-', '')
    gender = (data.get('gender') or '').strip().lower()

    # 1. Validation for Name
    if not name or len(name) < 2:
        return jsonify({"message": "Full name is required (minimum 2 characters)."}), 400

    # 2. Validation for Email
    if not email or not validate_email(email):
        return jsonify({"message": "A valid email address is required (e.g. user@example.com)."}), 400

    # 3. Validation for Phone (10 digits)
    if not phone or len(phone) != 10 or not phone.isdigit():
        return jsonify({"message": "A valid 10-digit mobile number is required."}), 400

    # 4. Validation for Gender
    valid_genders = {"male", "female", "other", "non_binary", "prefer_not_to_say"}
    if not gender or gender not in valid_genders:
        return jsonify({
            "message": "Gender is required. Please choose from Male, Female, Other / Non-Binary, or Prefer not to say.",
            "valid_options": list(valid_genders)
        }), 400

    # Check for existing phone
    existing_phone = User.query.filter_by(phone=phone).first()
    if existing_phone:
        return jsonify({"message": "This mobile number is already registered. Please log in instead."}), 409

    # Check for existing email
    existing_email = User.query.filter_by(email=email).first()
    if existing_email:
        return jsonify({"message": "This email address is already registered. Please log in with your phone or use a different email."}), 409

    try:
        new_user = User(
            name=name,
            email=email,
            phone=phone,
            gender=gender,
            role="user",
            report_frequency=data.get("report_frequency", "daily"),
            email_reports_enabled=bool(data.get("email_reports_enabled", True)),
        )
        db.session.add(new_user)
        db.session.commit()

        # Generate JWT token
        access_token = create_access_token(
            identity=str(new_user.id),
            additional_claims={
                "role": new_user.role,
                "name": new_user.name,
                "phone": new_user.phone,
                "email": new_user.email,
            },
            expires_delta=timedelta(days=7)
        )

        return jsonify({
            "message": "Registration successful! Welcome to PoseCare.",
            "access_token": access_token,
            "user": new_user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Failed to create account: {str(e)}"}), 500


@auth_bp.route('/api/login', methods=['POST'])
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    mobile = (data.get('mobile') or data.get('phone') or '').strip().replace(' ', '').replace('-', '')
    otp = data.get('otp')

    if not mobile or len(mobile) != 10 or not mobile.isdigit():
        return jsonify({"message": "Valid 10-digit mobile number is required"}), 400

    # STEP 1: Send OTP Request
    if not otp:
        user = User.query.filter_by(phone=mobile).first()
        if not user:
            return jsonify({
                "message": "Mobile number is not registered. Please create an account first.",
                "not_registered": True
            }), 404

        generated_otp = "123456"
        expires_at = datetime.utcnow() + timedelta(minutes=5)
        OTP_STORE[mobile] = {
            "otp": generated_otp,
            "expires_at": expires_at
        }

        return jsonify({
            "message": "OTP sent successfully (Development OTP: 123456)",
            "mobile": mobile
        }), 200

    # STEP 2: Verify OTP Request
    if len(str(otp)) != 6:
        return jsonify({"message": "Valid 6-digit OTP is required"}), 400

    record = OTP_STORE.get(mobile)
    if not record:
        return jsonify({"message": "No OTP requested for this number. Please request a new OTP."}), 400

    if datetime.utcnow() > record["expires_at"]:
        OTP_STORE.pop(mobile, None)
        return jsonify({"message": "OTP has expired. Please request a new one."}), 400

    if record["otp"] != str(otp):
        return jsonify({"message": "Invalid OTP. Please check and try again (Default: 123456)."}), 401

    OTP_STORE.pop(mobile, None)

    user = User.query.filter_by(phone=mobile).first()
    if not user:
        return jsonify({"message": "User account not found"}), 404

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "name": user.name,
            "phone": user.phone,
            "email": user.email,
        },
        expires_delta=timedelta(days=7)
    )

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": user.to_dict()
    }), 200


@auth_bp.route('/api/me', methods=['GET'])
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    current_user_id = get_jwt_identity()
    user = User.query.get(int(current_user_id))

    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({"user": user.to_dict()}), 200