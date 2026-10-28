from fastapi import FastAPI

from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.project_name,
    version="0.1.0",
)


@app.get("/health", tags=["system"], summary="Check application health")
def health() -> dict[str, str]:
    """Return a minimal liveness response without touching external dependencies."""

    return {"status": "ok"}
