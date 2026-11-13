"""Serve the compiled React SPA only when a public-web build includes /app/site.

The existing API routers are mounted first. Unknown /api routes remain 404 and
local Docker/uvicorn setups without frontend assets remain API-only.
"""
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


def attach_spa(app: FastAPI, site_dir: Path | None = None) -> bool:
    root = site_dir if site_dir is not None else Path(__file__).resolve().parents[1] / "site"
    index = root / "index.html"
    assets = root / "assets"
    if not index.is_file() or not assets.is_dir():
        return False

    app.mount("/assets", StaticFiles(directory=assets), name="web-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_react(full_path: str):
        # Never turn a broken API URL into index.html with HTTP 200.
        reserved = ("api", "health", "ready", "docs", "redoc", "openapi.json")
        if any(full_path == item or full_path.startswith(item + "/") for item in reserved):
            raise HTTPException(status_code=404, detail="Not found")

        # Only exact known public assets; no user-supplied filesystem paths.
        if full_path in ("favicon.svg", "icons.svg"):
            file = root / full_path
            if file.is_file():
                return FileResponse(file, headers={"Cache-Control": "public, max-age=3600"})
            raise HTTPException(status_code=404, detail="Not found")
        if full_path.startswith("assets/") or "." in full_path.rsplit("/", 1)[-1]:
            raise HTTPException(status_code=404, detail="Not found")

        return FileResponse(index, headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Content-Type-Options": "nosniff",
        })

    return True
