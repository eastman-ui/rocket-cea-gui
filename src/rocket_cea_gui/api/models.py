from __future__ import annotations
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ProblemType(str, Enum):
    ROCKET = "rocket"
    HP = "hp"
    TP = "tp"
    SHOCK = "shock"
    DET = "det"
    TV = "tv"
    UV = "uv"
    SP = "sp"
    SV = "sv"


class FlowModel(str, Enum):
    EQUILIBRIUM = "equilibrium"
    FROZEN = "frozen"


class PressureUnit(str, Enum):
    PSIA = "psia"
    ATM = "atm"
    BAR = "bar"
    MBAR = "mbar"
    KPA = "kpa"
    MPA = "mpa"


class TemperatureUnit(str, Enum):
    R = "R"
    K = "K"
    F = "F"
    C = "C"


class AmountUnit(str, Enum):
    WT_FRACTION = "wt_fraction"
    OF_RATIO = "of_ratio"
    MOL_FRACTION = "mol_fraction"
    EQUIVALENCE_RATIO = "phi"
    FUEL_OXIDIZER = "f/o"


class NozzleType(str, Enum):
    CONICAL = "conical"
    BELL_RAO = "bell_rao"


class ExportFormat(str, Enum):
    PYTHON = "python"
    JSON = "json"
    NOTEBOOK = "notebook"


class CEAReactant(BaseModel):
    species: str
    weight: float
    amount_unit: AmountUnit
    temperature: Optional[float] = None
    temperature_unit: Optional[TemperatureUnit] = None


class ExitConditionType(str, Enum):
    AREA_RATIO = "area_ratio"
    PRESSURE = "pressure"
    MACH = "mach"
    PRESSURE_RATIO = "pressure_ratio"


class CEARunRequest(BaseModel):
    problem_type: ProblemType
    reactants: list[CEAReactant]
    chamber_pressure: float
    pressure_unit: PressureUnit
    area_ratio: Optional[float] = None
    supersonic_area_ratio: Optional[float] = None
    flow_model: FlowModel
    exit_condition_type: ExitConditionType = ExitConditionType.AREA_RATIO
    exit_pressure: Optional[float] = None
    exit_pressure_unit: Optional[PressureUnit] = None
    exit_mach: Optional[float] = None
    pressure_ratio: Optional[float] = None
    assigned_temperature: Optional[float] = None
    assigned_temperature_unit: Optional[TemperatureUnit] = None
    # Sweep parameters
    sweep_of_start: Optional[float] = None
    sweep_of_end: Optional[float] = None
    sweep_of_steps: Optional[int] = None
    sweep_pressure_start: Optional[float] = None
    sweep_pressure_end: Optional[float] = None
    sweep_pressure_steps: Optional[int] = None


class CEAStation(BaseModel):
    pressure: float
    temperature: float
    density: float
    mach: float
    velocity: float
    enthalpy: float  # kJ/kg
    internal_energy: float  # kJ/kg
    gibbs_free_energy: float  # kJ/kg
    entropy: float  # kJ/(kg·K)
    molecular_weight: float
    cp: float  # kJ/(kg·K)
    gamma: float
    sonic_velocity: float  # m/s


class CEAPerformance(BaseModel):
    isp_vac: float
    isp_sl: float
    c_star: float
    cf: float
    t_chamber: float
    p_exit: float


class CEASpeciesFraction(BaseModel):
    name: str
    mole_fraction: float
    mass_fraction: float


class CEAResult(BaseModel):
    id: str
    performance: CEAPerformance
    stations: dict
    composition: list[CEASpeciesFraction]


class SpeciesSearchResult(BaseModel):
    name: str
    formula: str
    category: str
    molecular_weight: float


class CADGenerateRequest(BaseModel):
    cea_result_id: str
    nozzle_type: NozzleType
    chamber_diameter: float
    chamber_length: float
    wall_thickness: float
    convergence_angle: float
    divergence_angle: Optional[float] = None
    throat_diameter: Optional[float] = 1.5
    exit_diameter: Optional[float] = None


class CADGenerateResult(BaseModel):
    id: str
    stl_preview_url: str
    step_download_url: str
    openscad_download_url: str
    parameters: dict[str, object]


class RocketPyExportRequest(BaseModel):
    cea_result_id: str
    format: ExportFormat
    dry_mass: Optional[float] = None
    rocket_diameter: Optional[float] = None
    cd: Optional[float] = None
    fin_count: Optional[int] = None
    fin_span: Optional[float] = None
    fin_root_chord: Optional[float] = None
    fin_tip_chord: Optional[float] = None
    fin_sweep: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    elevation: Optional[float] = None


class RocketPyExportResult(BaseModel):
    id: str
    download_url: str
    filename: str


# --- Engineering Calculator Models ---


class ChamberSizingRequest(BaseModel):
    thrust: Optional[float] = None
    thrust_unit: str = "N"
    mass_flow_rate: Optional[float] = None
    c_star: float = 0.0
    isp_vac: Optional[float] = None
    cf: Optional[float] = None
    chamber_pressure: float = 0.0
    pressure_unit: PressureUnit = PressureUnit.PSIA
    l_star: float = 60.0
    l_star_unit: str = "in"
    contraction_ratio: float = 3.0
    convergence_angle: float = 45.0
    cea_result_id: Optional[str] = None


class ChamberSizingResult(BaseModel):
    throat_area: float
    throat_diameter: float
    chamber_volume: float
    chamber_diameter: float
    chamber_length: float
    chamber_length_cylindrical: float
    convergent_length: float
    mass_flow_rate: float
    thrust: float


class BartzHeatFluxRequest(BaseModel):
    chamber_pressure: float = 0.0
    pressure_unit: PressureUnit = PressureUnit.PSIA
    c_star: float = 0.0
    cp_chamber: float = 0.0
    gamma_chamber: float = 0.0
    t_chamber: float = 0.0
    molecular_weight: float = 0.0
    viscosity: Optional[float] = None
    prandtl: float = 0.5
    throat_diameter: float = 0.01
    throat_radius_of_curvature: Optional[float] = None
    area_ratio_exit: float = 10.0
    wall_temperature: float = 600.0
    recovery_factor: float = 0.9
    mach_numbers: Optional[list[float]] = None
    cea_result_id: Optional[str] = None


class BartzStationResult(BaseModel):
    station: str
    mach: float
    area_ratio: float
    h_g: float
    t_adiabatic_wall: float
    heat_flux: float


class BartzHeatFluxResult(BaseModel):
    throat_diameter: float
    stations: list[BartzStationResult]
    max_heat_flux: float
    max_heat_flux_station: str


class InjectorElementType(str, Enum):
    SHEAR_COAXIAL = "shear_coaxial"
    UNLIKE_IMPINGING_DOUBLET = "unlike_impinging_doublet"
    LIKE_DOUBLET = "like_doublet"
    TRIPLET = "triplet"
    PENTAD = "pentad"
    SHOWERHEAD = "showerhead"


class InjectorSizingRequest(BaseModel):
    fuel_mass_flow_rate: float
    oxidizer_mass_flow_rate: float
    fuel_density: float
    oxidizer_density: float
    fuel_pressure_drop: float
    oxidizer_pressure_drop: float
    fuel_discharge_coefficient: float = 0.65
    oxidizer_discharge_coefficient: float = 0.65
    fuel_orifice_count: Optional[int] = None
    oxidizer_orifice_count: Optional[int] = None
    element_type: InjectorElementType = InjectorElementType.SHEAR_COAXIAL
    pressure_unit: PressureUnit = PressureUnit.PSIA


class InjectorOrificeResult(BaseModel):
    propellant_name: str
    mass_flow_rate: float
    density: float
    pressure_drop: float
    discharge_coefficient: float
    orifice_area: float
    orifice_diameter: float
    number_of_orifices: int
    total_area: float
    jet_velocity: float


class InjectorElementInfo(BaseModel):
    element_type: InjectorElementType
    elements_per_injector: int
    orifices_per_element: int
    mixing_efficiency: float
    impingement_angle: Optional[float] = None
    design_notes: list[str] = []


class InjectorSizingResult(BaseModel):
    fuel: InjectorOrificeResult
    oxidizer: InjectorOrificeResult
    total_orifice_count: int
    momentum_ratio: float
    element_info: Optional[InjectorElementInfo] = None