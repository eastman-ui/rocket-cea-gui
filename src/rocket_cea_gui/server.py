from __future__ import annotations

import os

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from .api import cea, cad, export

app = FastAPI(title="Rocket CEA GUI", version="0.1.0")

app.include_router(cea.router, prefix="/api/cea", tags=["CEA"])
app.include_router(cad.router, prefix="/api/cad", tags=["CAD"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/favicon.ico")
def favicon_ico():
    return RedirectResponse(url="/favicon.svg")


# Serve React SPA from static/ when built
_static_dir = os.path.join(os.path.dirname(__file__), "static")
_has_static = os.path.isdir(_static_dir) and os.path.exists(os.path.join(_static_dir, "index.html"))

if _has_static:
    app.mount("/assets", StaticFiles(directory=os.path.join(_static_dir, "assets")), name="assets")

    @app.get("/favicon.svg")
    def favicon_svg():
        return FileResponse(os.path.join(_static_dir, "favicon.svg"))

    @app.get("/{path:path}")
    def spa_fallback(path: str, request: Request):
        # Serve index.html for all non-API, non-static routes (SPA routing)
        file_path = os.path.join(_static_dir, path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(_static_dir, "index.html"))