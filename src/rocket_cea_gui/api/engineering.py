from __future__ import annotations

from fastapi import APIRouter

from ..api.models import (
    BartzHeatFluxRequest,
    BartzHeatFluxResult,
    ChamberSizingRequest,
    ChamberSizingResult,
    InjectorSizingRequest,
    InjectorSizingResult,
    InjectorElementInfo,
    InjectorElementType,
)
from ..services.bartz_heat_flux import compute_bartz_heat_flux
from ..services.chamber_sizing import size_chamber
from ..services.injector_sizing import size_injector

router = APIRouter()


@router.post("/chamber-sizing", response_model=ChamberSizingResult)
def chamber_sizing(request: ChamberSizingRequest) -> ChamberSizingResult:
    return size_chamber(request)


@router.post("/bartz-heat-flux", response_model=BartzHeatFluxResult)
def bartz_heat_flux(request: BartzHeatFluxRequest) -> BartzHeatFluxResult:
    return compute_bartz_heat_flux(request)


@router.post("/injector-sizing", response_model=InjectorSizingResult)
def injector_sizing(request: InjectorSizingRequest) -> InjectorSizingResult:
    return size_injector(request)