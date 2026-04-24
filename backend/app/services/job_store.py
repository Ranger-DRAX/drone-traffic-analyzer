from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from typing import Any

from app.services.file_utils import JobPaths


@dataclass
class JobRecord:
    job_id: str
    status: str = "uploaded"
    progress: int = 0
    message: str = "Video uploaded and processing will start shortly"
    error: str | None = None
    input_video_path: str = ""
    output_video_path: str = ""
    csv_report_path: str = ""
    summary_json_path: str = ""
    summary: dict[str, Any] | None = None
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    def to_public_dict(self, include_summary: bool = False) -> dict[str, Any]:
        payload = {
            "job_id": self.job_id,
            "status": self.status,
            "progress": self.progress,
            "message": self.message,
            "error": self.error,
            "input_video_path": self.input_video_path,
            "output_video_path": self.output_video_path,
            "csv_report_path": self.csv_report_path,
            "summary_json_path": self.summary_json_path,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
        if include_summary:
            payload["summary"] = self.summary
        return payload


_JOB_STORE: dict[str, JobRecord] = {}
_LOCK = Lock()


def create_job(job_id: str, paths: JobPaths) -> JobRecord:
    record = JobRecord(
        job_id=job_id,
        status="uploaded",
        progress=0,
        message="Video uploaded and processing started",
        input_video_path=str(paths.input_video_path),
        output_video_path=str(paths.output_video_path),
        csv_report_path=str(paths.csv_report_path),
        summary_json_path=str(paths.summary_json_path),
    )
    with _LOCK:
        _JOB_STORE[job_id] = record
    return record


def update_job(job_id: str, **kwargs: Any) -> JobRecord | None:
    with _LOCK:
        record = _JOB_STORE.get(job_id)
        if record is None:
            return None

        for key, value in kwargs.items():
            if hasattr(record, key):
                setattr(record, key, value)
        record.updated_at = datetime.now(timezone.utc).isoformat()
        return record


def get_job(job_id: str) -> JobRecord | None:
    with _LOCK:
        return _JOB_STORE.get(job_id)


def mark_failed(job_id: str, error_message: str) -> JobRecord | None:
    with _LOCK:
        record = _JOB_STORE.get(job_id)
        if record is None:
            return None
        record.status = "failed"
        record.error = error_message
        record.message = error_message
        record.updated_at = datetime.now(timezone.utc).isoformat()
        return record


def list_jobs() -> list[JobRecord]:
    with _LOCK:
        return sorted(_JOB_STORE.values(), key=lambda item: item.created_at, reverse=True)


def clear_jobs() -> None:
    with _LOCK:
        _JOB_STORE.clear()