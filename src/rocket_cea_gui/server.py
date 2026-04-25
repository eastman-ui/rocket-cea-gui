from __future__ import annotations
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .api import cea, cad, export

app = FastAPI(title="Rocket CEA GUI", version="0.1.0")

app.include_router(cea.router, prefix="/api/cea", tags=["CEA"])
app.include_router(cad.router, prefix="/api/cad", tags=["CAD"])
app.include_router(export.router, prefix="/api/export", tags=["Export"])


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


# Serve React SPA from static/ when built
import os

_static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(_static_dir) and os.path.exists(os.path.join(_static_dir, "index.html")):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")