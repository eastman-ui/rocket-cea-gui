import pytest
from rocket_cea_gui.api.models import InjectorSizingRequest, InjectorElementType, PressureUnit
from rocket_cea_gui.services.injector_sizing import size_injector


def test_injector_sizing_basic():
    req = InjectorSizingRequest(
        fuel_mass_flow_rate=0.5,
        oxidizer_mass_flow_rate=1.5,
        fuel_density=810,
        oxidizer_density=1141,
        fuel_pressure_drop=100,
        oxidizer_pressure_drop=100,
        pressure_unit=PressureUnit.PSIA,
    )
    result = size_injector(req)

    assert result.fuel.propellant_name == "Fuel"
    assert result.oxidizer.propellant_name == "Oxidizer"
    assert result.fuel.mass_flow_rate == 0.5
    assert result.oxidizer.mass_flow_rate == 1.5
    assert result.fuel.total_area > 0
    assert result.oxidizer.total_area > 0
    assert result.fuel.orifice_diameter > 0
    assert result.oxidizer.orifice_diameter > 0
    assert result.fuel.number_of_orifices > 0
    assert result.oxidizer.number_of_orifices > 0
    assert result.total_orifice_count == result.fuel.number_of_orifices + result.oxidizer.number_of_orifices


def test_injector_sizing_orifice_count():
    req = InjectorSizingRequest(
        fuel_mass_flow_rate=0.5,
        oxidizer_mass_flow_rate=1.5,
        fuel_density=810,
        oxidizer_density=1141,
        fuel_pressure_drop=100,
        oxidizer_pressure_drop=100,
        fuel_orifice_count=4,
        oxidizer_orifice_count=8,
        pressure_unit=PressureUnit.PSIA,
    )
    result = size_injector(req)

    assert result.fuel.number_of_orifices == 4
    assert result.oxidizer.number_of_orifices == 8
    assert result.total_orifice_count == 12


def test_injector_sizing_momentum_ratio():
    req = InjectorSizingRequest(
        fuel_mass_flow_rate=0.5,
        oxidizer_mass_flow_rate=1.5,
        fuel_density=810,
        oxidizer_density=1141,
        fuel_pressure_drop=100,
        oxidizer_pressure_drop=100,
        pressure_unit=PressureUnit.PSIA,
    )
    result = size_injector(req)

    # Momentum ratio should be positive
    assert result.momentum_ratio > 0
    # Fuel momentum / oxidizer momentum
    fuel_momentum = req.fuel_mass_flow_rate * result.fuel.jet_velocity
    ox_momentum = req.oxidizer_mass_flow_rate * result.oxidizer.jet_velocity
    assert abs(result.momentum_ratio - fuel_momentum / ox_momentum) < 0.01


def test_injector_sizing_custom_cd():
    req = InjectorSizingRequest(
        fuel_mass_flow_rate=0.5,
        oxidizer_mass_flow_rate=1.5,
        fuel_density=810,
        oxidizer_density=1141,
        fuel_pressure_drop=100,
        oxidizer_pressure_drop=100,
        fuel_discharge_coefficient=0.85,
        oxidizer_discharge_coefficient=0.70,
        pressure_unit=PressureUnit.PSIA,
    )
    result = size_injector(req)

    # Higher Cd means smaller orifice area for same flow
    assert result.fuel.discharge_coefficient == 0.85
    assert result.oxidizer.discharge_coefficient == 0.70


def test_injector_element_type_default():
    req = InjectorSizingRequest(
        fuel_mass_flow_rate=0.5,
        oxidizer_mass_flow_rate=1.5,
        fuel_density=810,
        oxidizer_density=1141,
        fuel_pressure_drop=100,
        oxidizer_pressure_drop=100,
        pressure_unit=PressureUnit.PSIA,
    )
    result = size_injector(req)
    assert result.element_info is not None
    assert result.element_info.element_type == InjectorElementType.SHEAR_COAXIAL
    assert result.element_info.orifices_per_element == 2
    assert 0.3 < result.element_info.mixing_efficiency < 0.5
    assert result.element_info.impingement_angle is None


def test_injector_element_type_triplet():
    req = InjectorSizingRequest(
        fuel_mass_flow_rate=0.5,
        oxidizer_mass_flow_rate=1.5,
        fuel_density=810,
        oxidizer_density=1141,
        fuel_pressure_drop=100,
        oxidizer_pressure_drop=100,
        element_type=InjectorElementType.TRIPLET,
        pressure_unit=PressureUnit.PSIA,
    )
    result = size_injector(req)
    assert result.element_info is not None
    assert result.element_info.element_type == InjectorElementType.TRIPLET
    assert result.element_info.orifices_per_element == 3
    assert result.element_info.mixing_efficiency > 0.7
    assert result.element_info.impingement_angle is not None
    assert len(result.element_info.design_notes) > 0


def test_injector_element_type_showerhead():
    req = InjectorSizingRequest(
        fuel_mass_flow_rate=0.5,
        oxidizer_mass_flow_rate=1.5,
        fuel_density=810,
        oxidizer_density=1141,
        fuel_pressure_drop=100,
        oxidizer_pressure_drop=100,
        element_type=InjectorElementType.SHOWERHEAD,
        pressure_unit=PressureUnit.PSIA,
    )
    result = size_injector(req)
    assert result.element_info.element_type == InjectorElementType.SHOWERHEAD
    assert result.element_info.orifices_per_element == 1
    assert result.element_info.impingement_angle is None