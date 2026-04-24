from __future__ import annotations

import importlib
import os
from pathlib import Path


def _load_dotenv() -> None:
    try:
        load_dotenv = importlib.import_module("dotenv").load_dotenv
    except Exception:
        return

    load_dotenv()


_load_dotenv()

BASE_DIR = Path(__file__).resolve().parents[1]
STORAGE_DIR = BASE_DIR / "storage"
UPLOAD_DIR = STORAGE_DIR / "uploads"
RESULT_DIR = STORAGE_DIR / "results"
MODELS_DIR = BASE_DIR / "models"

YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "yolo26m.pt")
IMAGE_SIZE = int(os.getenv("IMAGE_SIZE", "640"))
CONF_THRESHOLD = float(os.getenv("CONF_THRESHOLD", "0.25"))
IOU_THRESHOLD = float(os.getenv("IOU_THRESHOLD", "0.45"))
FRAME_SKIP = int(os.getenv("FRAME_SKIP", "1"))
DRAW_TRAILS = os.getenv("DRAW_TRAILS", "true").strip().lower() in {"1", "true", "yes", "on"}
MAX_TRAIL_LENGTH = int(os.getenv("MAX_TRAIL_LENGTH", "30"))
ENABLE_BUS_TO_TRAIN_HEURISTIC = os.getenv("ENABLE_BUS_TO_TRAIN_HEURISTIC", "true").strip().lower() in {"1", "true", "yes", "on"}
BUS_TO_TRAIN_ASPECT_RATIO_THRESHOLD = float(os.getenv("BUS_TO_TRAIN_ASPECT_RATIO_THRESHOLD", "3.0"))
BUS_TO_TRAIN_MIN_AREA = int(os.getenv("BUS_TO_TRAIN_MIN_AREA", "25000"))
VEHICLE_CLASS_IDS = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    6: "train",
    7: "truck",
}


def get_env_summary() -> dict[str, str]:
    return {
        "BASE_DIR": str(BASE_DIR),
        "STORAGE_DIR": str(STORAGE_DIR),
        "UPLOAD_DIR": str(UPLOAD_DIR),
        "RESULT_DIR": str(RESULT_DIR),
        "MODELS_DIR": str(MODELS_DIR),
        "YOLO_MODEL_PATH": YOLO_MODEL_PATH,
    }
