import math
import pytest
from rocket_cea_gui.api.models import ChamberSizingRequest, PressureUnit
from rocket_cea_gui.services.chamber_sizing import size_chamber


def test_chamber_sizing_from_thrust():
    req = ChamberSizingRequest(
        thrust=5000,
        thrust_unit="N",
        c_star=1800,
        isp_vac=310,
        chamber_pressure=500,
        pressure_unit=PressureUnit.PSIA,
        l_star=60,
        l_star_unit="in",
        contraction_ratio=3.0,
        convergence_angle=45.0,
    )
    result = size_chamber(req)

    # Thrust = 5000 N, Isp = 310 s -> m_dot = 5000/(310*9.80665) ~ 1.644 kg/s
    assert result.mass_flow_rate > 0
    assert result.throat_area > 0
    assert result.throat_diameter > 0
    assert result.chamber_volume > 0
    assert result.chamber_diameter > result.throat_diameter
    assert result.chamber_length > 0
    assert result.convergent_length > 0


def test_chamber_sizing_from_mass_flow():
    req = ChamberSizingRequest(
        mass_flow_rate=2.0,
        c_star=1800,
        cf=1.5,
        chamber_pressure=500,
        pressure_unit=PressureUnit.PSIA,
        l_star=60,
        l_star_unit="in",
        contraction_ratio=3.0,
        convergence_angle=45.0,
    )
    result = size_chamber(req)

    assert result.mass_flow_rate == 2.0
    assert result.throat_area > 0
    # A_t = m_dot * c_star / P_c
    pc_pa = 500 * 6894.76
    expected_at = 2.0 * 1800 / pc_pa
    assert abs(result.throat_area - expected_at) / expected_at < 0.01


def test_chamber_sizing_contraction_ratio():
    req = ChamberSizingRequest(
        mass_flow_rate=2.0,
        c_star=1800,
        cf=1.5,
        chamber_pressure=500,
        pressure_unit=PressureUnit.PSIA,
        l_star=60,
        l_star_unit="in",
        contraction_ratio=5.0,
        convergence_angle=45.0,
    )
    result = size_chamber(req)

    # Chamber diameter should be sqrt(contraction_ratio) * throat diameter
    expected_ratio = math.sqrt(5.0)
    actual_ratio = result.chamber_diameter / result.throat_diameter
    assert abs(actual_ratio - expected_ratio) / expected_ratio < 0.01


def test_chamber_sizing_no_thrust_or_mass_flow():
    req = ChamberSizingRequest(
        c_star=1800,
        chamber_pressure=500,
        pressure_unit=PressureUnit.PSIA,
        l_star=60,
        l_star_unit="in",
        contraction_ratio=3.0,
        convergence_angle=45.0,
    )
    with pytest.raises(ValueError):
        size_chamber(req)