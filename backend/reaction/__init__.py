"""
backend/reaction - Dedicated Facial Reaction, Emotion, and Telemetry Engine.
Separated from the physical exercise / pose analyzers domain.
"""

from reaction.reaction_analyzer import ReactionAnalyzer
from reaction.expression_analyzer import (
    FacialExpressionAnalyzer,
    EMOTION_EMOJIS,
    STATE_LABELS,
    ALL_EMOTIONS,
)

__all__ = [
    "ReactionAnalyzer",
    "FacialExpressionAnalyzer",
    "EMOTION_EMOJIS",
    "STATE_LABELS",
    "ALL_EMOTIONS",
]
