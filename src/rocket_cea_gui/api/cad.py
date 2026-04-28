from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ..api.models import CADGenerateRequest, CADGenerateResult, NozzleType
from ..services.cad_generator import generate_nozzle, get_file_path

router = APIRouter()


@router.post("/generate", response_model=CADGenerateResult)
def generate_cad(request: CADGenerateRequest) -> CADGenerateResult:
    import logging
    throat = request.throat_diameter if request.throat_diameter else 1.5
    exit_d = request.exit_diameter if request.exit_diameter else 9.49
    logging.info(f"CAD generate: chamber_dia={request.chamber_diameter}, chamber_len={request.chamber_length}, throat={throat}, exit={exit_d}, wall={request.wall_thickness}")
    result = generate_nozzle(
        nozzle_type=request.nozzle_type,
        chamber_diameter=request.chamber_diameter,
        chamber_length=request.chamber_length,
        wall_thickness=request.wall_thickness,
        convergence_angle=request.convergence_angle,
        divergence_angle=request.divergence_angle,
        throat_diameter=throat,
        exit_diameter=exit_d,
    )
    return CADGenerateResult(
        id=result["id"],
        stl_preview_url=result.get("stl_preview_url", ""),
        step_download_url=result.get("step_download_url", ""),
        openscad_download_url=result.get("openscad_download_url", ""),
        parameters=result["parameters"],
    )


@router.get("/files/{result_id}/{filename}")
def download_file(result_id: str, filename: str) -> FileResponse:
    path = get_file_path(result_id, filename)
    if path is None:
        raise HTTPException(status_code=404, detail="File not found")

    media_types = {
        "model.step": "application/STEP",
        "preview.stl": "model/stl",
        "model.scad": "text/plain",
    }
    media_type = media_types.get(filename, "application/octet-stream")

    return FileResponse(path, media_type=media_type, filename=filename)