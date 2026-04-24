from __future__ import annotations

import importlib
from pathlib import Path


def _get_pandas():
    return importlib.import_module("pandas")


def save_detection_report(rows: list[dict[str, object]], output_csv_path: str | Path) -> Path:
    columns = [
        "track_id",
        "vehicle_type",
        "frame_number",
        "timestamp_seconds",
        "confidence",
        "x1",
        "y1",
        "x2",
        "y2",
        "event",
    ]

    output_file = Path(output_csv_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    pandas = _get_pandas()
    dataframe = pandas.DataFrame(rows, columns=columns)
    dataframe.to_csv(output_file, index=False)
    return output_file


def build_summary(counted_tracks, processing_duration_seconds: float, total_frames: int, fps: float) -> dict[str, object]:
    vehicle_type_breakdown: dict[str, int] = {}

    for track_data in counted_tracks.values():
        vehicle_type = str(track_data.get("vehicle_type", "unknown"))
        vehicle_type_breakdown[vehicle_type] = vehicle_type_breakdown.get(vehicle_type, 0) + 1

    return {
        "total_vehicle_count": len(counted_tracks),
        "vehicle_type_breakdown": vehicle_type_breakdown,
        "processing_duration_seconds": round(processing_duration_seconds, 2),
        "total_frames": total_frames,
        "fps": fps,
        "counting_method": "Each unique ByteTrack tracking ID is counted only once.",
    }
