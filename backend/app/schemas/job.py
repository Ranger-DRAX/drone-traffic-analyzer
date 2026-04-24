from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class JobUploadResponse(BaseModel):
    job_id: str
    status: str
    message: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: int
    message: str
    error: str | None = None
    input_video_path: str | None = None
    output_video_path: str | None = None
    csv_report_path: str | None = None
    summary_json_path: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class JobSummaryResponse(BaseModel):
    job_id: str
    status: str
    summary: dict[str, Any]


class JobCreate(BaseModel):
    source_name: str = Field(min_length=1, max_length=255)


class JobRead(BaseModel):
    job_id: str
    status: str
    progress: int
    message: str
    error: str | None = None
