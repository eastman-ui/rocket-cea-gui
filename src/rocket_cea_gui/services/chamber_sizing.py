from __future__ import annotations

import math
from typing import Optional

from ..api.models import (
    ChamberSizingRequest,
    ChamberSizingResult,
    CEAResult,
)

# In-memory CEA result store reference (imported from cea_solver)
from .cea_solver import _results as _cea_results

G0 = 9.80665  # m/s^2


def _get_cea_result(result_id: str) -> Optional[CEAResult]:
    return _cea_results.get(result_id)


def size_chamber(request: ChamberSizingRequest) -> ChamberSizingResult:
    # Auto-fill from CEA result if provided
    if request.cea_result_id:
        cea = _get_cea_result(request.cea_result_id)
        if cea:
            if request.c_star == 0.0:
                request.c_star = cea.performance.c_star
            if request.isp_vac is None and cea.performance.isp_vac > 0:
                request.isp_vac = cea.performance.isp_vac
            if request.cf is None and cea.performance.cf > 0:
                request.cf = cea.performance.cf
            if request.chamber_pressure == 0.0:
                # Use chamber station pressure
                chamber = cea.stations.get("chamber")
                if chamber:
                    request.chamber_pressure = chamber.pressure

    # Convert chamber pressure to Pa
    pc_pa = _to_pa(request.chamber_pressure, request.pressure_unit)

    # Resolve mass flow rate
    if request.mass_flow_rate is not None and request.mass_flow_rate > 0:
        m_dot = request.mass_flow_rate
        thrust_n = m_dot * request.c_star * (request.cf or 1.0) if request.cf else m_dot * (request.isp_vac or 0) * G0
    elif request.thrust is not None and request.thrust > 0:
        thrust_n = _thrust_to_n(request.thrust, request.thrust_unit)
        if request.isp_vac and request.isp_vac > 0:
            m_dot = thrust_n / (request.isp_vac * G0)
        elif request.cf and request.cf > 0:
            m_dot = thrust_n / (request.c_star * request.cf)
        else:
            raise ValueError("Need isp_vac or cf to compute mass flow from thrust")
    else:
        raise ValueError("Must provide either thrust or mass_flow_rate")

    # Throat area: A_t = m_dot * c_star / P_c
    a_t = m_dot * request.c_star / pc_pa

    # Throat diameter
    d_t = 2.0 * math.sqrt(a_t / math.pi)

    # L* in meters (convert from inches if needed)
    l_star_m = request.l_star * 0.0254 if request.l_star_unit == "in" else request.l_star

    # Chamber volume: V_c = L* * A_t
    v_c = l_star_m * a_t

    # Contraction ratio -> chamber area and diameter
    a_c = request.contraction_ratio * a_t
    d_c = 2.0 * math.sqrt(a_c / math.pi)

    # Convergent section
    r_c = d_c / 2.0
    r_t = d_t / 2.0
    conv_angle_rad = math.radians(request.convergence_angle)
    l_conv = (r_c - r_t) / math.tan(conv_angle_rad) if math.tan(conv_angle_rad) > 0 else 0.0

    # Convergent frustum volume (truncated cone)
    v_conv = (math.pi * l_conv / 3.0) * (r_c**2 + r_c * r_t + r_t**2)

    # Cylindrical chamber length
    v_cyl = max(v_c - v_conv, 0.0)
    l_cyl = v_cyl / a_c if a_c > 0 else 0.0

    # Total chamber length (cylindrical + convergent)
    l_total = l_cyl + l_conv

    # Recompute thrust if derived from mass flow
    if request.thrust is None or request.thrust == 0:
        if request.cf and request.cf > 0:
            thrust_n = m_dot * request.c_star * request.cf
        elif request.isp_vac and request.isp_vac > 0:
            thrust_n = m_dot * request.isp_vac * G0

    return ChamberSizingResult(
        throat_area=a_t,
        throat_diameter=d_t,
        chamber_volume=v_c,
        chamber_diameter=d_c,
        chamber_length=l_total,
        chamber_length_cylindrical=l_cyl,
        convergent_length=l_conv,
        mass_flow_rate=m_dot,
        thrust=thrust_n,
    )


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


def _thrust_to_n(value: float, unit: str) -> float:
    if unit == "lbf":
        return value * 4.44822
    return value  # already N