from __future__ import annotations
import uuid

from fastapi import APIRouter, HTTPException

from ..api.models import RocketPyExportRequest, RocketPyExportResult

router = APIRouter()


@router.post("/rocketpy", response_model=RocketPyExportResult)
def export_rocketpy(request: RocketPyExportRequest) -> RocketPyExportResult:
    result_id = str(uuid.uuid4())[:8]
    ext = {"python": "py", "json": "json", "notebook": "ipynb"}[request.format.value]
    return RocketPyExportResult(
        id=result_id,
        download_url=f"/api/export/download/{result_id}/rocketpy_config.{ext}",
        filename=f"rocketpy_config.{ext}",
    )


@router.get("/download/{result_id}/{filename}")
def download_export(result_id: str, filename: str) -> dict:
    raise HTTPException(status_code=501, detail="Export generation not yet implemented")