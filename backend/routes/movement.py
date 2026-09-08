import base64
import json
import numpy as np
import cv2
from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request

from models import db, MovementSession, MovementRepLog
from analyzers.squat_analyzer import SquatAnalyzer
from analyzers.pushup_analyzer import PushupAnalyzer
from analyzers.yoga_pose_analyzer import YogaAnalyzer
from analyzers.surya_namaskar_analyzer import SuryaAnalyzer, SuryaNamaskarAnalyzer
from analyzers.lunge_analyzer import LungeAnalyzer
from analyzers.plank_analyzer import PlankAnalyzer
from analyzers.posture_analyzer import PostureAnalyzer
from analyzers.desk_posture_analyzer import DeskPostureAnalyzer
from reaction.expression_analyzer import FacialExpressionAnalyzer
from reaction.reaction_analyzer import ReactionAnalyzer
from ai_summarizer import ai_summarizer
from analyzers.biomechanical_risk import BiomechanicalRiskEvaluator
from analyzers.breath_detector import VisionBreathDetector
from analyzers.joint_torque_model import JointTorqueModel
from analyzers.anatomical_calibration import AnatomicalCalibrator
from analyzers.camera_autopilot import CameraAutopilot
from analyzers.muscle_activation import MuscleActivationEstimator

from analyzers.bodymap import BodyMapCalibrator, draw_calibration_hud, BodyMode, BodyMap
from ultralytics import YOLO
try:
    from device_utils import load_yolo_model, get_best_device
except ImportError:
    from analyzers.device_utils import load_yolo_model, get_best_device

movement_bp = Blueprint('movement', __name__, url_prefix='/api/pose')

ANALYZERS = {
    "squat": lambda: SquatAnalyzer(),
    "pushup": lambda: PushupAnalyzer(),
    "suryanamaskar": lambda: SuryaAnalyzer(),
    "surya_namaskar": lambda: SuryaAnalyzer(),
    "tree_pose": lambda: YogaAnalyzer(target_pose="tree_pose"),
    "tadasana": lambda: YogaAnalyzer(target_pose="tadasana"),
    "warrior_two": lambda: YogaAnalyzer(target_pose="warrior_two"),
    "triangle": lambda: YogaAnalyzer(target_pose="triangle"),
    "downward_dog": lambda: YogaAnalyzer(target_pose="downward_dog"),
    "cobra": lambda: YogaAnalyzer(target_pose="cobra"),
    "lunges": lambda: LungeAnalyzer(),
    "plank": lambda: PlankAnalyzer(),
    "posture": lambda: PostureAnalyzer(),
    "desk_posture": lambda: DeskPostureAnalyzer(),
    "reaction": lambda: ReactionAnalyzer(),
}

_active = {
    "exercise": None,
    "analyzer": None,
    "running": False,
    "frame_count": 0,
    "last_ai_insight": None,
    "body_map": None,
    "anatomical_profile": None,
    "expression_history": [],
    "breath_history": [],
    "torque_history": [],
    "risk_tracker": {
        "peak_risk_score": 0,
        "high_risk_frames": 0,
        "moderate_risk_frames": 0,
        "total_frames": 0,
        "vulnerable_joints": set(),
    },
}

_calibrator = BodyMapCalibrator(duration=3.0)
_calib_model = None
_calib_device = None
_expression_analyzer = FacialExpressionAnalyzer()

_breath_detector = VisionBreathDetector()
_joint_torque_model = JointTorqueModel()
_anatomical_calibrator = AnatomicalCalibrator(duration_sec=3.0)
_camera_autopilot = CameraAutopilot()
_muscle_activation_estimator = MuscleActivationEstimator()


def get_calibration_model():
    global _calib_model, _calib_device
    if _calib_model is None:
        _calib_model, _calib_device = load_yolo_model("yolo11n-pose.pt")
    return _calib_model, _calib_device


@movement_bp.route('/calibrate_start', methods=['POST'])
def calibrate_start():
    """Initializes a new body calibration session."""
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        pass

    global _calibrator, _anatomical_calibrator
    data = request.get_json(silent=True) or {}
    duration = float(data.get("duration", 3.0))
    _calibrator = BodyMapCalibrator(duration=duration)
    _calibrator.reset()
    _anatomical_calibrator = AnatomicalCalibrator(duration_sec=duration)
    _anatomical_calibrator.reset()
    return jsonify({
        "status": "calibration_started",
        "duration": _calibrator.duration,
        "message": "Stand in full view of the camera to build your Personal Body Map.",
    })


@movement_bp.route('/calibrate_frame', methods=['POST'])
def calibrate_frame():
    """Processes a single frame during calibration, returns progress, HUD, and BodyMap when done."""
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        pass

    global _calibrator, _anatomical_calibrator
    data = request.get_json(silent=True) or {}
    image_data_url = data.get("image")
    if not image_data_url:
        return jsonify({"error": "missing 'image' field"}), 400

    try:
        header, encoded = image_data_url.split(",", 1)
        raw_bytes = base64.b64decode(encoded)
        np_array = np.frombuffer(raw_bytes, dtype=np.uint8)
        frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
    except Exception:
        return jsonify({"error": "could not decode image"}), 400

    if frame is None:
        return jsonify({"error": "empty frame"}), 400

    # Run pose detector
    model, calib_device = get_calibration_model()
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = model(frame_rgb, device=calib_device, verbose=False)

    keypoint_data = results[0].keypoints.data
    kps = None
    if len(keypoint_data) > 0:
        kps = keypoint_data[0].cpu().numpy()

    _calibrator.observe(kps)
    if kps is not None:
        _anatomical_calibrator.observe(kps)

    progress = _calibrator.progress()
    is_complete = _calibrator.is_complete()

    body_map = _calibrator.build()
    detected_groups = [g["name"] for g in body_map.group_status if g["tracked"]]
    anatomical_profile = None

    # Annotate frame with skeleton and frosted-glass HUD (hide labels and confidence)
    annotated_rgb = results[0].plot(labels=False, conf=False)
    annotated_bgr = cv2.cvtColor(annotated_rgb, cv2.COLOR_RGB2BGR)
    annotated_with_hud = draw_calibration_hud(annotated_bgr, progress, detected_groups)

    ok, buffer = cv2.imencode(".jpg", annotated_with_hud, [cv2.IMWRITE_JPEG_QUALITY, 60])
    if not ok:
        return jsonify({"error": "could not encode output"}), 500

    annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")

    # If completed, cache as active body map & compute anatomical proportion profile
    if is_complete:
        _active["body_map"] = body_map.to_dict()
        profile_obj = _anatomical_calibrator.compute_profile()
        anatomical_profile = profile_obj.to_dict()
        _active["anatomical_profile"] = anatomical_profile
    elif _active.get("anatomical_profile"):
        anatomical_profile = _active.get("anatomical_profile")

    return jsonify({
        "progress": round(progress, 3),
        "is_complete": is_complete,
        "frames_seen": _calibrator.frames,
        "annotated_image": annotated_b64,
        "body_map": body_map.to_dict(),
        "anatomical_profile": anatomical_profile,
        "detected_groups": detected_groups,
    })


@movement_bp.route('/start', methods=['POST'])
def start_exercise():
    """Matches the frontend's POST /pose/start {exercise: 'squat', body_map: {...}}.
    Optional JWT auth header check."""
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        pass

    data = request.get_json(silent=True) or {}
    exercise_type = data.get("exercise", "squat")
    body_map = data.get("body_map")

    if exercise_type not in ANALYZERS:
        # Fallback to squat if unknown
        exercise_type = "squat"

    _active["exercise"] = exercise_type
    _active["analyzer"] = ANALYZERS[exercise_type]()
    _active["running"] = True
    _active["frame_count"] = 0
    _active["last_ai_insight"] = None
    _active["started_at"] = datetime.utcnow()
    _active["breath_history"] = []
    _active["torque_history"] = []
    _breath_detector.reset()
    _camera_autopilot.reset()
    _active["risk_tracker"] = {
        "peak_risk_score": 0,
        "high_risk_frames": 0,
        "moderate_risk_frames": 0,
        "total_frames": 0,
        "vulnerable_joints": set(),
    }
    if body_map:
        _active["body_map"] = body_map

    return jsonify({
        "status": "started",
        "exercise": exercise_type,
        "body_map": _active.get("body_map"),
        "anatomical_profile": _active.get("anatomical_profile"),
    })


@movement_bp.route('/analyze_frame', methods=['POST'])
def analyze_frame():
    """Called repeatedly by frontend while analysis is running.
    Body: {"image": "data:image/jpeg;base64,...."}
    Returns skeleton-annotated frame + live metrics + AI Live Feed Summary."""
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        pass

    data = request.get_json(silent=True) or {}

    req_exercise = data.get("exercise")
    if not _active["running"] or _active["analyzer"] is None or (req_exercise and req_exercise != _active.get("exercise")):
        exercise_type = req_exercise or "squat"
        if exercise_type not in ANALYZERS:
            exercise_type = "squat"
        _active["exercise"] = exercise_type
        _active["analyzer"] = ANALYZERS[exercise_type]()
        _active["running"] = True
        _active["frame_count"] = 0
        _active["last_ai_insight"] = None
        _active["expression_history"] = []

    image_data_url = data.get("image")
    if not image_data_url:
        return jsonify({"error": "missing 'image' field"}), 400

    try:
        header, encoded = image_data_url.split(",", 1)
        raw_bytes = base64.b64decode(encoded)
        np_array = np.frombuffer(raw_bytes, dtype=np.uint8)
        frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
    except Exception:
        return jsonify({"error": "could not decode image"}), 400

    if frame is None:
        return jsonify({"error": "empty frame"}), 400

    output, metrics = _active["analyzer"].process_frame(frame)
    _active["frame_count"] += 1

    # Process Real-time Facial Expression, Mood & Fatigue Analysis ONLY for reaction analyzer
    expression_data = None
    if _active.get("exercise") == "reaction":
        if isinstance(metrics, dict) and metrics.get("is_reaction"):
            expression_data = {
                "face_detected": metrics.get("face_detected", False),
                "dominant_emotion": metrics.get("dominant_emotion", "neutral"),
                "confidence": metrics.get("confidence", 80.0),
                "fatigue_score": metrics.get("fatigue_score", 10),
                "tension_score": metrics.get("tension_score", 15),
                "engagement_score": metrics.get("engagement_score", 85),
                "drowsiness_warning": metrics.get("drowsiness_warning", False),
                "state_label": metrics.get("state_label", "Focused"),
                "emoji": metrics.get("emoji", "🙂"),
                "emotion_scores": metrics.get("emotion_scores", {}),
            }
        else:
            try:
                expression_data = _expression_analyzer.process_frame(frame)
            except Exception:
                expression_data = _expression_analyzer._default_metrics(face_detected=False)

        if expression_data and expression_data.get("face_detected"):
            _active["expression_history"].append({
                "emotion": expression_data.get("dominant_emotion"),
                "fatigue": expression_data.get("fatigue_score", 0),
                "tension": expression_data.get("tension_score", 0),
                "drowsy": expression_data.get("drowsiness_warning", False),
            })

    ok, buffer = cv2.imencode(".jpg", output, [cv2.IMWRITE_JPEG_QUALITY, 55])
    if not ok:
        return jsonify({"error": "could not encode output"}), 500

    annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode("utf-8")

    # Keypoints for advanced biomechanical engines
    last_kps = getattr(_active["analyzer"], "last_keypoints", None)

    # 1. Vision-Based Breath Detection (Pranayama-Kinematics Sync)
    breath_data = _breath_detector.process_frame(last_kps, exercise=_active["exercise"], exercise_metrics=metrics)
    _active["breath_history"].append(breath_data)
    metrics["breath_telemetry"] = breath_data

    # 2. Biomechanical Joint-Load & Torque Modeling (Inverse Dynamics)
    torque_data = _joint_torque_model.compute_torques(
        keypoints=last_kps,
        exercise_type=_active["exercise"],
        metrics=metrics
    )
    _active["torque_history"].append(torque_data)
    metrics["joint_torque"] = torque_data

    # 3. Smart Camera Autopilot & Repositioning
    frame_h, frame_w = frame.shape[:2]
    autopilot_data = _camera_autopilot.evaluate_frame(
        keypoints=last_kps,
        frame_width=frame_w,
        frame_height=frame_h,
        exercise_type=_active["exercise"]
    )
    metrics["camera_autopilot"] = autopilot_data

    # 4. Muscle Group Activation Estimation
    muscle_data = _muscle_activation_estimator.estimate_activation(
        exercise_type=_active["exercise"],
        metrics=metrics,
        keypoints=last_kps
    )
    metrics["muscle_activation"] = muscle_data

    # Evaluate real-time Biomechanical Risk Warning
    rep_log = list(getattr(_active["analyzer"], "rep_log", []))
    frame_risk = BiomechanicalRiskEvaluator.evaluate_frame_risk(
        exercise_type=_active["exercise"],
        metrics=metrics,
        rep_log=rep_log
    )
    metrics["biomechanical_risk"] = frame_risk

    # Track cumulative session risk telemetry
    if _active.get("risk_tracker") is None:
        _active["risk_tracker"] = {
            "peak_risk_score": 0,
            "high_risk_frames": 0,
            "moderate_risk_frames": 0,
            "total_frames": 0,
            "vulnerable_joints": set(),
        }
    rt = _active["risk_tracker"]
    rt["total_frames"] += 1
    if frame_risk["risk_score"] > rt["peak_risk_score"]:
        rt["peak_risk_score"] = frame_risk["risk_score"]
    if frame_risk["risk_level"] == "HIGH":
        rt["high_risk_frames"] += 1
    elif frame_risk["risk_level"] == "MODERATE":
        rt["moderate_risk_frames"] += 1
    for vj in frame_risk.get("vulnerable_joints", []):
        rt["vulnerable_joints"].add(vj.get("joint"))

    has_issues = bool(metrics.get("issues"))
    last_had_issues = _active.get("last_had_issues", False)
    _active["last_had_issues"] = has_issues

    should_call_ai = (
        _active["last_ai_insight"] is None or
        _active["frame_count"] % 15 == 1 or
        has_issues != last_had_issues
    )

    if should_call_ai:
        ai_insight = ai_summarizer.generate_live_feed_insight(
            _active["exercise"],
            metrics,
            rep_log
        )
        _active["last_ai_insight"] = ai_insight
    else:
        ai_insight = _active["last_ai_insight"]

    # Ensure feedback field is AI-generated
    ai_feedback_text = ai_insight.get("live_speech") or ai_insight.get("coaching_tip") or metrics.get("feedback", "")
    metrics["feedback"] = ai_feedback_text

    return jsonify({
        "annotated_image": annotated_b64,
        "metrics": metrics,
        "biomechanical_risk": frame_risk,
        "breath_telemetry": breath_data,
        "joint_torque": torque_data,
        "camera_autopilot": autopilot_data,
        "muscle_activation": muscle_data,
        "ai_live_summary": ai_insight,
        "body_map": _active.get("body_map"),
        "anatomical_profile": _active.get("anatomical_profile"),
        "expression": expression_data,
    })


@movement_bp.route('/live_ai_summary', methods=['POST'])
def live_ai_summary():
    """Generates an immediate on-demand AI summary for the active live feed."""
    data = request.get_json(silent=True) or {}
    exercise = data.get("exercise", _active.get("exercise") or "squat")
    metrics = data.get("metrics", {})
    rep_log = getattr(_active.get("analyzer"), "rep_log", [])

    insight = ai_summarizer.generate_live_feed_insight(exercise, metrics, rep_log)
    return jsonify({"ai_live_summary": insight})


@movement_bp.route('/surya/skip_step', methods=['POST'])
def surya_skip_step():
    """Skips the current Surya Namaskar asana and advances to the next step automatically."""
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        pass

    analyzer = _active.get("analyzer")
    if not analyzer:
        analyzer = ANALYZERS["suryanamaskar"]()
        _active["analyzer"] = analyzer
        _active["exercise"] = "suryanamaskar"
        _active["running"] = True

    if hasattr(analyzer, "skip_step"):
        metrics = analyzer.skip_step()
        return jsonify({
            "status": "success",
            "message": "Step skipped successfully",
            "metrics": metrics,
            "current_step_number": metrics.get("current_step_number"),
            "expected_pose_name": metrics.get("expected_pose_name"),
            "voice_prompt": metrics.get("voice_prompt"),
            "round_count": metrics.get("round_count", 0),
        })
    elif hasattr(analyzer, "engine") and hasattr(analyzer.engine, "skip_step"):
        metrics = analyzer.engine.skip_step()
        return jsonify({
            "status": "success",
            "message": "Step skipped successfully",
            "metrics": metrics,
            "current_step_number": metrics.get("current_step_number"),
            "expected_pose_name": metrics.get("expected_pose_name"),
            "voice_prompt": metrics.get("voice_prompt"),
            "round_count": metrics.get("round_count", 0),
        })

    return jsonify({"status": "error", "message": "Current active exercise is not Surya Namaskar"}), 400


@movement_bp.route('/stop', methods=['POST'])
def stop_exercise():
    """Matches POST /pose/stop {exercise, duration}."""
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
    except Exception:
        pass

    data = request.get_json(silent=True) or {}
    analyzer = _active["analyzer"]
    exercise_name = _active["exercise"] or "squat"
    _active["running"] = False

    if analyzer is None:
        return jsonify({"error": "no session to stop"}), 400

    summary = analyzer.session_summary()

    # Calculate Facial Expression & Mood Balance summary ONLY when exercise is "reaction"
    expression_summary = None
    if exercise_name == "reaction":
        expr_history = _active.get("expression_history", [])
        if expr_history:
            emotions = [h["emotion"] for h in expr_history if h.get("emotion")]
            dominant_mood = max(set(emotions), key=emotions.count) if emotions else "neutral"
            avg_fatigue = int(np.mean([h.get("fatigue", 0) for h in expr_history]))
            avg_tension = int(np.mean([h.get("tension", 0) for h in expr_history]))
            drowsy_count = sum(1 for h in expr_history if h.get("drowsy"))
            expression_summary = {
                "dominant_mood": dominant_mood,
                "avg_fatigue": avg_fatigue,
                "avg_tension": avg_tension,
                "drowsy_warnings": drowsy_count,
                "summary_text": f"Dominant Mood: {dominant_mood.capitalize()} · Exertion: {avg_tension}% · Fatigue: {avg_fatigue}%",
            }
        else:
            expression_summary = {
                "dominant_mood": "focused",
                "avg_fatigue": 15,
                "avg_tension": 20,
                "drowsy_warnings": 0,
                "summary_text": "Good focus & engagement throughout reaction session.",
            }

    # 1. Vision-Based Breath Detection Session Summary
    b_hist = _active.get("breath_history", [])
    avg_breath_sync = int(np.mean([b.get("pranayama_sync_score", 80) for b in b_hist])) if b_hist else 85
    avg_bpm = int(np.mean([b.get("respiration_bpm", 14) for b in b_hist])) if b_hist else 14
    breath_summary = {
        "avg_pranayama_sync": avg_breath_sync,
        "avg_respiration_bpm": avg_bpm,
        "sync_rating": "Mastered (Guru)" if avg_breath_sync >= 85 else ("Good (Practitioner)" if avg_breath_sync >= 70 else "Needs Alignment"),
        "summary_text": f"Pranayama-Kinematics Sync: {avg_breath_sync}% · Average Respiration: {avg_bpm} BPM"
    }
    summary["breath_summary"] = breath_summary

    # 2. Joint-Load & Torque Modeling Session Summary
    t_hist = _active.get("torque_history", [])
    peak_l5_torque = max([t.get("l5_s1_torque_nm", 0.0) for t in t_hist], default=0.0)
    peak_knee_torque = max([t.get("knee_torque_nm", 0.0) for t in t_hist], default=0.0)
    peak_shear_n = max([t.get("l5_s1_shear_n", 0.0) for t in t_hist], default=0.0)
    has_torque_overload = any(t.get("is_overloaded", False) for t in t_hist)
    joint_load_summary = {
        "peak_l5_s1_torque_nm": round(peak_l5_torque, 1),
        "peak_knee_torque_nm": round(peak_knee_torque, 1),
        "peak_shear_n": round(peak_shear_n, 1),
        "overload_detected": has_torque_overload,
        "status": "Warning: Shear Stress Exceeded Safe Threshold" if has_torque_overload else "Optimal Joint Load",
        "summary_text": f"Peak L5-S1: {round(peak_l5_torque, 1)} N·m | Peak Knee: {round(peak_knee_torque, 1)} N·m"
    }
    summary["joint_load_summary"] = joint_load_summary

    # Compile Session Biomechanical Risk Report
    rep_log = summary.get("rep_log", [])
    all_errors = []
    for rep in rep_log:
        if isinstance(rep, dict) and "errors" in rep:
            all_errors.extend(rep.get("errors", []))
    unique_errors = list(set(all_errors))

    risk_report = BiomechanicalRiskEvaluator.compile_session_risk_report(
        exercise_type=exercise_name,
        cumulative_telemetry=_active.get("risk_tracker") or {},
        unique_errors=unique_errors
    )
    summary["biomechanical_risk_assessment"] = risk_report

    # Generate instant biomechanical AI Session Report (<2ms)
    ai_report = ai_summarizer.generate_session_summary(exercise_name, summary, wait_for_llm=False)
    ai_summary_payload = json.dumps(ai_report, ensure_ascii=False)
    ai_summary_text = ai_report.get("formatted_text") or ai_report.get("overview") or ""

    # Save to database if user is logged in or for global history
    session_id = None
    ended_at = datetime.utcnow()
    started_at = _active.get("started_at") or ended_at
    try:
        session = MovementSession(
            user_id=int(user_id) if user_id and str(user_id).isdigit() else None,
            exercise_type=exercise_name,
            started_at=started_at,
            ended_at=ended_at,
            total_reps=summary["total_reps"],
            correct_reps=summary["correct_reps"],
            incorrect_reps=summary["incorrect_reps"],
            accuracy=summary["accuracy"],
            ai_summary=ai_summary_payload,
        )
        db.session.add(session)
        db.session.flush()

        for rep in summary.get("rep_log", []):
            db.session.add(MovementRepLog(
                session_id=session.id,
                rep_number=rep.get("rep_number", 1),
                correct=rep.get("correct", True),
                errors=",".join(rep.get("errors", [])),
                min_angle=rep.get("min_angle", rep.get("hold_time", 0.0)),
            ))
        db.session.commit()
        session_id = session.id
        _active["started_at"] = None  # reset after saving

        # Invalidate dashboard and sessions caches immediately
        try:
            from routes.dashboard import invalidate_dashboard_cache
            from routes.sessions import invalidate_sessions_cache
            invalidate_dashboard_cache()
            invalidate_sessions_cache()
        except Exception:
            pass

        # Trigger non-blocking async LLM enrichment in the background
        from flask import current_app
        ai_summarizer.async_enrich_session_summary(
            session_id=session_id,
            exercise_type=exercise_name,
            summary_data=summary,
            app=current_app._get_current_object()
        )
    except Exception as e:
        db.session.rollback()
        print(f"Session save warning: {e}")

    reaction_dominant = (
        summary.get("dominant_mood")
        or (expression_summary and expression_summary.get("dominant_mood"))
        or "Focused"
    )

    return jsonify({
        "exercise": exercise_name,
        "duration": data.get("duration", 0),
        "reps": 0 if exercise_name == "reaction" else summary.get("total_reps", 0),
        "reaction": reaction_dominant.capitalize(),
        "dominant_mood": reaction_dominant.capitalize(),
        "accuracy": summary.get("accuracy", 85.0),
        "feedback": ai_summary_text,
        "ai_report": ai_report,
        "biomechanical_risk": risk_report,
        "breath_summary": breath_summary,
        "joint_load_summary": joint_load_summary,
        "anatomical_profile": _active.get("anatomical_profile"),
        "step_analysis": summary.get("step_analysis", []),
        "session_id": session_id,
        "body_map": _active.get("body_map"),
        "expression_summary": expression_summary,
    })


from datetime import timedelta
from models import User

@movement_bp.route('/session_summary_status/<int:session_id>', methods=['GET'])
def get_session_summary_status(session_id):
    """Lightweight polling endpoint to check if deep LLM background enrichment completed."""
    session = MovementSession.query.get_or_404(session_id)
    is_enriched = False
    ai_report = None
    if session.ai_summary:
        try:
            parsed = json.loads(session.ai_summary)
            if isinstance(parsed, dict):
                is_enriched = bool(parsed.get("is_enriched", False))
                ai_report = parsed
        except Exception:
            pass
    return jsonify({
        "session_id": session.id,
        "is_enriched": is_enriched,
        "ai_report": ai_report,
        "ai_summary": session.ai_summary,
    })

@movement_bp.route('/session/<int:session_id>', methods=['GET'])
def get_session(session_id):
    session = MovementSession.query.get_or_404(session_id)
    return jsonify({
        "id": session.id,
        "exercise_type": session.exercise_type,
        "total_reps": session.total_reps,
        "correct_reps": session.correct_reps,
        "incorrect_reps": session.incorrect_reps,
        "accuracy": session.accuracy,
        "ai_summary": session.ai_summary,
    })


@movement_bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    """Returns gamified posture correctness & exercise accuracy leaderboard.
    Query params: period=daily|weekly|monthly|all_time (default: all_time)"""
    period = request.args.get('period', 'all_time').lower()

    current_user_id = None
    try:
        verify_jwt_in_request(optional=True)
        jwt_sub = get_jwt_identity()
        if jwt_sub and str(jwt_sub).isdigit():
            current_user_id = int(jwt_sub)
    except Exception:
        pass

    now = datetime.utcnow()
    query = db.session.query(MovementSession)

    if period == 'daily':
        query = query.filter(MovementSession.started_at >= now - timedelta(days=1))
    elif period == 'weekly':
        query = query.filter(MovementSession.started_at >= now - timedelta(days=7))
    elif period == 'monthly':
        query = query.filter(MovementSession.started_at >= now - timedelta(days=30))

    sessions = query.all()

    # Aggregate stats per user
    user_stats = {}
    for s in sessions:
        uid = s.user_id or 0
        if uid not in user_stats:
            user_stats[uid] = {
                "user_id": uid,
                "total_reps": 0,
                "correct_reps": 0,
                "sessions_count": 0,
                "accuracy_sum": 0.0,
            }
        user_stats[uid]["total_reps"] += (s.total_reps or 0)
        user_stats[uid]["correct_reps"] += (s.correct_reps or 0)
        user_stats[uid]["sessions_count"] += 1
        user_stats[uid]["accuracy_sum"] += (s.accuracy or 0.0)

    # Fetch User details from database
    user_ids = [uid for uid in user_stats.keys() if uid > 0]
    users_db = {u.id: u for u in User.query.filter(User.id.in_(user_ids)).all()} if user_ids else {}

    leaderboard = []
    for uid, stats in user_stats.items():
        if uid > 0 and uid in users_db:
            name = users_db[uid].name
            role = users_db[uid].role
        elif uid == 0:
            name = "Guest User"
            role = "Guest"
        else:
            name = f"User #{uid}"
            role = "Member"

        avg_accuracy = round(stats["accuracy_sum"] / stats["sessions_count"], 1) if stats["sessions_count"] > 0 else 0.0
        points = int(stats["correct_reps"] * 10 + avg_accuracy * 5 + stats["sessions_count"] * 20)

        leaderboard.append({
            "user_id": uid,
            "name": name,
            "role": role,
            "total_reps": stats["total_reps"],
            "correct_reps": stats["correct_reps"],
            "sessions_count": stats["sessions_count"],
            "accuracy": avg_accuracy,
            "points": points,
        })

    # Sort leaderboard by points descending
    leaderboard.sort(key=lambda x: x["points"], reverse=True)

    # Assign ranks and badges
    for idx, entry in enumerate(leaderboard):
        rank = idx + 1
        entry["rank"] = rank
        if rank == 1:
            entry["badge"] = "🥇 Posture Master"
            entry["tier"] = "Gold"
        elif rank == 2:
            entry["badge"] = "🥈 Biomechanics Pro"
            entry["tier"] = "Silver"
        elif rank == 3:
            entry["badge"] = "🥉 Consistency Sentinel"
            entry["tier"] = "Bronze"
        elif rank <= 10:
            entry["badge"] = "🌟 Elite Tracker"
            entry["tier"] = "Elite"
        else:
            entry["badge"] = "🏅 Active Scholar"
            entry["tier"] = "Scholar"

    current_user_rank = None
    if current_user_id:
        for entry in leaderboard:
            if entry["user_id"] == current_user_id:
                current_user_rank = entry
                break

    return jsonify({
        "period": period,
        "leaderboard": leaderboard,
        "current_user_rank": current_user_rank,
    })