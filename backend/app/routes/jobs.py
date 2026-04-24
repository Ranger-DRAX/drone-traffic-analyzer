from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse, StreamingResponse
import os
import re

from app.config import YOLO_MODEL_PATH
from app.schemas.job import JobStatusResponse, JobSummaryResponse, JobUploadResponse
from app.services.file_utils import create_job_paths, get_safe_filename
from app.services.job_store import create_job, get_job, list_jobs, mark_failed, update_job
from app.services.video_processor import process_video

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _status_payload(job) -> JobStatusResponse:
    return JobStatusResponse.model_validate(job.to_public_dict())


def _save_upload(file: UploadFile, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as output_handle:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            output_handle.write(chunk)


def range_requests_response(
    request: Request, file_path: str, content_type: str
):
    file_size = os.stat(file_path).st_size
    range_header = request.headers.get("range")

    headers = {
        "content-type": content_type,
        "accept-ranges": "bytes",
        "content-encoding": "identity",
        "content-length": str(file_size),
        "access-control-expose-headers": (
            "content-type, accept-ranges, content-length, "
            "content-range, content-encoding"
        ),
    }

    if range_header is None:
        return FileResponse(file_path, headers=headers, media_type=content_type)

    start, end = 0, file_size - 1
    range_match = re.match(r"bytes=(\d+)-(\d*)", range_header)
    if range_match:
        start_str, end_str = range_match.groups()
        start = int(start_str)
        if end_str:
            end = int(end_str)

    end = min(end, file_size - 1)
    length = end - start + 1
    headers["content-length"] = str(length)
    headers["content-range"] = f"bytes {start}-{end}/{file_size}"

    def file_iterator(file_path: str, offset: int, bytes_to_read: int):
        with open(file_path, "rb") as f:
            f.seek(offset)
            chunk_size = 1024 * 1024
            while bytes_to_read > 0:
                read_size = min(chunk_size, bytes_to_read)
                data = f.read(read_size)
                if not data:
                    break
                bytes_to_read -= len(data)
                yield data

    return StreamingResponse(
        file_iterator(file_path, start, length),
        headers=headers,
        status_code=206,
        media_type=content_type,
    )


def _process_job(job_id: str) -> None:
    job = get_job(job_id)
    if job is None:
        return

    update_job(job_id, status="processing", progress=0, message="Processing video")

    def progress_callback(progress: int, message: str) -> None:
        update_job(job_id, progress=progress, message=message)

    try:
        summary = process_video(
            input_video_path=job.input_video_path,
            output_video_path=job.output_video_path,
            output_csv_path=job.csv_report_path,
            output_summary_path=job.summary_json_path,
            progress_callback=progress_callback,
        )
        update_job(
            job_id,
            status="completed",
            progress=100,
            message="Processing completed",
            error=None,
            summary=summary,
        )
    except Exception as exc:
        mark_failed(job_id, str(exc))


@router.get("", response_model=list[JobStatusResponse])
def list_jobs_endpoint() -> list[JobStatusResponse]:
    return [_status_payload(job) for job in list_jobs()]


@router.post("/upload", response_model=JobUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)) -> JobUploadResponse:
    filename = get_safe_filename(file.filename or "upload.mp4")
    if not filename.lower().endswith(".mp4"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only MP4 files are supported")

    job_id = str(uuid4())
    paths = create_job_paths(job_id)
    create_job(job_id, paths)

    try:
        _save_upload(file, paths.input_video_path)
    except Exception as exc:
        mark_failed(job_id, f"Failed to save uploaded video: {exc}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save uploaded video") from exc
    finally:
        await file.close()

    background_tasks.add_task(_process_job, job_id)
    return JobUploadResponse(job_id=job_id, status="uploaded", message="Video uploaded and processing started")


@router.get("/{job_id}/status", response_model=JobStatusResponse)
def get_job_status(job_id: str) -> JobStatusResponse:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return _status_payload(job)


@router.get("/{job_id}/summary", response_model=JobSummaryResponse)
def get_job_summary(job_id: str) -> JobSummaryResponse:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.status != "completed" or job.summary is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Job is not completed yet")
    return JobSummaryResponse(job_id=job.job_id, status=job.status, summary=job.summary)


@router.get("/{job_id}/video")
def get_job_video(job_id: str, request: Request):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.status != "completed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Job is not completed yet")

    output_path = Path(job.output_video_path)
    if not output_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Processed video not found")

    return range_requests_response(request, str(output_path), "video/mp4")


@router.get("/{job_id}/report")
def get_job_report(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.status != "completed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Job is not completed yet")

    report_path = Path(job.csv_report_path)
    if not report_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CSV report not found")

    return FileResponse(report_path, media_type="text/csv", filename=report_path.name)
