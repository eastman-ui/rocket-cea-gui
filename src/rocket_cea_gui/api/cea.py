from __future__ import annotations
from fastapi import APIRouter, HTTPException
from typing import List

from ..services.cea_solver import run_cea, get_result, _results
from ..services.cea_species import search
from ..api.models import CEARunRequest, CEAResult, SpeciesSearchResult

router = APIRouter()


@router.post("/run", response_model=CEAResult)
def run_calculation(request: CEARunRequest) -> CEAResult:
    result = run_cea(request)
    _results[result.id] = result  # Store for later retrieval
    return result


@router.post("/run-sweep", response_model=list[CEAResult])
def run_sweep(request: CEARunRequest) -> list[CEAResult]:
    """Run parametric sweep over O/F ratio and/or chamber pressure (2D grid)."""
    results: list[CEAResult] = []

    has_of_sweep = request.sweep_of_start and request.sweep_of_end and request.sweep_of_steps and request.sweep_of_steps > 1
    has_p_sweep = request.sweep_pressure_start and request.sweep_pressure_end and request.sweep_pressure_steps and request.sweep_pressure_steps > 1

    # 2D sweep: all combinations of O/F and pressure
    if has_of_sweep and has_p_sweep:
        of_values = [
            request.sweep_of_start + i * (request.sweep_of_end - request.sweep_of_start) / (request.sweep_of_steps - 1)
            for i in range(request.sweep_of_steps)
        ]
        p_values = [
            request.sweep_pressure_start + i * (request.sweep_pressure_end - request.sweep_pressure_start) / (request.sweep_pressure_steps - 1)
            for i in range(request.sweep_pressure_steps)
        ]
        for of_val in of_values:
            for p_val in p_values:
                sweep_request = CEARunRequest(**request.model_dump())
                sweep_request.reactants[0].weight = of_val
                sweep_request.chamber_pressure = p_val
                result = run_cea(sweep_request)
                results.append(result)

    # 1D O/F sweep only
    elif has_of_sweep:
        of_values = [
            request.sweep_of_start + i * (request.sweep_of_end - request.sweep_of_start) / (request.sweep_of_steps - 1)
            for i in range(request.sweep_of_steps)
        ]
        for of_val in of_values:
            sweep_request = CEARunRequest(**request.model_dump())
            sweep_request.reactants[0].weight = of_val
            result = run_cea(sweep_request)
            results.append(result)

    # 1D pressure sweep only
    elif has_p_sweep:
        p_values = [
            request.sweep_pressure_start + i * (request.sweep_pressure_end - request.sweep_pressure_start) / (request.sweep_pressure_steps - 1)
            for i in range(request.sweep_pressure_steps)
        ]
        for p_val in p_values:
            sweep_request = CEARunRequest(**request.model_dump())
            sweep_request.chamber_pressure = p_val
            result = run_cea(sweep_request)
            results.append(result)

    # Single calculation
    else:
        result = run_cea(request)
        results.append(result)

    return results


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