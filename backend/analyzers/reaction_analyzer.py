"""
Compatibility shim for analyzers.reaction_analyzer.
The reaction analyzer concern has been relocated to backend/reaction/reaction_analyzer.py.
"""

from reaction.reaction_analyzer import (
    ReactionAnalyzer,
    TENSION_HIGH,
    TENSION_MED,
    SMOOTHING_ALPHA,
)

__all__ = [
    "ReactionAnalyzer",
    "TENSION_HIGH",
    "TENSION_MED",
    "SMOOTHING_ALPHA",
]