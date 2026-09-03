"""
models.py – PostureTrek database schema.

Tables:
  users              – registered users (login via phone OTP)
  movement_sessions  – one row per workout session
  movement_rep_logs  – one row per individual rep within a session
"""

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


# ─────────────────────────────────────────────────────────
# 1. USER
# ─────────────────────────────────────────────────────────

class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)

    # Identity
    name          = db.Column(db.String(120), nullable=False)
    phone         = db.Column(db.String(15),  unique=True, nullable=False)   # PRIMARY LOGIN KEY
    email         = db.Column(db.String(120), unique=True, nullable=True)
    gender        = db.Column(db.String(20),  nullable=True, default='prefer_not_to_say')

    # Auth
    password_hash = db.Column(db.String(255), nullable=True)   # optional – OTP flow is primary

    # Profile & Preferences
    role          = db.Column(db.String(20),  nullable=False, default='user')  # user | admin
    avatar_url    = db.Column(db.String(500), nullable=True)
    preferred_language = db.Column(db.String(10), default='en')
    report_frequency   = db.Column(db.String(20), default='daily')  # daily | monthly | none
    email_reports_enabled = db.Column(db.Boolean, default=True)

    # Physical & Fitness Profile
    age           = db.Column(db.Integer, nullable=True)
    height        = db.Column(db.Float,   nullable=True)
    weight        = db.Column(db.Float,   nullable=True)
    fitness_goal  = db.Column(db.String(50), nullable=True, default='posture')
    activity_level = db.Column(db.String(50), nullable=True, default='moderate')
    experience    = db.Column(db.String(50), nullable=True, default='intermediate')

    # Stats cache (updated after each session for fast dashboard reads)
    total_sessions   = db.Column(db.Integer, default=0)
    total_reps       = db.Column(db.Integer, default=0)
    total_correct    = db.Column(db.Integer, default=0)
    avg_accuracy     = db.Column(db.Float,   default=0.0)
    streak_days      = db.Column(db.Integer, default=0)
    last_session_at  = db.Column(db.DateTime, nullable=True)

    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    sessions = db.relationship(
        'MovementSession',
        backref='user',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )

    def to_dict(self):
        return {
            'id':                    self.id,
            'name':                  self.name,
            'phone':                 self.phone,
            'email':                 self.email,
            'gender':                self.gender,
            'age':                   self.age,
            'height':                self.height,
            'weight':                self.weight,
            'fitnessGoal':           self.fitness_goal or 'posture',
            'fitness_goal':          self.fitness_goal or 'posture',
            'activityLevel':         self.activity_level or 'moderate',
            'activity_level':        self.activity_level or 'moderate',
            'experience':            self.experience or 'intermediate',
            'role':                  self.role,
            'avatar_url':            self.avatar_url,
            'preferred_language':    self.preferred_language,
            'report_frequency':      self.report_frequency,
            'email_reports_enabled': self.email_reports_enabled,
            'total_sessions':        self.total_sessions,
            'total_reps':            self.total_reps,
            'total_correct':         self.total_correct,
            'avg_accuracy':          self.avg_accuracy,
            'streak_days':           self.streak_days,
            'last_session_at':       self.last_session_at.isoformat() if self.last_session_at else None,
            'created_at':            self.created_at.isoformat() if self.created_at else None,
        }

    def update_stats(self):
        """Recalculate cached stats from actual session rows. Call after saving a session."""
        all_sessions = self.sessions.all()
        if not all_sessions:
            return

        self.total_sessions  = len(all_sessions)
        self.total_reps      = sum(s.total_reps   or 0 for s in all_sessions)
        self.total_correct   = sum(s.correct_reps or 0 for s in all_sessions)
        self.avg_accuracy    = round(
            sum(s.accuracy or 0 for s in all_sessions) / len(all_sessions), 1
        )
        recent = max(all_sessions, key=lambda s: s.started_at or datetime.min)
        self.last_session_at = recent.started_at


# ─────────────────────────────────────────────────────────
# 2. MOVEMENT SESSION  (one per workout)
# ─────────────────────────────────────────────────────────

class MovementSession(db.Model):
    __tablename__ = 'movement_sessions'

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    # Exercise info
    exercise_type = db.Column(db.String(50), nullable=False)   # squat, pushup, plank …

    # Timing
    started_at   = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at     = db.Column(db.DateTime, nullable=True)

    # Aggregated counters (filled on /pose/stop)
    total_reps    = db.Column(db.Integer, default=0)
    correct_reps  = db.Column(db.Integer, default=0)
    incorrect_reps = db.Column(db.Integer, default=0)
    accuracy      = db.Column(db.Float,   default=0.0)   # percentage 0–100

    # AI-generated text report
    ai_summary   = db.Column(db.Text, nullable=True)

    # Rep-level detail
    rep_logs = db.relationship(
        'MovementRepLog',
        backref='session',
        lazy='dynamic',
        cascade='all, delete-orphan'
    )

    @property
    def duration_seconds(self):
        if self.started_at and self.ended_at:
            return max(int((self.ended_at - self.started_at).total_seconds()), 0)
        return 0

    def to_dict(self, include_reps=False):
        data = {
            'id':             self.id,
            'user_id':        self.user_id,
            'exercise_type':  self.exercise_type,
            'started_at':     self.started_at.isoformat() if self.started_at else None,
            'ended_at':       self.ended_at.isoformat()   if self.ended_at   else None,
            'duration':       self.duration_seconds,
            'total_reps':     self.total_reps,
            'correct_reps':   self.correct_reps,
            'incorrect_reps': self.incorrect_reps,
            'accuracy':       self.accuracy,
            'ai_summary':     self.ai_summary,
        }
        if include_reps:
            data['rep_logs'] = [r.to_dict() for r in self.rep_logs]
        return data


# ─────────────────────────────────────────────────────────
# 3. MOVEMENT REP LOG  (one per rep within a session)
# ─────────────────────────────────────────────────────────

class MovementRepLog(db.Model):
    __tablename__ = 'movement_rep_logs'

    id          = db.Column(db.Integer, primary_key=True)
    session_id  = db.Column(db.Integer, db.ForeignKey('movement_sessions.id'), nullable=False)

    rep_number  = db.Column(db.Integer, nullable=False)
    correct     = db.Column(db.Boolean, default=False)
    errors      = db.Column(db.String(300), default='')   # comma-separated error labels
    min_angle   = db.Column(db.Float,   nullable=True)    # deepest joint angle reached
    timestamp   = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':         self.id,
            'session_id': self.session_id,
            'rep_number': self.rep_number,
            'correct':    self.correct,
            'errors':     self.errors.split(',') if self.errors else [],
            'min_angle':  self.min_angle,
            'timestamp':  self.timestamp.isoformat() if self.timestamp else None,
        }