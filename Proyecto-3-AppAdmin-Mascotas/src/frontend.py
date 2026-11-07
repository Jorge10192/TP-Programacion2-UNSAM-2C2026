"""Serve the built React app alongside the API, without a second web service."""
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


def install_frontend(app: FastAPI, directory: Path | None = None) -> None:
    directory = directory or Path(os.getenv(
        "WALOS_FRONTEND_DIR", str(Path(__file__).resolve().parents[1] / "static")
    ))
    index = directory / "index.html"
    if not index.is_file():
        return

    if (directory / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=directory / "assets"), name="frontend-assets")

    def page():
        return FileResponse(index, headers={"Cache-Control": "no-cache"})

    for route in ("/", "/index.html", "/inicio", "/perfil", "/empresas/nueva", "/login"):
        app.add_api_route(route, page, methods=["GET"], include_in_schema=False)

    @app.get("/b/{business_id}/{section}", include_in_schema=False)
    def business_page(business_id: str, section: str):
        return page()

    @app.get("/favicon.svg", include_in_schema=False)
    def favicon():
        if not (directory / "favicon.svg").is_file():
            raise HTTPException(404)
        return FileResponse(directory / "favicon.svg")

    @app.get("/icons.svg", include_in_schema=False)
    def icons():
        if not (directory / "icons.svg").is_file():
            raise HTTPException(404)
        return FileResponse(directory / "icons.svg")
