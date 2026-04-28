from __future__ import annotations

import importlib
import time
from functools import lru_cache
from pathlib import Path
from typing import Callable, Optional

from app.config import (
    BASE_DIR,
    BUS_TO_TRAIN_ASPECT_RATIO_THRESHOLD,
    BUS_TO_TRAIN_MIN_AREA,
    CONF_THRESHOLD,
    ENABLE_BUS_TO_TRAIN_HEURISTIC,
    FRAME_SKIP,
    IMAGE_SIZE,
    IOU_THRESHOLD,
    MODELS_DIR,
    RESULT_DIR,
    VEHICLE_CLASS_IDS,
    YOLO_MODEL_PATH,
)

from app.services.file_utils import ensure_dir, save_json
from app.services.report_generator import build_summary, save_detection_report
from app.services.visualizer import (
    draw_box,
    draw_trail,
    draw_summary_overlay,
    reset_track_history,
)


def _load_module(name: str):
    return importlib.import_module(name)


def _resolve_model_path() -> Path:
    raw_value = YOLO_MODEL_PATH
    candidate_names = [Path(raw_value)]

    if not Path(raw_value).is_absolute():
        candidate_names.extend(
            [
                BASE_DIR / raw_value,
                BASE_DIR.parent / raw_value,
                MODELS_DIR / raw_value,
                MODELS_DIR / Path(raw_value).name,
                RESULT_DIR / raw_value,
                RESULT_DIR / Path(raw_value).name,
                Path.cwd() / raw_value,
            ]
        )

    for candidate in candidate_names:
        if candidate.exists():
            return candidate

    raise FileNotFoundError(
        "YOLO model file not found. Set YOLO_MODEL_PATH to a valid .pt file or place "
        f"yolo26m.pt in {MODELS_DIR}"
    )


@lru_cache(maxsize=1)
def _load_yolo_model():
    ultralytics = _load_module("ultralytics")
    model_path = _resolve_model_path()

    try:
        return ultralytics.YOLO(str(model_path))
    except Exception as exc:
        raise RuntimeError(f"Failed to load YOLO model from {model_path}: {exc}") from exc


def _should_correct_bus_to_train(vehicle_type: str, bbox: list[float]) -> bool:
    if not ENABLE_BUS_TO_TRAIN_HEURISTIC or vehicle_type != "bus":
        return False

    x1, y1, x2, y2 = bbox
    width = abs(float(x2) - float(x1))
    height = abs(float(y2) - float(y1))

    if width <= 0 or height <= 0:
        return False

    aspect_ratio = max(width / height, height / width)
    area = width * height

    return (
        aspect_ratio >= BUS_TO_TRAIN_ASPECT_RATIO_THRESHOLD
        and area >= BUS_TO_TRAIN_MIN_AREA
    )


def _compute_vehicle_breakdown(counted_tracks: dict[int, dict[str, object]]) -> dict[str, int]:
    breakdown: dict[str, int] = {}

    for track_data in counted_tracks.values():
        vehicle_type = str(track_data.get("vehicle_type", "unknown"))
        breakdown[vehicle_type] = breakdown.get(vehicle_type, 0) + 1

    return breakdown


def _get_bbox_center(bbox: list[float]) -> tuple[int, int]:
    x1, y1, x2, y2 = bbox
    center_x = int((float(x1) + float(x2)) / 2)
    center_y = int((float(y1) + float(y2)) / 2)
    return center_x, center_y


def _get_line_side(center_y: int, line_y: int) -> str:
    return "above" if center_y < line_y else "below"


def _draw_counting_line(frame, cv2, line_y: int) -> None:
    height, width = frame.shape[:2]

    cv2.line(
        frame,
        (0, line_y),
        (width, line_y),
        (0, 255, 255),
        2,
    )

    cv2.putText(
        frame,
        "Counting Line",
        (20, max(30, line_y - 10)),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 255),
        2,
        cv2.LINE_AA,
    )


def process_video(
    input_video_path: str,
    output_video_path: str,
    output_csv_path: str,
    output_summary_path: str,
    progress_callback: Optional[Callable[[int, str], None]] = None,
) -> dict:
    cv2 = _load_module("cv2")
    torch = _load_module("torch")

    input_path = Path(input_video_path)

    if not input_path.exists():
        raise FileNotFoundError(f"Input video not found: {input_video_path}")

    ensure_dir(Path(output_video_path).parent)
    ensure_dir(Path(output_csv_path).parent)
    ensure_dir(Path(output_summary_path).parent)

    reset_track_history()

    if progress_callback:
        progress_callback(0, "Loading YOLO model")

    try:
        model = _load_yolo_model()
    except Exception as exc:
        raise RuntimeError(f"Unable to load the YOLO model: {exc}") from exc

    if torch.cuda.is_available():
        device = 0

        try:
            model.to("cuda")
        except Exception as exc:
            raise RuntimeError(
                f"CUDA is available but the model could not be moved to GPU: {exc}"
            ) from exc
    else:
        device = "cpu"

    print(f"Using device: {device}")

    cap = cv2.VideoCapture(str(input_path))

    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {input_video_path}")

    fps = float(cap.get(cv2.CAP_PROP_FPS) or 0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    writer = cv2.VideoWriter(
        str(output_video_path),
        cv2.VideoWriter_fourcc(*"avc1"),
        fps if fps > 0 else 30.0,
        (width, height),
    )

    if not writer.isOpened():
        cap.release()
        raise RuntimeError(f"Could not create output video writer: {output_video_path}")

    # ------------------------------------------------------------------
    # Line-crossing counting state
    # ------------------------------------------------------------------
    # Horizontal counting line at 60% of the frame height.
    # You can change this value depending on the road position.
    counting_line_y = int(height * 0.60)

    # Stores the last known side of each track_id.
    track_sides: dict[int, str] = {}

    # Stores first detection information for each track before it is counted.
    track_first_seen: dict[int, dict[str, object]] = {}

    # Stores only vehicles that actually crossed the counting line.
    counted_tracks: dict[int, dict[str, object]] = {}

    report_rows: list[dict[str, object]] = []

    frame_number = 0
    last_reported_progress = -1
    start_time = time.time()

    try:
        while True:
            ret, frame = cap.read()

            if not ret:
                break

            frame_number += 1

            progress = int((frame_number / total_frames) * 100) if total_frames > 0 else 0

            # Draw counting line even on skipped frames.
            _draw_counting_line(frame, cv2, counting_line_y)

            if FRAME_SKIP > 1 and frame_number % FRAME_SKIP != 0:
                draw_summary_overlay(
                    frame,
                    total_count=len(counted_tracks),
                    vehicle_type_breakdown=_compute_vehicle_breakdown(counted_tracks),
                    progress_percent=progress,
                )

                writer.write(frame)

                if progress_callback and (
                    progress != last_reported_progress
                    or frame_number == total_frames
                ):
                    progress_callback(
                        progress,
                        f"Processing frame {frame_number}/{total_frames or frame_number}",
                    )
                    last_reported_progress = progress

                continue

            results = model.track(
                frame,
                persist=True,
                tracker="bytetrack.yaml",
                imgsz=IMAGE_SIZE,
                conf=CONF_THRESHOLD,
                iou=IOU_THRESHOLD,
                classes=list(VEHICLE_CLASS_IDS.keys()),
                verbose=False,
                device=device,
            )

            if results and len(results) > 0:
                result = results[0]

                if result.boxes is not None and result.boxes.id is not None:
                    boxes = result.boxes

                    xyxy_list = boxes.xyxy.cpu().tolist()
                    conf_list = boxes.conf.cpu().tolist()
                    cls_list = boxes.cls.cpu().tolist()
                    id_list = boxes.id.cpu().tolist()

                    for bbox, confidence, class_id, track_id in zip(
                        xyxy_list,
                        conf_list,
                        cls_list,
                        id_list,
                    ):
                        class_id = int(class_id)
                        track_id = int(track_id)
                        confidence = float(confidence)

                        if class_id not in VEHICLE_CLASS_IDS:
                            continue

                        vehicle_type = VEHICLE_CLASS_IDS[class_id]

                        if _should_correct_bus_to_train(vehicle_type, bbox):
                            class_id = 6
                            vehicle_type = "train"

                        timestamp_seconds = frame_number / fps if fps > 0 else 0.0

                        center_x, center_y = _get_bbox_center(bbox)
                        current_side = _get_line_side(center_y, counting_line_y)
                        previous_side = track_sides.get(track_id)

                        if track_id not in track_first_seen:
                            track_first_seen[track_id] = {
                                "vehicle_type": vehicle_type,
                                "first_seen_frame": frame_number,
                                "first_seen_time": round(timestamp_seconds, 2),
                            }

                        # Update bus -> train correction even before counting.
                        if (
                            track_first_seen[track_id]["vehicle_type"] == "bus"
                            and vehicle_type == "train"
                        ):
                            track_first_seen[track_id]["vehicle_type"] = "train"

                        line_crossed = (
                            previous_side is not None
                            and previous_side != current_side
                        )

                        event = "detected"

                        # Count only when the vehicle crosses the virtual line.
                        if line_crossed and track_id not in counted_tracks:
                            counted_vehicle_type = str(
                                track_first_seen[track_id].get(
                                    "vehicle_type",
                                    vehicle_type,
                                )
                            )

                            # If current frame corrected bus to train, preserve train.
                            if counted_vehicle_type == "bus" and vehicle_type == "train":
                                counted_vehicle_type = "train"

                            counted_tracks[track_id] = {
                                "vehicle_type": counted_vehicle_type,
                                "first_seen_frame": track_first_seen[track_id][
                                    "first_seen_frame"
                                ],
                                "first_seen_time": track_first_seen[track_id][
                                    "first_seen_time"
                                ],
                                "counted_frame": frame_number,
                                "counted_time": round(timestamp_seconds, 2),
                                "last_seen_frame": frame_number,
                                "last_seen_time": round(timestamp_seconds, 2),
                                "crossing_direction": f"{previous_side}_to_{current_side}",
                            }

                            event = "line_crossed"

                        elif track_id in counted_tracks:
                            counted_tracks[track_id]["last_seen_frame"] = frame_number
                            counted_tracks[track_id]["last_seen_time"] = round(
                                timestamp_seconds,
                                2,
                            )

                            if (
                                counted_tracks[track_id]["vehicle_type"] == "bus"
                                and vehicle_type == "train"
                            ):
                                counted_tracks[track_id]["vehicle_type"] = "train"

                        # Important: update side after checking crossing.
                        track_sides[track_id] = current_side

                        x1, y1, x2, y2 = [float(value) for value in bbox]

                        report_rows.append(
                            {
                                "track_id": track_id,
                                "vehicle_type": vehicle_type,
                                "frame_number": frame_number,
                                "timestamp_seconds": round(timestamp_seconds, 2),
                                "confidence": round(confidence, 4),
                                "x1": round(x1, 2),
                                "y1": round(y1, 2),
                                "x2": round(x2, 2),
                                "y2": round(y2, 2),
                                "center_x": center_x,
                                "center_y": center_y,
                                "line_y": counting_line_y,
                                "side": current_side,
                                "event": event,
                            }
                        )

                        draw_box(frame, bbox, track_id, vehicle_type, confidence)
                        draw_trail(frame, bbox, track_id)

            draw_summary_overlay(
                frame,
                total_count=len(counted_tracks),
                vehicle_type_breakdown=_compute_vehicle_breakdown(counted_tracks),
                progress_percent=progress,
            )

            writer.write(frame)

            if progress_callback and (
                progress != last_reported_progress
                or frame_number == total_frames
            ):
                progress_callback(
                    progress,
                    f"Processing frame {frame_number}/{total_frames or frame_number}",
                )
                last_reported_progress = progress

    finally:
        cap.release()
        writer.release()

        if torch.cuda.is_available():
            torch.cuda.empty_cache()

    processing_duration_seconds = time.time() - start_time

    save_detection_report(report_rows, output_csv_path)

    summary = build_summary(
        counted_tracks=counted_tracks,
        processing_duration_seconds=processing_duration_seconds,
        total_frames=total_frames,
        fps=fps,
    )

    summary.update(
        {
            "input_video_path": input_video_path,
            "output_video_path": output_video_path,
            "csv_report_path": output_csv_path,
            "summary_json_path": output_summary_path,
            "model": str(_resolve_model_path()),
            "image_size": IMAGE_SIZE,
            "confidence_threshold": CONF_THRESHOLD,
            "iou_threshold": IOU_THRESHOLD,
            "frame_skip": FRAME_SKIP,
            "device": "cuda:0" if torch.cuda.is_available() else "cpu",
            "counting_logic": {
                "type": "line_crossing",
                "line_orientation": "horizontal",
                "line_y": counting_line_y,
                "rule": "Vehicle is counted only when its tracked center point crosses the virtual counting line.",
            },
            "class_correction": {
                "enabled": ENABLE_BUS_TO_TRAIN_HEURISTIC,
                "rule": "Elongated, large bus detections are relabeled as train for top-down drone footage.",
                "aspect_ratio_threshold": BUS_TO_TRAIN_ASPECT_RATIO_THRESHOLD,
                "min_area": BUS_TO_TRAIN_MIN_AREA,
            },
        }
    )

    save_json(summary, output_summary_path)

    if progress_callback:
        progress_callback(100, "Processing complete")

    return summary