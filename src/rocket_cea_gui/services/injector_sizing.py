from __future__ import annotations

import math

from ..api.models import (
    InjectorSizingRequest,
    InjectorSizingResult,
    InjectorOrificeResult,
    InjectorElementInfo,
    InjectorElementType,
)


# Element type configurations: (orifices_per_element, mixing_efficiency_estimate, typical_impingement_angle)
ELEMENT_CONFIGS: dict[InjectorElementType, dict] = {
    InjectorElementType.SHEAR_COAXIAL: {
        "orifices_per_element": 2,  # inner (fuel) + outer annulus (ox)
        "mixing_efficiency": 0.40,
        "impingement_angle": None,
        "notes": [
            "Shear-driven mixing, lower efficiency",
            "Good for LOX/GH2 — velocity differential drives mixing",
            "Target momentum ratio ~0.5-1.0",
            "Outer annulus typically oxidizer",
        ],
    },
    InjectorElementType.UNLIKE_IMPINGING_DOUBLET: {
        "orifices_per_element": 2,  # 1 fuel + 1 ox per element
        "mixing_efficiency": 0.75,
        "impingement_angle": 60.0,
        "notes": [
            "Fuel and oxidizer streams impinge at an angle",
            "Typical impingement angle 45-75°",
            "Target momentum ratio ~0.5-1.5",
            "Good general-purpose element",
            "Susceptible to blow-apart at high momentum ratio",
        ],
    },
    InjectorElementType.LIKE_DOUBLET: {
        "orifices_per_element": 2,  # 2 same-propellant streams impinge
        "mixing_efficiency": 0.70,
        "impingement_angle": 60.0,
        "notes": [
            "Two same-propellant streams impinge",
            "Requires careful pattern layout for fuel-ox mixing",
            "Better stability than unlike doublet",
            "Common in LOX/RP-1 engines",
        ],
    },
    InjectorElementType.TRIPLET: {
        "orifices_per_element": 3,  # fuel-ox-fuel or ox-fuel-ox
        "mixing_efficiency": 0.85,
        "impingement_angle": 60.0,
        "notes": [
            "Center stream impinged by two outer streams",
            "Higher mixing efficiency than doublet",
            "Common in storable propellant engines",
            "Outer streams typically same propellant",
        ],
    },
    InjectorElementType.PENTAD: {
        "orifices_per_element": 5,  # 4 outer + 1 center
        "mixing_efficiency": 0.90,
        "impingement_angle": 55.0,
        "notes": [
            "4 outer streams impinge on 1 center stream",
            "Highest mixing efficiency of impinging types",
            "Complex manifold design",
            "Used in high-performance engines",
        ],
    },
    InjectorElementType.SHOWERHEAD: {
        "orifices_per_element": 1,  # axial stream, no impingement
        "mixing_efficiency": 0.30,
        "impingement_angle": None,
        "notes": [
            "Axial injection, no impingement",
            "Lowest mixing efficiency",
            "Simple manifold design",
            "Historically used in early engines (V-2)",
        ],
    },
}


def size_injector(request: InjectorSizingRequest) -> InjectorSizingResult:
    # Convert pressure drops to Pa
    dp_fuel_pa = _to_pa(request.fuel_pressure_drop, request.pressure_unit)
    dp_ox_pa = _to_pa(request.oxidizer_pressure_drop, request.pressure_unit)

    # Fuel orifice sizing
    fuel = _size_propellant(
        name="Fuel",
        mass_flow_rate=request.fuel_mass_flow_rate,
        density=request.fuel_density,
        pressure_drop=dp_fuel_pa,
        cd=request.fuel_discharge_coefficient,
        num_orifices_hint=request.fuel_orifice_count,
    )

    # Oxidizer orifice sizing
    oxidizer = _size_propellant(
        name="Oxidizer",
        mass_flow_rate=request.oxidizer_mass_flow_rate,
        density=request.oxidizer_density,
        pressure_drop=dp_ox_pa,
        cd=request.oxidizer_discharge_coefficient,
        num_orifices_hint=request.oxidizer_orifice_count,
    )

    # Momentum ratio (fuel/oxidizer)
    fuel_momentum = request.fuel_mass_flow_rate * fuel.jet_velocity
    ox_momentum = request.oxidizer_mass_flow_rate * oxidizer.jet_velocity
    momentum_ratio = fuel_momentum / ox_momentum if ox_momentum > 0 else 0.0

    # Element type info
    element_info = _compute_element_info(
        element_type=request.element_type,
        fuel_orifices=fuel.number_of_orifices,
        ox_orifices=oxidizer.number_of_orifices,
        momentum_ratio=momentum_ratio,
    )

    return InjectorSizingResult(
        fuel=fuel,
        oxidizer=oxidizer,
        total_orifice_count=fuel.number_of_orifices + oxidizer.number_of_orifices,
        momentum_ratio=momentum_ratio,
        element_info=element_info,
    )


def _compute_element_info(
    element_type: InjectorElementType,
    fuel_orifices: int,
    ox_orifices: int,
    momentum_ratio: float,
) -> InjectorElementInfo:
    config = ELEMENT_CONFIGS[element_type]
    ope = config["orifices_per_element"]

    # For impinging types, elements are sets of impinging orifices
    if element_type in (InjectorElementType.UNLIKE_IMPINGING_DOUBLET, InjectorElementType.TRIPLET, InjectorElementType.PENTAD):
        # Unlike: each element has orifices from both propellants
        # Minimum of fuel/ox elements determines total elements
        n_elements = min(fuel_orifices, ox_orifices)
    elif element_type == InjectorElementType.LIKE_DOUBLET:
        # Like doublet: pairs of same-propellant orifices
        n_elements = fuel_orifices // 2 + ox_orifices // 2
    else:
        # Shear coaxial / showerhead: elements = min(fuel, ox) orifices
        n_elements = min(fuel_orifices, ox_orifices)

    n_elements = max(n_elements, 1)

    notes = list(config["notes"])

    # Add momentum ratio guidance
    if element_type == InjectorElementType.SHEAR_COAXIAL:
        if momentum_ratio < 0.5:
            notes.append("⚠ Momentum ratio low for shear coaxial — consider increasing fuel ΔP")
        elif momentum_ratio > 1.5:
            notes.append("⚠ Momentum ratio high — may cause fuel penetration into ox stream")
    elif element_type in (InjectorElementType.UNLIKE_IMPINGING_DOUBLET, InjectorElementType.LIKE_DOUBLET, InjectorElementType.TRIPLET, InjectorElementType.PENTAD):
        if momentum_ratio < 0.3:
            notes.append("⚠ Low momentum ratio — poor mixing, oxidizer-dominated impingement")
        elif momentum_ratio > 2.0:
            notes.append("⚠ High momentum ratio — risk of blow-apart")

    return InjectorElementInfo(
        element_type=element_type,
        elements_per_injector=n_elements,
        orifices_per_element=ope,
        mixing_efficiency=config["mixing_efficiency"],
        impingement_angle=config["impingement_angle"],
        design_notes=notes,
    )


def _size_propellant(
    name: str,
    mass_flow_rate: float,
    density: float,
    pressure_drop: float,
    cd: float,
    num_orifices_hint: int,
) -> InjectorOrificeResult:
    # Total orifice area: A = m_dot / (Cd * sqrt(2 * rho * dP))
    total_area = mass_flow_rate / (cd * math.sqrt(2.0 * density * pressure_drop))

    # Number of orifices
    if num_orifices_hint and num_orifices_hint > 0:
        n = num_orifices_hint
    else:
        # Heuristic: aim for orifice diameter 0.5-2mm
        # Start with single orifice, increase if diameter > 3mm
        n = 1
        single_area = total_area / n
        single_d = 2.0 * math.sqrt(single_area / math.pi)
        while single_d > 0.003 and n < 200:  # max 3mm per orifice
            n += 1
            single_area = total_area / n
            single_d = 2.0 * math.sqrt(single_area / math.pi)

    single_area = total_area / n
    single_diameter = 2.0 * math.sqrt(single_area / math.pi)

    # Jet velocity: V = m_dot / (rho * A_total)
    jet_velocity = mass_flow_rate / (density * total_area) if total_area > 0 else 0.0

    return InjectorOrificeResult(
        propellant_name=name,
        mass_flow_rate=mass_flow_rate,
        density=density,
        pressure_drop=pressure_drop,
        discharge_coefficient=cd,
        orifice_area=single_area,
        orifice_diameter=single_diameter,
        number_of_orifices=n,
        total_area=total_area,
        jet_velocity=jet_velocity,
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