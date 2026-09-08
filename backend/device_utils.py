"""Hardware Acceleration & Device Management Utility for PoseCare / PostureTrek.

Automatically detects the optimal computing device:
- Apple Silicon Metal Performance Shaders ('mps') on macOS
- NVIDIA CUDA ('cuda') on Linux / Windows
- Fallback to 'cpu' if no dedicated GPU backend is available.
"""

import os
import torch

_selected_device = None


def get_best_device() -> str:
    """Detect and return the highest performance hardware acceleration device available."""
    global _selected_device
    if _selected_device is not None:
        return _selected_device

    forced = os.getenv("DEVICE", "").strip().lower()
    if forced:
        _selected_device = forced
        return _selected_device

    if torch.cuda.is_available():
        _selected_device = "cuda"
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        _selected_device = "mps"
    else:
        _selected_device = "cpu"

    return _selected_device


def get_device_name() -> str:
    """Return a human-friendly description of the active computing device."""
    dev = get_best_device()
    if dev == "mps":
        return "Apple Silicon GPU (Metal Performance Shaders - MPS)"
    elif dev.startswith("cuda"):
        name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CUDA"
        return f"NVIDIA GPU ({name})"
    return "CPU (Standard Processor)"


def load_yolo_model(model_path: str = "yolo11n-pose.pt", fallback_path: str = "yolov8n-pose.pt"):
    """Load Ultralytics YOLO model and move it to the optimal GPU device.

    Returns:
        tuple: (model, device_str)
    """
    from ultralytics import YOLO

    device = get_best_device()

    try:
        model = YOLO(model_path)
    except Exception:
        model = YOLO(fallback_path)

    # Move model weights and layers to the target hardware device
    try:
        model.to(device)
    except Exception as e:
        print(f"[device_utils] Warning: Unable to move model to {device}: {e}. Keeping default.")

    return model, device
