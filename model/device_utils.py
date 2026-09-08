"""Shim to import device_utils in model directory."""
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from device_utils import get_best_device, get_device_name, load_yolo_model

__all__ = ["get_best_device", "get_device_name", "load_yolo_model"]
