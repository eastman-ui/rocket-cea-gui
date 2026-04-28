export type ProblemType = 'rocket' | 'hp' | 'tp' | 'shock' | 'det' | 'tv' | 'uv' | 'sp' | 'sv';
export type FlowModel = 'equilibrium' | 'frozen';
export type PressureUnit = 'psia' | 'atm' | 'bar' | 'mbar' | 'kpa' | 'mpa';
export type TemperatureUnit = 'R' | 'K' | 'F' | 'C';
export type AmountUnit = 'wt_fraction' | 'of_ratio' | 'mol_fraction' | 'phi' | 'f/o';
export type NozzleType = 'conical' | 'bell_rao';
export type ExportFormat = 'python' | 'json' | 'notebook';
export type ExitConditionType = 'area_ratio' | 'pressure' | 'mach' | 'pressure_ratio';

export interface CEAReactant {
  species: string;
  weight: number;
  amount_unit: AmountUnit;
  temperature?: number;
  temperature_unit?: TemperatureUnit;
}

export interface CEARunRequest {
  problem_type: ProblemType;
  reactants: CEAReactant[];
  chamber_pressure: number;
  pressure_unit: PressureUnit;
  area_ratio?: number;
  supersonic_area_ratio?: number;
  flow_model: FlowModel;
  exit_condition_type?: ExitConditionType;
  exit_pressure?: number;
  exit_pressure_unit?: PressureUnit;
  exit_mach?: number;
  pressure_ratio?: number;
  assigned_temperature?: number;
  assigned_temperature_unit?: TemperatureUnit;
  // Sweep parameters
  sweep_of_start?: number;
  sweep_of_end?: number;
  sweep_of_steps?: number;
  sweep_pressure_start?: number;
  sweep_pressure_end?: number;
  sweep_pressure_steps?: number;
}

export interface CEAStation {
  pressure: number;
  temperature: number;
  density: number;
  mach: number;
  velocity: number;
  enthalpy: number;
  internal_energy: number;
  gibbs_free_energy: number;
  entropy: number;
  molecular_weight: number;
  cp: number;
  gamma: number;
  sonic_velocity: number;
}

export interface CEAPerformance {
  isp_vac: number;
  isp_sl: number;
  c_star: number;
  cf: number;
  t_chamber: number;
  p_exit: number;
  Ae_At?: number;
}

export interface CEASpeciesFraction {
  name: string;
  mole_fraction: number;
  mass_fraction: number;
}

export interface CEAResult {
  id: string;
  performance: CEAPerformance;
  stations: {
    chamber: CEAStation;
    throat: CEAStation;
    exit: CEAStation;
  };
  composition: CEASpeciesFraction[];
}

export interface SpeciesSearchResult {
  name: string;
  formula: string;
  category: string;
  molecular_weight: number;
}

export interface CADGenerateRequest {
  cea_result_id: string;
  nozzle_type: NozzleType;
  chamber_diameter: number;
  chamber_length: number;
  wall_thickness: number;
  convergence_angle: number;
  divergence_angle?: number;
  throat_diameter?: number;
  exit_diameter?: number;
}

export interface CADGenerateResult {
  id: string;
  stl_preview_url: string;
  step_download_url: string;
  openscad_download_url: string;
  parameters: Record<string, number>;
}

export interface RocketPyExportRequest {
  cea_result_id: string;
  format: ExportFormat;
  dry_mass?: number;
  rocket_diameter?: number;
  cd?: number;
  fin_count?: number;
  fin_span?: number;
  fin_root_chord?: number;
  fin_tip_chord?: number;
  fin_sweep?: number;
  latitude?: number;
  longitude?: number;
  elevation?: number;
}

export interface RocketPyExportResult {
  id: string;
  download_url: string;
  filename: string;
}