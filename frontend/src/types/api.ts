export type ProblemType = 'rocket' | 'hp' | 'tp' | 'shock' | 'det' | 'tv' | 'uv' | 'sp' | 'sv';
export type FlowModel = 'equilibrium' | 'frozen';
export type PressureUnit = 'psia' | 'atm' | 'bar' | 'mbar' | 'kpa' | 'mpa';
export type TemperatureUnit = 'R' | 'K' | 'F' | 'C';
export type AmountUnit = 'wt_fraction' | 'of_ratio' | 'mol_fraction' | 'phi' | 'f/o';
export type NozzleType = 'conical' | 'bell_rao';
export type ExportFormat = 'python' | 'json' | 'notebook';

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
  area_ratio: number;
  supersonic_area_ratio?: number;
  flow_model: FlowModel;
}

export interface CEAStation {
  pressure: number;
  temperature: number;
  density: number;
  mach: number;
  velocity: number;
}

export interface CEAPerformance {
  isp_vac: number;
  isp_sl: number;
  c_star: number;
  cf: number;
  t_chamber: number;
  p_exit: number;
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