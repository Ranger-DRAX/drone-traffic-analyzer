# Backend

FastAPI backend for the Smart Drone Traffic Analyzer proof of concept.

## Setup

Create and activate a virtual environment, then install the dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run

Start the API server with:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open Swagger UI at:

```text
http://localhost:8000/docs
```

## Upload Test

Use the `POST /api/jobs/upload` endpoint with a multipart form field named `file` and an `.mp4` video.

## Model Notes

- Set `YOLO_MODEL_PATH=yolo26n.pt` in `.env` or point it to `backend/models/yolo26n.pt`.
- If the model cannot be found or loaded, the backend raises a clear runtime error.
- The pipeline uses CUDA automatically when available, otherwise it falls back to CPU.
