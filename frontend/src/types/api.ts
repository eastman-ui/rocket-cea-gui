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

// --- Engineering Calculator Types ---

export interface ChamberSizingRequest {
  thrust?: number;
  thrust_unit?: string;
  mass_flow_rate?: number;
  c_star: number;
  isp_vac?: number;
  cf?: number;
  chamber_pressure: number;
  pressure_unit: PressureUnit;
  l_star: number;
  l_star_unit?: string;
  contraction_ratio: number;
  convergence_angle: number;
  cea_result_id?: string;
}

export interface ChamberSizingResult {
  throat_area: number;
  throat_diameter: number;
  chamber_volume: number;
  chamber_diameter: number;
  chamber_length: number;
  chamber_length_cylindrical: number;
  convergent_length: number;
  mass_flow_rate: number;
  thrust: number;
}

export interface BartzHeatFluxRequest {
  chamber_pressure: number;
  pressure_unit: PressureUnit;
  c_star: number;
  cp_chamber: number;
  gamma_chamber: number;
  t_chamber: number;
  molecular_weight: number;
  viscosity?: number;
  prandtl?: number;
  throat_diameter: number;
  throat_radius_of_curvature?: number;
  area_ratio_exit: number;
  wall_temperature: number;
  recovery_factor?: number;
  mach_numbers?: number[];
  cea_result_id?: string;
}

export interface BartzStationResult {
  station: string;
  mach: number;
  area_ratio: number;
  h_g: number;
  t_adiabatic_wall: number;
  heat_flux: number;
}

export interface BartzHeatFluxResult {
  throat_diameter: number;
  stations: BartzStationResult[];
  max_heat_flux: number;
  max_heat_flux_station: string;
}

export type InjectorElementType = 'shear_coaxial' | 'unlike_impinging_doublet' | 'like_doublet' | 'triplet' | 'pentad' | 'showerhead';

export interface InjectorSizingRequest {
  fuel_mass_flow_rate: number;
  oxidizer_mass_flow_rate: number;
  fuel_density: number;
  oxidizer_density: number;
  fuel_pressure_drop: number;
  oxidizer_pressure_drop: number;
  fuel_discharge_coefficient?: number;
  oxidizer_discharge_coefficient?: number;
  fuel_orifice_count?: number;
  oxidizer_orifice_count?: number;
  element_type?: InjectorElementType;
  pressure_unit: PressureUnit;
}

export interface InjectorOrificeResult {
  propellant_name: string;
  mass_flow_rate: number;
  density: number;
  pressure_drop: number;
  discharge_coefficient: number;
  orifice_area: number;
  orifice_diameter: number;
  number_of_orifices: number;
  total_area: number;
  jet_velocity: number;
}

export interface InjectorElementInfo {
  element_type: InjectorElementType;
  elements_per_injector: number;
  orifices_per_element: number;
  mixing_efficiency: number;
  impingement_angle: number | null;
  design_notes: string[];
}

export interface InjectorSizingResult {
  fuel: InjectorOrificeResult;
  oxidizer: InjectorOrificeResult;
  total_orifice_count: number;
  momentum_ratio: number;
  element_info: InjectorElementInfo | null;
}