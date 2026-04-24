# Smart Drone Traffic Analyzer

Smart Drone Traffic Analyzer is a proof-of-concept full-stack computer vision system for drone traffic analysis. A user uploads an MP4 drone clip, the backend processes it in the background, vehicle detections are tracked frame by frame with ByteTrack, double counting is prevented, and the frontend presents progress, the annotated result video, and a downloadable CSV report.

## Overview

The pipeline was first validated in Google Colab using `ANTS_Assesment.ipynb`. The final application does not depend on Colab and is organized as a production-style FastAPI + Next.js workspace.

## Features

- MP4 upload from the browser.
- Background video processing in FastAPI.
- YOLO-based vehicle detection with ByteTrack tracking.
- Unique track counting to prevent double-counting.
- Annotated output video with bounding boxes, tracking IDs, class labels, and confidence.
- CSV report generation.
- JSON summary generation.
- Polling UI with progress and status updates.

## Tech Stack

- Backend: FastAPI, OpenCV, Ultralytics YOLO, Torch, Pandas.
- Frontend: Next.js, TypeScript, Tailwind CSS.
- Communication: REST APIs.

## Architecture

The repository is split into a backend service and a frontend client.

- `backend/` contains the FastAPI app, CV pipeline, and in-memory job store.
- `frontend/` contains the operator UI that uploads files and polls job state.
- `backend/storage/uploads/{job_id}/` stores the uploaded MP4.
- `backend/storage/results/{job_id}/` stores the annotated MP4, CSV report, and summary JSON.

## System Workflow

1. The user selects a `.mp4` drone video.
2. The frontend uploads it to `POST /api/jobs/upload`.
3. The backend saves the file and creates an in-memory job record.
4. Background processing loads the YOLO model and runs ByteTrack on each frame.
5. Each unique `track_id` is counted once, with a bus-to-train correction heuristic for top-down drone footage.
6. The backend writes an annotated output video, a CSV report, and a JSON summary.
7. The frontend polls job status until the job is completed, then displays the result video and summary.

## Computer Vision Pipeline

The backend uses the same core behavior from the notebook prototype:

- Ultralytics YOLO for detection.
- `model.track(..., tracker="bytetrack.yaml")` for tracking.
- OpenCV for frame reading and video writing.
- ByteTrack IDs to prevent double-counting.
- CSV report rows with frame, timestamp, confidence, bounding box, and event metadata.
- Summary JSON with counts, timing, and configuration details.

### YOLO26m Model Choice

The default model is `YOLO_MODEL_PATH=yolo26m.pt` because it is lighter and more suitable for low-resource machines. The backend also supports a local weight file at `backend/models/yolo26m.pt`, and the path can be overridden with an environment variable.

### ByteTrack Tracking Methodology

ByteTrack is used through Ultralytics tracking. Each detection receives a track ID, and the backend stores the first time that ID appears. After that, repeated observations update `last_seen_frame` and `last_seen_time` without increasing the unique count.

### Double-Counting Prevention

Counting is keyed by unique `track_id`, not by raw detections. If a vehicle is seen across many frames, it still contributes only once to the final vehicle total.

### Bus-to-Train Heuristic

Drone footage can make trains look like buses from above. The backend includes a simple post-processing heuristic: if a detection is labeled as bus, is sufficiently elongated, and has a large enough area, the label is corrected to train for reporting and counting.

## Report Format

The CSV contains these columns:

- `track_id`
- `vehicle_type`
- `frame_number`
- `timestamp_seconds`
- `confidence`
- `x1`
- `y1`
- `x2`
- `y2`
- `event`

The JSON summary includes total count, class breakdown, processing duration, total frames, FPS, counting method, file paths, model metadata, and class correction metadata.

## API Endpoints

- `GET /api/health`
- `GET /api/jobs`
- `POST /api/jobs/upload`
- `GET /api/jobs/{job_id}/status`
- `GET /api/jobs/{job_id}/summary`
- `GET /api/jobs/{job_id}/video`
- `GET /api/jobs/{job_id}/report`

## Backend Setup

See [backend/README.md](backend/README.md) for Python environment setup, dependencies, and the Uvicorn command.

## Frontend Setup

See [frontend/README.md](frontend/README.md) for the Next.js client setup and `.env.local` configuration.

## How to Run Locally

We have provided simple Windows scripts to make running the project as easy as possible.

**1. First-time Setup:**
Double-click `setup.bat` in the project root. This will automatically install Python dependencies for the backend, Node modules for the frontend, and configure the `.env` files.

**2. Running the Application:**
Double-click `start.bat` in the project root. This will open two new command windows:
- The Backend FastAPI server running at `http://localhost:8000`
- The Frontend Next.js app running at `http://localhost:3000`

Once started, simply open `http://localhost:3000` in your web browser.

## Demo and Testing Guidance

- Use a short 30-60 second clip for demo and smoke testing.
- Long videos are supported, but processing time depends on hardware.
- Dataset-02 is long, so avoid processing the full clip during a demo unless hardware and time allow it.
- Keep demo clips small enough that the polling UI can show the transition from uploaded to processing to completed.

## Low-Configuration Optimization Choices

- `YOLO26n` is the default model to reduce load.
- The app uses background processing so the UI remains responsive.
- The job store is in-memory to avoid database overhead for the assessment.
- The backend falls back to CPU when CUDA is not available.

## Engineering Assumptions

- One upload equals one job.
- The input is a standard `.mp4` drone video.
- The proof of concept does not need authentication, persistence, or a database.
- The environment will install the packages listed in `backend/requirements.txt` and the frontend package files.

## Known Limitations

- The job store resets when the backend process restarts.
- The model is not retrained; the pipeline relies on the provided detector weights.
- Processing time scales with video length and hardware capability.
- The browser UI assumes the backend is reachable at `http://localhost:8000/api`.

## Future Improvements

- Replace the in-memory job store with a database-backed queue.
- Add authentication and upload quotas.
- Add resumable uploads for larger clips.
- Store progress history for richer job timelines.
- Expand the frontend with job history and side-by-side comparison views.

## Demo Recording Guide

1. Launch the backend and frontend locally.
2. Open the frontend and upload a short MP4 sample.
3. Show the loading/progress state while processing runs.
4. Show the completed summary and the annotated video playback.
5. Download the CSV report and mention where the files are stored under `backend/storage/results/{job_id}/`.

