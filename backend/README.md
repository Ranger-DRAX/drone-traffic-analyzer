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

Start the API server with the PowerShell launcher:

```powershell
.\start-backend.ps1
```

If you prefer to run the commands manually, use the active virtual environment Python:

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open Swagger UI at:

```text
http://localhost:8000/docs
```

If you see `No module named 'cv2'`, recheck that the virtual environment is active and reinstall the backend dependencies in that same environment:

```bash
.venv\Scripts\activate
python -m pip install -r requirements.txt
python -c "import cv2; print(cv2.__version__)"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Upload Test

Use the `POST /api/jobs/upload` endpoint with a multipart form field named `file` and an `.mp4` video.

## Model Notes

- Set `YOLO_MODEL_PATH=yolo26n.pt` in `.env` or point it to `backend/models/yolo26n.pt`.
- If the model cannot be found or loaded, the backend raises a clear runtime error.
- The pipeline uses CUDA automatically when available, otherwise it falls back to CPU.
