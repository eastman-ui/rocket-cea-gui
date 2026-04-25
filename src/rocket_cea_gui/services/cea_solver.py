from __future__ import annotations
import uuid
from typing import Optional

from ..api.models import (
    CEARunRequest,
    CEAResult,
    CEAPerformance,
    CEAStation,
    CEASpeciesFraction,
)

_results: dict[str, CEAResult] = {}


def run_cea(request: CEARunRequest) -> CEAResult:
    """Run a CEA calculation. Returns a mocked result for now."""
    result_id = str(uuid.uuid4())[:8]
    result = CEAResult(
        id=result_id,
        performance=CEAPerformance(
            isp_vac=311.5,
            isp_sl=275.3,
            c_star=5762.0,
            cf=1.741,
            t_chamber=6084.0,
            p_exit=1.22,
        ),
        stations={
            "chamber": CEAStation(
                pressure=request.chamber_pressure,
                temperature=6084.0,
                density=0.127,
                mach=1.0,
                velocity=3502.0,
            ),
            "throat": CEAStation(
                pressure=request.chamber_pressure * 0.5608,
                temperature=5574.0,
                density=0.082,
                mach=1.0,
                velocity=4015.0,
            ),
            "exit": CEAStation(
                pressure=1.22,
                temperature=1942.0,
                density=0.00014,
                mach=5.28,
                velocity=10032.0,
            ),
        },
        composition=[
            CEASpeciesFraction(name="CO2", mole_fraction=0.341, mass_fraction=0.512),
            CEASpeciesFraction(name="CO", mole_fraction=0.261, mass_fraction=0.183),
            CEASpeciesFraction(name="H2O", mole_fraction=0.220, mass_fraction=0.141),
            CEASpeciesFraction(name="H2", mole_fraction=0.148, mass_fraction=0.012),
            CEASpeciesFraction(name="OH", mole_fraction=0.024, mass_fraction=0.013),
            CEASpeciesFraction(name="O2", mole_fraction=0.006, mass_fraction=0.009),
        ],
    )
    _results[result_id] = result
    return result


def get_result(result_id: str) -> Optional[CEAResult]:
    return _results.get(result_id)