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