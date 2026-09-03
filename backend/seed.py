"""
seed.py – PostureTrek demo data.

Creates realistic users (with phone numbers) and
workout sessions with rep logs spread over the last 30 days.

Run manually:   python3 seed.py
Auto-run:       Called by app.py on first startup when DB is empty.
"""

import random
from datetime import datetime, timedelta
from models import db, User, MovementSession, MovementRepLog

# ── exercise catalogue ──────────────────────────────────────────────────────
EXERCISES = ['squat', 'pushup', 'plank', 'lunges', 'posture', 'desk_posture']

ERROR_MAP = {
    'squat':        ['knee_valgus', 'shallow_depth', 'forward_lean'],
    'pushup':       ['sagging_hips', 'flared_elbows', 'incomplete_range'],
    'plank':        ['hip_drop', 'shoulder_shrug', 'head_drop'],
    'lunges':       ['knee_past_toe', 'torso_lean', 'unstable_landing'],
    'posture':      ['rounded_shoulders', 'forward_neck', 'uneven_hips'],
    'desk_posture': ['slouch', 'forward_neck', 'screen_too_close'],
}

AI_SUMMARIES = {
    'squat':   [
        "Squats mein depth kaafi solid thi! Knee alignment improve karo agle session mein.",
        "Great squat session! Core tight tha aur heels grounded rahe.",
        "Thodi aur depth lo — hips parallel tak neeche jao.",
    ],
    'pushup':  [
        "Push-up form kaafi achhi rahi! Elbow angle aur chest contact maintain karo.",
        "Elbows thoda body ke paas rakho — shoulder strain reduce hogi.",
        "Solid push session! Core engagement throughout achha tha.",
    ],
    'plank':   [
        "Plank hold strong tha! Hips ka alignment bilkul sahi raha.",
        "Core ekdum tight! Breathe normally karo hold ke dauran.",
        "Hip drop detect hua — core ko aur engage karo.",
    ],
    'lunges':  [
        "Lunge form solid hai! Front knee 90 degree pe stable raha.",
        "Torso seedha rakho aur balance maintain karo center mein.",
        "Good lunges! Knee past toe issue thoda reduce karo.",
    ],
    'posture': [
        "Posture balance achha raha! Shoulders aur spine aligned the.",
        "Rounded shoulders detect hue — chest thoda open rakho.",
        "Standing posture ekdum solid! Weight dono paon pe equal tha.",
    ],
    'desk_posture': [
        "Study posture kaafi achha tha! Screen distance safe rahi.",
        "Neck thoda forward detect hua — monitor eye level pe rakho.",
        "Back straight aur shoulders relaxed — great desk posture!",
    ],
}

# ── demo users ──────────────────────────────────────────────────────────────
USERS_DATA = [
    {"name": "Arjun Mehta",  "phone": "9876543210", "email": "arjun@postretrek.io"},
    {"name": "Priya Kapoor", "phone": "9876543211", "email": "priya@postretrek.io"},
    {"name": "Dev Sharma",   "phone": "9876543212", "email": "dev@postretrek.io"},
    {"name": "Neha Singh",   "phone": "9876543213", "email": "neha@postretrek.io"},
    {"name": "Rohan Verma",  "phone": "9876543214", "email": "rohan@postretrek.io"},
]


def seed(flask_app=None):
    # Only seed if the DB is completely empty
    if User.query.count() > 0:
        print("[seed] Database already has data — skipping seed.")
        return

        print("[seed] Seeding PostureTrek demo data…")

        now = datetime.utcnow()
        users = []

        # ── Create users ──────────────────────────────────────────────────
        for u in USERS_DATA:
            user = User(
                name=u["name"],
                phone=u["phone"],
                email=u["email"],
                password_hash=None,     # OTP-based login, no password needed
                role='user',
            )
            db.session.add(user)
            users.append(user)

        db.session.commit()

        # ── Create sessions + rep logs ───────────────────────────────────
        for user in users:
            num_sessions = random.randint(8, 15)

            for _ in range(num_sessions):
                exercise    = random.choice(EXERCISES)
                days_ago    = random.randint(0, 30)
                started     = now - timedelta(
                    days=days_ago,
                    hours=random.randint(6, 21),
                    minutes=random.randint(0, 59),
                )
                duration    = timedelta(minutes=random.randint(5, 25))
                ended       = started + duration

                total       = random.randint(10, 40)
                correct     = random.randint(int(total * 0.55), total)
                incorrect   = total - correct
                accuracy    = round((correct / total) * 100, 1)
                ai_text     = random.choice(AI_SUMMARIES[exercise])

                session = MovementSession(
                    user_id=user.id,
                    exercise_type=exercise,
                    started_at=started,
                    ended_at=ended,
                    total_reps=total,
                    correct_reps=correct,
                    incorrect_reps=incorrect,
                    accuracy=accuracy,
                    ai_summary=ai_text,
                )
                db.session.add(session)
                db.session.flush()   # get session.id

                errors_pool = ERROR_MAP[exercise]
                for rep_num in range(1, total + 1):
                    is_correct = rep_num <= correct
                    db.session.add(MovementRepLog(
                        session_id=session.id,
                        rep_number=rep_num,
                        correct=is_correct,
                        errors='' if is_correct else random.choice(errors_pool),
                        min_angle=round(random.uniform(55, 130), 1),
                        timestamp=started + timedelta(seconds=rep_num * random.randint(3, 8)),
                    ))

            db.session.flush()
            user.update_stats()     # populate cached stat columns on User

        db.session.commit()
        print(f"[seed] Done — {len(users)} users, sessions + rep logs created.")


if __name__ == '__main__':
    seed()