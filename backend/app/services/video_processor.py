from __future__ import annotations

import importlib
import shutil
import subprocess
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
    OUTPUT_VIDEO_CODECS,
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
                Path.cwd() / raw_value,
            ]
        )

    for candidate in candidate_names:
        if candidate.exists():
            return candidate.resolve()

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


def _create_video_writer(cv2, output_video_path: str, fps: float, width: int, height: int):
    if not OUTPUT_VIDEO_CODECS:
        raise RuntimeError(
            "No output video codecs configured. Set OUTPUT_VIDEO_CODECS to at least one codec."
        )

    attempted_codecs: list[str] = []
    primary_codec = OUTPUT_VIDEO_CODECS[0]

    for codec in OUTPUT_VIDEO_CODECS:
        attempted_codecs.append(codec)
        writer = cv2.VideoWriter(
            str(output_video_path),
            cv2.VideoWriter_fourcc(*codec),
            fps if fps > 0 else 30.0,
            (width, height),
        )

        if writer.isOpened():
            if codec != primary_codec:
                print(
                    "Primary video codec unavailable. "
                    f"Falling back to {codec} for {output_video_path}."
                )
            return writer, codec

        writer.release()

    tried = ", ".join(attempted_codecs) or "<none>"
    raise RuntimeError(
        "Could not create output video writer. "
        f"Tried codecs: {tried}. Output path: {output_video_path}"
    )


def _replace_output_file(source_path: Path, target_path: Path) -> None:
    ensure_dir(target_path.parent)

    if target_path.exists():
        target_path.unlink()

    source_path.replace(target_path)


def _transcode_video_for_web(source_path: Path, target_path: Path) -> None:
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        raise RuntimeError("ffmpeg is not available for browser-compatible video transcoding.")

    ensure_dir(target_path.parent)
    target_path.unlink(missing_ok=True)

    command = [
        ffmpeg_path,
        "-y",
        "-loglevel",
        "error",
        "-i",
        str(source_path),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(target_path),
    ]

    completed = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=False,
    )

    if completed.returncode != 0:
        target_path.unlink(missing_ok=True)
        error_output = (completed.stderr or completed.stdout or "").strip()
        raise RuntimeError(
            "ffmpeg failed to transcode the output video to H.264. "
            f"Details: {error_output or 'unknown ffmpeg error'}"
        )


def _finalize_output_video(
    work_output_path: Path,
    final_output_path: Path,
    actual_codec: str,
) -> dict[str, object]:
    transcoded_for_web = False

    if actual_codec.lower() not in {"avc1", "h264"}:
        transcoded_output_path = final_output_path.with_name(
            f"{final_output_path.stem}.transcoded{final_output_path.suffix}"
        )

        if shutil.which("ffmpeg"):
            try:
                _transcode_video_for_web(work_output_path, transcoded_output_path)
                work_output_path.unlink(missing_ok=True)
                _replace_output_file(transcoded_output_path, final_output_path)
                transcoded_for_web = True
                return {
                    "output_video_codec": actual_codec,
                    "output_video_transcoded_for_web": transcoded_for_web,
                }
            except Exception as exc:
                print(
                    "ffmpeg transcoding failed after OpenCV fallback encoding. "
                    f"Keeping the original output codec {actual_codec}. Details: {exc}"
                )
                transcoded_output_path.unlink(missing_ok=True)
        else:
            print(
                "ffmpeg is unavailable. Keeping the fallback output codec "
                f"{actual_codec}, which may be less browser-compatible."
            )

    _replace_output_file(work_output_path, final_output_path)
    return {
        "output_video_codec": actual_codec,
        "output_video_transcoded_for_web": transcoded_for_web,
    }


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
    final_output_path = Path(output_video_path)
    work_output_path = final_output_path.with_name(
        f"{final_output_path.stem}.work{final_output_path.suffix}"
    )

    if not input_path.exists():
        raise FileNotFoundError(f"Input video not found: {input_video_path}")

    ensure_dir(final_output_path.parent)
    ensure_dir(Path(output_csv_path).parent)
    ensure_dir(Path(output_summary_path).parent)
    work_output_path.unlink(missing_ok=True)

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

    # ------------------------------------------------------------------
    # Line-crossing counting state
    # ------------------------------------------------------------------
    # Horizontal counting line at 60% of the frame height.
    # It is initialized from the first decoded frame to avoid bad metadata.
    counting_line_y: Optional[int] = int(height * 0.60) if height > 0 else None

    # Stores the last known side of each track_id.
    track_sides: dict[int, str] = {}

    # Stores first detection information for each track before it is counted.
    track_first_seen: dict[int, dict[str, object]] = {}

    # Stores only vehicles that actually crossed the counting line.
    counted_tracks: dict[int, dict[str, object]] = {}

    report_rows: list[dict[str, object]] = []

    frame_number = 0
    decoded_frame_count = 0
    last_reported_progress = -1
    start_time = time.time()
    writer = None
    output_video_codec: Optional[str] = None
    output_video_metadata: dict[str, object] = {
        "output_video_codec": None,
        "output_video_transcoded_for_web": False,
    }
    processing_succeeded = False

    try:
        while True:
            ret, frame = cap.read()

            if not ret:
                break

            frame_number += 1
            decoded_frame_count += 1

            if writer is None:
                height, width = frame.shape[:2]
                counting_line_y = int(height * 0.60)
                writer, output_video_codec = _create_video_writer(
                    cv2,
                    str(work_output_path),
                    fps,
                    width,
                    height,
                )
            elif frame.shape[1] != width or frame.shape[0] != height:
                raise RuntimeError(
                    "Input video frame dimensions changed during processing, "
                    f"from {width}x{height} to {frame.shape[1]}x{frame.shape[0]}."
                )

            progress = int((frame_number / total_frames) * 100) if total_frames > 0 else 0

            # Draw counting line even on skipped frames.
            _draw_counting_line(frame, cv2, counting_line_y or 0)

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
                        current_side = _get_line_side(center_y, counting_line_y or 0)
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
                                "line_y": counting_line_y or 0,
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

        if decoded_frame_count == 0:
            raise RuntimeError(f"No frames could be read from video: {input_video_path}")

        if writer is None or output_video_codec is None:
            raise RuntimeError(
                "The output video writer could not be initialized from the decoded frames."
            )

        processing_succeeded = True

    finally:
        cap.release()
        if writer is not None:
            writer.release()

        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        if not processing_succeeded:
            work_output_path.unlink(missing_ok=True)

    output_video_metadata = _finalize_output_video(
        work_output_path=work_output_path,
        final_output_path=final_output_path,
        actual_codec=output_video_codec,
    )

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
            "output_video_path": str(final_output_path),
            "csv_report_path": output_csv_path,
            "summary_json_path": output_summary_path,
            "model": str(_resolve_model_path().resolve()),
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
            **output_video_metadata,
        }
    )

    save_json(summary, output_summary_path)

    if progress_callback:
        progress_callback(100, "Processing complete")

    return summary
