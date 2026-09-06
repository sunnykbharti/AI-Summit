"""
Compatibility shim for analyzers.expression_analyzer.
The expression analyzer concern has been relocated to backend/reaction/expression_analyzer.py.
"""

from reaction.expression_analyzer import (
    FacialExpressionAnalyzer,
    EMOTION_EMOJIS,
    STATE_LABELS,
    ALL_EMOTIONS,
)

__all__ = [
    "FacialExpressionAnalyzer",
    "EMOTION_EMOJIS",
    "STATE_LABELS",
    "ALL_EMOTIONS",
]
