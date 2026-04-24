from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

from app.config import BASE_DIR, RESULT_DIR, STORAGE_DIR, UPLOAD_DIR


@dataclass(frozen=True)
class JobPaths:
    job_id: str
    upload_dir: Path
    result_dir: Path
    input_video_path: Path
    output_video_path: Path
    csv_report_path: Path
    summary_json_path: Path


def ensure_dir(path: str | Path) -> Path:
    directory = Path(path)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def save_json(data: dict, output_path: str | Path) -> Path:
    output_file = Path(output_path)
    ensure_dir(output_file.parent)
    with output_file.open("w", encoding="utf-8") as file_handle:
        json.dump(data, file_handle, indent=2)
    return output_file


def load_json(path: str | Path) -> dict:
    with Path(path).open("r", encoding="utf-8") as file_handle:
        return json.load(file_handle)


def get_safe_filename(name: str) -> str:
    filename = Path(name).name
    stem = Path(filename).stem
    suffix = Path(filename).suffix.lower()
    safe_stem = re.sub(r"[^A-Za-z0-9._-]+", "_", stem).strip("._-") or "file"
    return f"{safe_stem}{suffix}"


def get_video_name_without_ext(video_path: str | Path) -> str:
    return get_safe_filename(Path(video_path).name).rsplit(".", 1)[0]


def create_job_paths(job_id: str) -> JobPaths:
    upload_dir = ensure_dir(UPLOAD_DIR / job_id)
    result_dir = ensure_dir(RESULT_DIR / job_id)

    return JobPaths(
        job_id=job_id,
        upload_dir=upload_dir,
        result_dir=result_dir,
        input_video_path=upload_dir / "input.mp4",
        output_video_path=result_dir / "output.mp4",
        csv_report_path=result_dir / "report.csv",
        summary_json_path=result_dir / "summary.json",
    )
