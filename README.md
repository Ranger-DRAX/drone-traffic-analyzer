# Smart Drone Traffic Analyzer

Smart Drone Traffic Analyzer is a proof-of-concept full-stack computer vision system for drone traffic analysis. A user uploads an MP4 drone clip, the backend processes it in the background, vehicle detections are tracked frame by frame with ByteTrack, double counting is prevented, and the frontend presents progress, the annotated result video, and a downloadable CSV report.

## Overview

The pipeline was first validated in Google Colab using `ANTS_Assesment.ipynb`. The final application does not depend on Colab and is organized as a production-style FastAPI + Next.js workspace.

## Live Demo & Resources

- **Frontend Application (Vercel):** [https://drone-traffic-analyzer.vercel.app/](https://drone-traffic-analyzer.vercel.app/)
- **Backend Service (Hugging Face Space):** [Traffic Analyzer Space](https://huggingface.co/spaces/Ranger10017/Traffic_Analyzer)
- **Video Demonstration:** [Watch on YouTube](https://youtu.be/QvX2rUuziJw)


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

## Project Structure

```text
smart-drone-traffic-analyzer/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py 
│   │   ├── config.py                # Environment/configuration settings
│   │   ├── main.py                  # FastAPI application entry point
│   │   │
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   └── jobs.py              # REST API endpoints for job processing and status
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   └── job.py               # API response/request schemas
│   │   │
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── file_utils.py        # Upload/result file path management
│   │       ├── job_store.py         # In-memory job store and status handling
│   │       ├── report_generator.py  # CSV/JSON report generation
│   │       ├── video_processor.py   # Main CV pipeline: detection, tracking, counting
│   │       └── visualizer.py        # Video annotation and bounding box drawing
│   │
│   ├── models/
│   │   └── yolo26m.pt               # Local YOLO model weights
│   │
│   ├── storage/
│   │   ├── results/                 # Job folders with annotated videos, CSVs, and JSONs
│   │   └── uploads/                 # Job folders with uploaded input videos
│   │
│   ├── README.md                    # Backend setup and API details
│   └── requirements.txt             # Python backend dependencies
│
├── frontend/
│   ├── app/
│   │   ├── globals.css              # Global styles
│   │   ├── layout.tsx               # Next.js root layout
│   │   └── page.tsx                 # Main upload and result display page
│   │
│   ├── components/
│   │   ├── ErrorAlert.tsx           # Error handling/display UI
│   │   ├── ProgressBar.tsx          # Processing/loading status display
│   │   ├── SummaryCard.tsx          # Total count and class breakdown display
│   │   ├── UploadBox.tsx            # MP4 upload UI
│   │   └── VideoResult.tsx          # Annotated video preview
│   │
│   ├── lib/
│   │   └── api.ts                   # Frontend API helper functions
│   │
│   ├── eslint.config.mjs            # ESLint configuration
│   ├── next-env.d.ts                # Next.js TypeScript declarations
│   ├── next.config.ts               # Next.js configuration
│   ├── package.json                 # Frontend dependencies and scripts
│   ├── postcss.config.mjs           # PostCSS configuration
│   ├── README.md                    # Frontend setup details
│   └── tsconfig.json                # TypeScript configuration
│
├── sample_videos/                   # Provided sample videos for processing
│
├── ANTS_Assesment.ipynb             # Initial Assessment/Prototype Notebook
└── README.md                        # Main project documentation   
``` 

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

The default model is `YOLO_MODEL_PATH=yolo26m.pt` because it provides stronger detection accuracy than smaller variants, which is useful for challenging drone footage and cases where trains or large vehicles may be confused with buses. This comes with higher compute cost, so the model path can be overridden with an environment variable. For lower-resource machines, `yolo26s.pt` or `yolo26n.pt` can be used instead.

### ByteTrack Tracking Methodology

ByteTrack is used through Ultralytics tracking. Each detection receives a track ID, and the backend stores the first time that ID appears. After that, repeated observations update `last_seen_frame` and `last_seen_time` without increasing the unique count.

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

## Demo and Testing Guidance

- Use a short 30-60 second clip for demo and smoke testing.
- Long videos are supported, but processing time depends on hardware.
- Dataset-02 is long, so avoid processing the full clip during a demo unless hardware and time allow it.
- Keep demo clips small enough that the polling UI can show the transition from uploaded to processing to completed.

## Low-Configuration Optimization Choices

- - The model path is configurable. `YOLO26m` is used for better accuracy, while smaller variants such as `YOLO26s` or `YOLO26n` can be selected for faster processing on lower-resource machines.
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
- The frontend now proxies browser requests through its own `/api` routes. For deployment, set `BACKEND_API_BASE_URL` on the frontend to the backend API base URL, such as `https://<space-name>.hf.space/api`.

## Future Improvements

- Replace the in-memory job store with a database-backed queue.
- Add authentication and upload quotas.
- Add resumable uploads for larger clips.
- Store progress history for richer job timelines.
- Expand the frontend with job history and side-by-side comparison views.

