from __future__ import annotations
from fastapi import APIRouter, HTTPException

from ..services.cea_solver import run_cea, get_result
from ..services.cea_species import search
from ..api.models import CEARunRequest, CEAResult, SpeciesSearchResult

router = APIRouter()


@router.post("/run", response_model=CEAResult)
def run_calculation(request: CEARunRequest) -> CEAResult:
    return run_cea(request)


@router.get("/result/{result_id}", response_model=CEAResult)
def get_calculation(result_id: str) -> CEAResult:
    result = get_result(result_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Result not found")
    return result


@router.get("/species", response_model=list[SpeciesSearchResult])
def search_species(q: str = "") -> list[SpeciesSearchResult]:
    if not q:
        return []
    return search(q)