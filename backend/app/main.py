from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import BASE_DIR, RESULT_DIR, STORAGE_DIR, UPLOAD_DIR
from app.routes.jobs import router as jobs_router
from app.services.file_utils import ensure_dir

for directory in (STORAGE_DIR, UPLOAD_DIR, RESULT_DIR, BASE_DIR / "models"):
    ensure_dir(directory)

app = FastAPI(title="Smart Drone Traffic Analyzer")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(jobs_router, prefix="/api")


@app.get("/api/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "message": "Smart Drone Traffic Analyzer backend is running",
    }
