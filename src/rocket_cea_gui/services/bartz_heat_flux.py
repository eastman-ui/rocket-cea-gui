from __future__ import annotations

import math
from typing import Optional

from ..api.models import (
    BartzHeatFluxRequest,
    BartzHeatFluxResult,
    BartzStationResult,
    CEAResult,
)

from .cea_solver import _results as _cea_results

G0 = 9.80665


def _get_cea_result(result_id: str) -> Optional[CEAResult]:
    return _cea_results.get(result_id)


def compute_bartz_heat_flux(request: BartzHeatFluxRequest) -> BartzHeatFluxResult:
    # Auto-fill from CEA result
    if request.cea_result_id:
        cea = _cea_results.get(request.cea_result_id)
        if cea:
            if request.c_star == 0.0:
                request.c_star = cea.performance.c_star
            if request.t_chamber == 0.0:
                request.t_chamber = cea.performance.t_chamber
            if request.gamma_chamber == 0.0:
                chamber = cea.stations.get("chamber")
                if chamber:
                    request.gamma_chamber = chamber.gamma
            if request.cp_chamber == 0.0:
                chamber = cea.stations.get("chamber")
                if chamber:
                    request.cp_chamber = chamber.cp * 1000.0  # kJ/kg-K -> J/kg-K
            if request.molecular_weight == 0.0:
                chamber = cea.stations.get("chamber")
                if chamber:
                    request.molecular_weight = chamber.molecular_weight

    # Convert chamber pressure to Pa
    pc_pa = _to_pa(request.chamber_pressure, request.pressure_unit)

    # Viscosity: use provided or approximate via Sutherland's law
    if request.viscosity and request.viscosity > 0:
        mu = request.viscosity
    else:
        mu = _sutherland_viscosity(request.t_chamber)

    d_t = request.throat_diameter

    # Throat radius of curvature (default = D_t)
    r_c = request.throat_radius_of_curvature or d_t

    # Prandtl number
    pr = request.prandtl

    cp = request.cp_chamber
    gamma = request.gamma_chamber

    # Reference Bartz coefficient at throat
    # h_g = (0.026 / D_t^0.2) * (mu^0.2 * cp / Pr^0.6) * (Pc / c*)^0.8 * (D_t / R_c)^0.1
    # This is the Bartz formula for throat; for other stations multiply by (A_t/A)^0.9

    h_g_ref = (0.026 / (d_t ** 0.2)) * \
              (mu ** 0.2 * cp / (pr ** 0.6)) * \
              (pc_pa / request.c_star) ** 0.8 * \
              (d_t / r_c) ** 0.1

    # Stations to compute
    if request.mach_numbers:
        stations_mach = request.mach_numbers
        station_names = [f"custom_{i}" for i in range(len(stations_mach))]
    else:
        station_names = ["chamber", "throat", "exit"]
        # Compute exit Mach from area ratio
        m_exit = _mach_from_area_ratio(request.area_ratio_exit, gamma)
        stations_mach = [0.0, 1.0, m_exit]

    # Area ratios at each station (A_t/A_local)
    # A/A_t from isentropic relation given Mach
    area_ratios = [_area_ratio_from_mach(m, gamma) for m in stations_mach]
    at_over_a = [1.0 / ar if ar > 0 else 1.0 for ar in area_ratios]

    results = []
    for name, mach, a_t_a in zip(station_names, stations_mach, at_over_a):
        # h_g scales with (A_t/A)^0.9
        h_g = h_g_ref * (a_t_a ** 0.9)

        # Adiabatic wall temperature
        r = request.recovery_factor
        t_aw = request.t_chamber * (1.0 + r * (gamma - 1.0) / 2.0 * mach ** 2)

        # Heat flux: q = h_g * (T_aw - T_wall)
        q = h_g * (t_aw - request.wall_temperature)

        results.append(BartzStationResult(
            station=name,
            mach=mach,
            area_ratio=1.0 / a_t_a if a_t_a > 0 else 0.0,
            h_g=h_g,
            t_adiabatic_wall=t_aw,
            heat_flux=max(q, 0.0),
        ))

    # Find max heat flux (typically at throat)
    max_result = max(results, key=lambda r: r.heat_flux)

    return BartzHeatFluxResult(
        throat_diameter=d_t,
        stations=results,
        max_heat_flux=max_result.heat_flux,
        max_heat_flux_station=max_result.station,
    )


def _sutherland_viscosity(t: float) -> float:
    """Approximate viscosity of combustion gases using Sutherland's law.

    Uses reference values typical for hot rocket exhaust:
    mu_ref ~ 8.1e-6 Pa-s at T_ref = 300K, S = 110K (air-like).
    This is a rough approximation; real combustion gas viscosity
    varies with composition. ~10-20% uncertainty."""
    mu_ref = 8.1e-6
    t_ref = 300.0
    s = 110.0
    return mu_ref * (t / t_ref) ** 1.5 * (t_ref + s) / (t + s)


def _area_ratio_from_mach(mach: float, gamma: float) -> float:
    """Isentropic area ratio A/A* for given Mach number."""
    if mach <= 0.0:
        return float("inf")
    term = (2.0 / (gamma + 1.0)) * (1.0 + (gamma - 1.0) / 2.0 * mach ** 2)
    exp = (gamma + 1.0) / (2.0 * (gamma - 1.0))
    return (1.0 / mach) * term ** exp


def _mach_from_area_ratio(area_ratio: float, gamma: float) -> float:
    """Solve for supersonic Mach number given A/A* using Newton's method."""
    if area_ratio <= 1.0:
        return 1.0
    # Initial guess
    m = 2.0
    for _ in range(50):
        ar = _area_ratio_from_mach(m, gamma)
        # Derivative
        dm = 0.0001
        dar_dm = (_area_ratio_from_mach(m + dm, gamma) - ar) / dm
        if abs(dar_dm) < 1e-12:
            break
        m = m - (ar - area_ratio) / dar_dm
        if m < 1.0:
            m = 1.01
    return max(m, 1.0)


def _to_pa(value: float, unit: str) -> float:
    conversions = {
        "psia": 6894.76,
        "atm": 101325.0,
        "bar": 100000.0,
        "mbar": 100.0,
        "kpa": 1000.0,
        "mpa": 1e6,
    }
    return value * conversions.get(unit, 6894.76)