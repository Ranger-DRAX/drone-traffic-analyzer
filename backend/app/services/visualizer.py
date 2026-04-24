from __future__ import annotations

import importlib
from collections import defaultdict

from app.config import DRAW_TRAILS, MAX_TRAIL_LENGTH


def _get_cv2():
    return importlib.import_module("cv2")


track_history: dict[int, list[tuple[int, int]]] = defaultdict(list)


def reset_track_history() -> None:
    track_history.clear()


def draw_box(frame, bbox, track_id, vehicle_type, confidence):
    cv2 = _get_cv2()
    x1, y1, x2, y2 = map(int, bbox)
    label = f"ID {track_id} | {vehicle_type} | {confidence:.2f}"

    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
    label_y = max(y1 - 10, 20)
    cv2.putText(
        frame,
        label,
        (x1, label_y),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,
        (0, 255, 0),
        2,
        cv2.LINE_AA,
    )
    return frame


def draw_trail(frame, bbox, track_id):
    if not DRAW_TRAILS:
        return frame

    cv2 = _get_cv2()
    x1, y1, x2, y2 = map(int, bbox)
    center_x = int((x1 + x2) / 2)
    center_y = int((y1 + y2) / 2)

    track_history[track_id].append((center_x, center_y))
    if len(track_history[track_id]) > MAX_TRAIL_LENGTH:
        track_history[track_id].pop(0)

    points = track_history[track_id]
    for index in range(1, len(points)):
        cv2.line(frame, points[index - 1], points[index], (255, 255, 0), 2)
    return frame


def draw_summary_overlay(frame, total_count, vehicle_type_breakdown, progress_percent=None):
    cv2 = _get_cv2()
    y = 30

    cv2.putText(
        frame,
        f"Total Unique Vehicles: {total_count}",
        (20, y),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 0, 255),
        2,
        cv2.LINE_AA,
    )

    y += 35
    breakdown_text = " | ".join([f"{vehicle_type}: {count}" for vehicle_type, count in vehicle_type_breakdown.items()])
    if breakdown_text:
        cv2.putText(
            frame,
            breakdown_text,
            (20, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (0, 0, 255),
            2,
            cv2.LINE_AA,
        )

    if progress_percent is not None:
        y += 35
        cv2.putText(
            frame,
            f"Progress: {progress_percent:.1f}%",
            (20, y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (255, 0, 0),
            2,
            cv2.LINE_AA,
        )
    return frame
