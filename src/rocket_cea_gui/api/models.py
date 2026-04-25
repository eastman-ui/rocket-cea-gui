from __future__ import annotations
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ProblemType(str, Enum):
    ROCKET = "rocket"
    HP = "hp"
    TP = "tp"
    SHOCK = "shock"
    DETONATION = "detonation"


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


class CEARunRequest(BaseModel):
    problem_type: ProblemType
    reactants: list[CEAReactant]
    chamber_pressure: float
    pressure_unit: PressureUnit
    area_ratio: float
    supersonic_area_ratio: Optional[float] = None
    flow_model: FlowModel


class CEAStation(BaseModel):
    pressure: float
    temperature: float
    density: float
    mach: float
    velocity: float


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


class CADGenerateResult(BaseModel):
    id: str
    stl_preview_url: str
    step_download_url: str
    openscad_download_url: str
    parameters: dict[str, float]


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