from __future__ import annotations
import uuid

from fastapi import APIRouter, HTTPException

from ..api.models import CADGenerateRequest, CADGenerateResult

router = APIRouter()


@router.post("/generate", response_model=CADGenerateResult)
def generate_cad(request: CADGenerateRequest) -> CADGenerateResult:
    result_id = str(uuid.uuid4())[:8]
    return CADGenerateResult(
        id=result_id,
        stl_preview_url=f"/api/cad/files/{result_id}/preview.stl",
        step_download_url=f"/api/cad/files/{result_id}/model.step",
        openscad_download_url=f"/api/cad/files/{result_id}/model.scad",
        parameters={
            "chamber_diameter": request.chamber_diameter,
            "chamber_length": request.chamber_length,
            "wall_thickness": request.wall_thickness,
        },
    )


@router.get("/files/{result_id}/{filename}")
def download_file(result_id: str, filename: str) -> dict:
    raise HTTPException(status_code=501, detail="File generation not yet implemented")