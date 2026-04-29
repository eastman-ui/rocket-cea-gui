import pytest
from rocket_cea_gui.api.models import BartzHeatFluxRequest, PressureUnit
from rocket_cea_gui.services.bartz_heat_flux import (
    compute_bartz_heat_flux,
    _area_ratio_from_mach,
    _mach_from_area_ratio,
    _sutherland_viscosity,
)


def test_area_ratio_from_mach():
    # At Mach 1, A/A* should be 1.0
    assert abs(_area_ratio_from_mach(1.0, 1.2) - 1.0) < 0.001

    # At Mach 2 with gamma=1.2, should be > 1
    ar = _area_ratio_from_mach(2.0, 1.2)
    assert ar > 1.0


def test_mach_from_area_ratio():
    # Inverse of the above
    for gamma in [1.15, 1.2, 1.3]:
        for mach in [1.5, 2.0, 3.0]:
            ar = _area_ratio_from_mach(mach, gamma)
            recovered = _mach_from_area_ratio(ar, gamma)
            assert abs(recovered - mach) / mach < 0.01


def test_sutherland_viscosity():
    # At 300K, should be close to mu_ref (8.1e-6)
    mu_300 = _sutherland_viscosity(300.0)
    assert abs(mu_300 - 8.1e-6) / 8.1e-6 < 0.05

    # At higher temps, viscosity should increase
    mu_3000 = _sutherland_viscosity(3000.0)
    assert mu_3000 > mu_300


def test_bartz_heat_flux_basic():
    req = BartzHeatFluxRequest(
        chamber_pressure=500,
        pressure_unit=PressureUnit.PSIA,
        c_star=1800,
        cp_chamber=2000,
        gamma_chamber=1.2,
        t_chamber=3400,
        molecular_weight=20,
        throat_diameter=0.03,
        area_ratio_exit=10,
        wall_temperature=600,
    )
    result = compute_bartz_heat_flux(req)

    assert result.throat_diameter == 0.03
    assert len(result.stations) == 3  # chamber, throat, exit
    assert result.stations[0].station == "chamber"
    assert result.stations[1].station == "throat"
    assert result.stations[2].station == "exit"
    # Throat should have highest heat flux
    assert result.max_heat_flux_station == "throat"
    assert result.max_heat_flux > 0
    # All heat fluxes should be non-negative (wall is cooler than gas)
    for s in result.stations:
        assert s.heat_flux >= 0
        assert s.h_g >= 0  # chamber station has h_g=0 at Mach=0
        assert s.t_adiabatic_wall > 0


def test_bartz_custom_mach_numbers():
    req = BartzHeatFluxRequest(
        chamber_pressure=500,
        pressure_unit=PressureUnit.PSIA,
        c_star=1800,
        cp_chamber=2000,
        gamma_chamber=1.2,
        t_chamber=3400,
        molecular_weight=20,
        throat_diameter=0.03,
        area_ratio_exit=10,
        wall_temperature=600,
        mach_numbers=[0.0, 0.5, 1.0, 1.5, 2.0, 2.5],
    )
    result = compute_bartz_heat_flux(req)
    assert len(result.stations) == 6