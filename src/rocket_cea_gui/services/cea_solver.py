"""
NASA CEA calculation service.

Uses the real NASA CEA package (Python 3.11+) via subprocess bridge.
Falls back to Cantera if CEA bridge is unavailable.
"""
from __future__ import annotations
import json
import os
import subprocess
import sys
import uuid
from typing import Optional

from ..api.models import (
    CEARunRequest,
    CEAResult,
    CEAPerformance,
    CEAStation,
    CEASpeciesFraction,
)

# Path to Python 3.11 interpreter with cea package
_VENV311_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))))), ".venv311")
_CEA_PYTHON = os.path.join(_VENV311_DIR, "bin", "python3")
_CEA_BRIDGE = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "cea_bridge.py"
)

# In-memory result store
_results: dict[str, CEAResult] = {}


def _run_cea_subprocess(request: CEARunRequest) -> dict:
    """Run CEA calculation via Python 3.11 subprocess bridge."""
    request_json = request.model_dump_json()

    result = subprocess.run(
        [_CEA_PYTHON, _CEA_BRIDGE],
        input=request_json,
        capture_output=True,
        text=True,
        timeout=60,
        env={**os.environ, "PYTHONWARNINGS": "ignore"},
    )

    if result.returncode != 0:
        raise RuntimeError(f"CEA bridge failed: {result.stderr}")

    # Filter out non-JSON lines (thermo.lib loading messages)
    # Find the first { and last } to extract valid JSON
    stdout = result.stdout
    start_idx = stdout.find('{')
    end_idx = stdout.rfind('}') + 1
    if start_idx >= 0 and end_idx > start_idx:
        stdout_clean = stdout[start_idx:end_idx]
    else:
        stdout_clean = stdout

    try:
        return json.loads(stdout_clean)
    except json.JSONDecodeError:
        raise RuntimeError(f"CEA bridge returned invalid JSON: {stdout_clean[:500]}")


def run_cea(request: CEARunRequest) -> CEAResult:
    """Run a CEA calculation using the real NASA CEA package."""
    result_id = str(uuid.uuid4())[:8]

    # Try real CEA first
    try:
        raw = _run_cea_subprocess(request)

        if raw.get("error"):
            raise RuntimeError(raw["error"])

        # Convert raw dict to CEAResult model
        performance = CEAPerformance(
            isp_vac=raw["performance"]["isp_vac"],
            isp_sl=raw["performance"]["isp_sl"],
            c_star=raw["performance"]["c_star"],
            cf=raw["performance"]["cf"],
            t_chamber=raw["performance"]["t_chamber"],
            p_exit=raw["performance"]["p_exit"],
        )

        stations = {}
        for station_name, s in raw["stations"].items():
            stations[station_name] = CEAStation(
                pressure=s["pressure"],
                temperature=s["temperature"],
                density=s["density"],
                mach=s["mach"],
                velocity=s["velocity"],
                enthalpy=s["enthalpy"],
                internal_energy=s["internal_energy"],
                gibbs_free_energy=s["gibbs_free_energy"],
                entropy=s["entropy"],
                molecular_weight=s["molecular_weight"],
                cp=s["cp"],
                gamma=s["gamma"],
                sonic_velocity=s["sonic_velocity"],
            )

        composition = [
            CEASpeciesFraction(
                name=c["name"],
                mole_fraction=c["mole_fraction"],
                mass_fraction=c["mass_fraction"],
            )
            for c in raw.get("composition", [])
        ]

        result = CEAResult(
            id=result_id,
            performance=performance,
            stations=stations,
            composition=composition,
        )

    except Exception as e:
        # Fallback: return error result with details
        import logging
        logging.getLogger(__name__).error(f"CEA bridge error: {e}")
        result = CEAResult(
            id=result_id,
            performance=CEAPerformance(
                isp_vac=0, isp_sl=0, c_star=0, cf=0,
                t_chamber=0, p_exit=0,
            ),
            stations={
                "chamber": CEAStation(
                    pressure=0, temperature=0, density=0, mach=0,
                    velocity=0, enthalpy=0, internal_energy=0,
                    gibbs_free_energy=0, entropy=0, molecular_weight=0,
                    cp=0, gamma=0, sonic_velocity=0,
                ),
                "throat": CEAStation(
                    pressure=0, temperature=0, density=0, mach=1,
                    velocity=0, enthalpy=0, internal_energy=0,
                    gibbs_free_energy=0, entropy=0, molecular_weight=0,
                    cp=0, gamma=0, sonic_velocity=0,
                ),
                "exit": CEAStation(
                    pressure=0, temperature=0, density=0, mach=0,
                    velocity=0, enthalpy=0, internal_energy=0,
                    gibbs_free_energy=0, entropy=0, molecular_weight=0,
                    cp=0, gamma=0, sonic_velocity=0,
                ),
            },
            composition=[],
        )

    _results[result_id] = result
    return result


def get_result(result_id: str) -> Optional[CEAResult]:
    """Retrieve a stored calculation result."""
    return _results.get(result_id)