import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CEARunRequest, CEAResult } from '../types/api';
import PerformanceChart from '../components/PerformanceChart';
import HeatmapChart from '../components/HeatmapChart';

const schema = z.object({
  problem_type: z.enum(['rocket', 'hp', 'tp', 'shock', 'det', 'tv', 'uv', 'sp', 'sv']),
  flow_model: z.enum(['equilibrium', 'frozen']),
  chamber_pressure: z.coerce.number().positive('Must be positive'),
  pressure_unit: z.enum(['psia', 'atm', 'bar', 'mbar', 'kpa', 'mpa']),
  exit_condition_type: z.enum(['pressure', 'mach', 'pressure_ratio']).optional().nullable(),
  exit_pressure: z.coerce.number().positive().optional().nullable(),
  exit_pressure_unit: z.enum(['psia', 'atm', 'bar', 'mbar', 'kpa', 'mpa']).optional().nullable(),
  exit_mach: z.coerce.number().positive().optional().nullable(),
  pressure_ratio: z.coerce.number().positive().optional().nullable(),
  assigned_temperature: z.coerce.number().positive().optional().nullable(),
  assigned_temperature_unit: z.enum(['K', 'R', 'F', 'C']).optional().nullable(),
  reactants: z.array(z.object({
    species: z.string().min(1, 'Select a species'),
    weight: z.coerce.number().positive('Must be positive'),
    amount_unit: z.enum(['of_ratio', 'wt_fraction', 'mol_fraction', 'phi', 'f/o']),
  })).min(2, 'Add both fuel and oxidizer'),
  sweep_of_start: z.coerce.number().default(0),
  sweep_of_end: z.coerce.number().default(0),
  sweep_of_steps: z.coerce.number().default(1),
  sweep_pressure_start: z.coerce.number().default(0),
  sweep_pressure_end: z.coerce.number().default(0),
  sweep_pressure_steps: z.coerce.number().default(1),
});

type FormValues = z.infer<typeof schema>;

const defaultReactants = [
  { species: 'O2', weight: 2.7, amount_unit: 'of_ratio' as const },
  { species: 'RP-1', weight: 1.0, amount_unit: 'of_ratio' as const },
];

const STORAGE_KEY = 'cea-gui-inputs';

interface Props {
  onSubmit: (data: CEARunRequest) => Promise<void>;
  loading?: boolean;
  result: CEAResult | null;
  sweepResults?: CEAResult[];
  sweepXKey?: 'of_ratio' | 'pressure';
  sweepXLabel?: string;
}

export default function DashboardPage({ onSubmit, loading, result, sweepResults }: Props) {
  const [showOptional, setShowOptional] = useState(false);
  const [activeTab, setActiveTab] = useState<'performance' | 'of-isp' | 'of-cstar' | 'of-cf' | 'p-isp' | 'p-cstar' | 'p-cf' | 'heatmap-isp' | 'heatmap-cstar' | 'heatmap-cf' | 'composition' | 'details'>('performance');
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);

  const loadSavedInputs = (): Partial<FormValues> => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  };

  const savedInputs = loadSavedInputs();

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      problem_type: 'rocket',
      flow_model: 'equilibrium',
      chamber_pressure: 500,
      pressure_unit: 'psia',
      exit_condition_type: undefined,
      exit_pressure: undefined,
      exit_pressure_unit: 'psia',
      exit_mach: undefined,
      pressure_ratio: undefined,
      assigned_temperature: undefined,
      assigned_temperature_unit: 'K',
      reactants: defaultReactants,
      sweep_of_start: 2.4,
      sweep_of_end: 2.8,
      sweep_of_steps: 5,
      sweep_pressure_start: 500,
      sweep_pressure_end: 500,
      sweep_pressure_steps: 1,
      ...savedInputs,
    },
  });

  const exitCondition = watch('exit_condition_type');
  const fuel = watch('reactants.1.species');
  const oxidizer = watch('reactants.0.species');
  const pressureUnit = watch('pressure_unit');


  // Detect 2D sweep from form values
  const ofSteps = watch('sweep_of_steps') || 1;
  const pSteps = watch('sweep_pressure_steps') || 1;
  const ofStartVal = watch('sweep_of_start') ?? 0;
  const ofEndVal = watch('sweep_of_end') ?? 0;
  const pStartVal = watch('sweep_pressure_start') ?? 0;
  const pEndVal = watch('sweep_pressure_end') ?? 0;

  // Safe number conversion
  const ofStart = Number(ofStartVal) || 0;
  const ofEnd = Number(ofEndVal) || 0;
  const pStart = Number(pStartVal) || 0;
  const pEnd = Number(pEndVal) || 0;

  // Compute step counts safely with guards
  const ofDenom = ofSteps > 1 ? ofSteps - 1 : 1;
  const pDenom = pSteps > 1 ? pSteps - 1 : 1;
  const ofStep = (ofEnd - ofStart) / ofDenom;
  const pStep = (pEnd - pStart) / pDenom;

  // Detect 2D sweep from result count (5x4=20 results) or form values
  const isOfSweep = ofSteps > 1 && ofStart !== ofEnd;
  const isPSweep = pSteps > 1 && pStart !== pEnd;
  const is2DSweep = isOfSweep && isPSweep && sweepResults && sweepResults.length > 1;

  // Use selected result for display, or first result if none selected
  const displayResult = (sweepResults && sweepResults.length > 0 && selectedResultIndex < sweepResults.length)
    ? sweepResults[selectedResultIndex]
    : result;

  // Transform sweep results into heatmap data format for 2D sweep
  const heatmapData = is2DSweep ? (() => {
    return sweepResults.map((r, i) => {
      const ofIdx = i % ofSteps;
      const pIdx = Math.floor(i / ofSteps);
      return {
        of: Math.round((ofStart + ofStep * ofIdx) * 100) / 100,
        pressure: Math.round((pStart + pStep * pIdx) * 100) / 100,
        isp_vac: r.performance.isp_vac,
        c_star: r.performance.c_star,
        cf: r.performance.cf,
      };
    });
  })() : [];

  // Debug: log heatmap data structure
  useEffect(() => {
    console.log('is2DSweep:', is2DSweep, 'sweepResults:', sweepResults?.length, 'heatmapData:', heatmapData.length);
    if (heatmapData.length > 0) {
      console.log('Heatmap data:', heatmapData.slice(0, 3), '... total:', heatmapData.length);
      console.log('ofValues:', [...new Set(heatmapData.map(d => d.of))].sort((a,b) => a-b));
      console.log('pValues:', [...new Set(heatmapData.map(d => d.pressure))].sort((a,b) => a-b));
    }
  }, [heatmapData, is2DSweep, sweepResults]);

  useEffect(() => {
    const subscription = watch((value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {}
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const processSubmit = async (data: FormValues) => {
    console.log('Form submitted with:', JSON.stringify(data, null, 2));
    try {
      localStorage.setItem('cea-last-result', JSON.stringify({ timestamp: Date.now(), data }));
    } catch {}
    // Convert null to undefined for API compatibility
    const apiData = {
      ...data,
      exit_condition_type: data.exit_condition_type || undefined,
      exit_pressure: data.exit_pressure || undefined,
      exit_pressure_unit: data.exit_pressure_unit || undefined,
      exit_mach: data.exit_mach || undefined,
      pressure_ratio: data.pressure_ratio || undefined,
      assigned_temperature: data.assigned_temperature || undefined,
      assigned_temperature_unit: data.assigned_temperature_unit || undefined,
    };
    await onSubmit(apiData);
  };

  const handleFormError = (errors: any) => {
    console.error('Form validation errors:', errors);
  };

  // For 2D sweep: separate data for O/F sweep (at constant pressure) and pressure sweep (at constant O/F)
  const ofSweepData = is2DSweep ? (() => {
    const ofDenom = ofSteps > 1 ? ofSteps - 1 : 1;
    const ofStep = (ofEnd - ofStart) / ofDenom;
    const seen = new Set<number>();
    return sweepResults
      .filter((_, i) => {
        const ofVal = Math.round((ofStart + ofStep * (i % ofSteps)) * 100) / 100;
        if (seen.has(ofVal)) return false;
        seen.add(ofVal);
        return true;
      })
      .map((r, i) => ({
        x: Math.round((ofStart + ofStep * (i % ofSteps)) * 100) / 100,
        isp_vac: r.performance.isp_vac,
        c_star: r.performance.c_star,
        cf: r.performance.cf,
      }));
  })() : [];

  const pressureSweepData = is2DSweep ? (() => {
    const data: Array<{ x: number; isp_vac: number; c_star: number; cf: number }> = [];
    const pValues = new Set<number>();

    for (let i = 0; i < sweepResults.length; i++) {
      const pIdx = Math.floor(i / ofSteps);
      const pVal = Math.round((pStart + pStep * pIdx) * 100) / 100;

      if (!pValues.has(pVal)) {
        pValues.add(pVal);
        data.push({
          x: pVal,
          isp_vac: sweepResults[i].performance.isp_vac,
          c_star: sweepResults[i].performance.c_star,
          cf: sweepResults[i].performance.cf,
        });
      }
    }

    return data.sort((a, b) => a.x - b.x);
  })() : [];

  const hasError = Object.keys(errors).length > 0;

  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 52px)',
      background: '#0a0e14',
      backgroundImage: 'radial-gradient(ellipse at top, #141e2a 0%, transparent 60%), radial-gradient(ellipse at bottom, #0a1018 0%, transparent 40%)',
    }}>
      {/* Left Panel - Inputs */}
      <aside style={{
        width: 400,
        minWidth: 400,
        background: '#0f1620',
        borderRight: '1px solid #1e2a38',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}>
        <form onSubmit={handleSubmit(processSubmit, handleFormError)} style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Propellant Selection */}
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#00E5B2', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Fira Code', monospace" }}>
              <span style={{ width: 6, height: 6, background: '#00E5B2', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 4px #00E5B2' }}></span>
              PROPELLANTS
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8899a6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>Oxidizer</label>
                <select {...register('reactants.0.species')} style={{ width: '100%', padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace", cursor: 'pointer', transition: 'all 0.2s' }}
                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#00E5B2'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px #00E5B21a'; }}
                  onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1e2a38'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <option value="O2">O2 (LOX)</option>
                  <option value="N2O4">N2O4</option>
                  <option value="H2O2">H2O2</option>
                  <option value="HNO3">HNO3</option>
                  <option value="MON">MON</option>
                  <option value="N2O">N2O</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8899a6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>Fuel</label>
                <select {...register('reactants.1.species')} style={{ width: '100%', padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace", cursor: 'pointer', transition: 'all 0.2s' }}
                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#00E5B2'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px #00E5B21a'; }}
                  onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1e2a38'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <option value="CH4">CH4 (Methane)</option>
                  <option value="RP-1">RP-1 (Kerosene)</option>
                  <option value="H2">H2 (Hydrogen)</option>
                  <option value="C3H8">C3H8</option>
                  <option value="C2H5OH">C2H5OH</option>
                  <option value="C3H6">C3H6</option>
                  <option value="N2H4">N2H4</option>
                  <option value="CH6N2">CH6N2</option>
                  <option value="C2H8N2">C2H8N2</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8899a6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>Mode</label>
                <select {...register('reactants.0.amount_unit')} style={{ width: '100%', padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace", cursor: 'pointer', transition: 'all 0.2s' }}
                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#00E5B2'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px #00E5B21a'; }}
                  onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1e2a38'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <option value="of_ratio">O/F Ratio</option>
                  <option value="phi">Equivalence (φ)</option>
                  <option value="f/o">F/O Ratio</option>
                  <option value="wt_fraction">Weight Fraction</option>
                  <option value="mol_fraction">Mole Fraction</option>
                </select>
              </div>
            </div>
          </div>

          {/* O/F Sweep */}
          <div style={{ marginBottom: 20, padding: '14px', background: '#141e2a', borderRadius: 2, border: '1px solid #1e2a38' }}>
            <h3 style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#00E5B2', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Fira Code', monospace" }}>
              <span style={{ width: 6, height: 6, background: '#00E5B2', borderRadius: '50%', boxShadow: '0 0 4px #00E5B2' }}></span>
              O/F SWEEP
            </h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input {...register('sweep_of_start')} style={{ flex: 1, minWidth: 0, padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace" }} type="number" step="0.01" min="0.01" placeholder="Start" />
              <input {...register('sweep_of_end')} style={{ flex: 1, minWidth: 0, padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace" }} type="number" step="0.01" min="0.01" placeholder="End" />
              <input {...register('sweep_of_steps')} style={{ width: 64, padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace", textAlign: 'center' }} type="number" placeholder="Pts" min="1" max="50" />
            </div>
            <div style={{ fontSize: 9, color: '#4a5560', fontFamily: "'Fira Code', monospace" }}>Ex: 2.0→2.8, 5 pts = [2.0, 2.2, 2.4, 2.6, 2.8]</div>
          </div>

          {/* Pressure Sweep */}
          <div style={{ marginBottom: 20, padding: '14px', background: '#141e2a', borderRadius: 2, border: '1px solid #1e2a38' }}>
            <h3 style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#00E5B2', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Fira Code', monospace" }}>
              <span style={{ width: 6, height: 6, background: '#00E5B2', borderRadius: '50%', boxShadow: '0 0 4px #00E5B2' }}></span>
              PRESSURE SWEEP
            </h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input {...register('sweep_pressure_start')} style={{ flex: 1, minWidth: 0, padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace" }} type="number" placeholder="Start" />
              <input {...register('sweep_pressure_end')} style={{ flex: 1, minWidth: 0, padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace" }} type="number" placeholder="End" />
              <input {...register('sweep_pressure_steps')} style={{ width: 64, padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace", textAlign: 'center' }} type="number" placeholder="Pts" min="1" max="50" />
            </div>
            <div style={{ fontSize: 9, color: '#4a5560', fontFamily: "'Fira Code', monospace" }}>Calculates evenly spaced points</div>
          </div>

          {/* Basic Settings */}
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#00E5B2', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Fira Code', monospace" }}>
              <span style={{ width: 6, height: 6, background: '#00E5B2', borderRadius: '50%', boxShadow: '0 0 4px #00E5B2' }}></span>
              SETTINGS
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8899a6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>Pressure Unit</label>
                <select {...register('pressure_unit')} style={{ width: '100%', padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace", cursor: 'pointer', transition: 'all 0.2s' }}
                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#00E5B2'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px #00E5B21a'; }}
                  onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1e2a38'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <option value="psia">psia</option>
                  <option value="atm">atm</option>
                  <option value="bar">bar</option>
                  <option value="mbar">mbar</option>
                  <option value="kpa">kPa</option>
                  <option value="mpa">MPa</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8899a6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>Flow Model</label>
                <select {...register('flow_model')} style={{ width: '100%', padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace", cursor: 'pointer', transition: 'all 0.2s' }}
                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#00E5B2'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px #00E5B21a'; }}
                  onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1e2a38'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <option value="equilibrium">Equilibrium</option>
                  <option value="frozen">Frozen</option>
                </select>
              </div>
            </div>
          </div>

          {/* Optional Section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#00E5B2', fontFamily: "'Fira Code', monospace" }}>OPTIONAL</h2>
              <button type="button" onClick={() => setShowOptional(!showOptional)} style={{ background: '#141e2a', border: '1px solid #1e2a38', borderRadius: 2, padding: '6px 12px', color: '#8899a6', fontSize: 9, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: "'Fira Code', monospace", transition: 'all 0.2s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#00E5B2'; (e.currentTarget as HTMLElement).style.color = '#00E5B2'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1e2a38'; (e.currentTarget as HTMLElement).style.color = '#8899a6'; }}
              >
                {showOptional ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            {showOptional && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8899a6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>Exit Condition</label>
                  <select {...register('exit_condition_type')} style={{ width: '100%', padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace", cursor: 'pointer', transition: 'all 0.2s' }}
                    onFocus={(e) => { e.target.style.borderColor = '#00E5B2'; e.target.style.boxShadow = '0 0 0 3px #00E5B21a'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#1e2a38'; e.target.style.boxShadow = 'none'; }}
                  >
                    <option value="">Auto (Area Ratio)</option>
                    <option value="pressure">Exit Pressure</option>
                    <option value="mach">Exit Mach</option>
                    <option value="pressure_ratio">Pressure Ratio</option>
                  </select>
                </div>
                {exitCondition === 'pressure' && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8899a6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>Exit Pressure</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input {...register('exit_pressure')} style={{ flex: 1, padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace" }} type="number" placeholder="Enter exit pressure" />
                      <select {...register('exit_pressure_unit')} style={{ width: 70, padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace", cursor: 'pointer', transition: 'all 0.2s' }}
                        onFocus={(e) => { e.target.style.borderColor = '#00E5B2'; e.target.style.boxShadow = '0 0 0 3px #00E5B21a'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#1e2a38'; e.target.style.boxShadow = 'none'; }}
                      >
                        <option value="psia">psia</option>
                        <option value="atm">atm</option>
                        <option value="bar">bar</option>
                      </select>
                    </div>
                  </div>
                )}
                {exitCondition === 'mach' && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8899a6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>Exit Mach Number</label>
                    <input {...register('exit_mach')} style={{ width: '100%', padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace" }} type="number" step="0.1" placeholder="Enter exit Mach" />
                  </div>
                )}
                {exitCondition === 'pressure_ratio' && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8899a6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>Pressure Ratio (Pc/Pe)</label>
                    <input {...register('pressure_ratio')} style={{ width: '100%', padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38', borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace" }} type="number" step="0.1" placeholder="Enter pressure ratio" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Display */}
          {hasError && (
            <div style={{ padding: 12, background: '#2a1010', border: '1px solid #ef4444', borderRadius: 2, marginBottom: 16, fontSize: 11, color: '#fca5a5', fontFamily: "'Fira Code', monospace" }}>
              {errors.chamber_pressure && <div>Chamber pressure: {errors.chamber_pressure.message}</div>}
              {errors.reactants && <div>Reactants: {errors.reactants.message}</div>}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#1e2a38' : 'transparent',
              color: loading ? '#4a5560' : '#00E5B2',
              border: '1px solid',
              borderColor: loading ? '#3a4a58' : '#00E5B2',
              borderRadius: 2,
              fontSize: 11,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontFamily: "'Fira Code', monospace",
            }}
            onMouseEnter={(e) => { if (!loading) { (e.currentTarget as HTMLElement).style.background = '#00E5B2'; (e.currentTarget as HTMLElement).style.color = '#000'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px #00E5B240'; } }}
            onMouseLeave={(e) => { if (!loading) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#00E5B2'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; } }}
          >
            {loading ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#4a5560', borderTopColor: 'transparent', borderRadius: '50%' }}></span> CALCULATING...</span> : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>▶ EXECUTE CALCULATION</span>}
          </button>
        </form>

        {/* Info Panel */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e2a38', background: '#0f1620' }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#4a5560', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>PROPELLANT COMBINATION</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#00E5B2', marginBottom: 8, fontFamily: "'Fira Code', monospace" }}>{oxidizer} / {fuel}</div>
          <div style={{ fontSize: 9, color: '#4a5560', lineHeight: 1.8, fontFamily: "'Fira Code', monospace" }}>
            <div><strong>O/F:</strong> Oxidizer/Fuel by weight</div>
            <div><strong>Equilibrium:</strong> Chemistry adjusts during expansion</div>
            <div><strong>Frozen:</strong> Composition fixed at chamber</div>
          </div>
        </div>
      </aside>

      {/* Main Content - Results */}
      <main style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#0a0e14' }}>
        {!displayResult ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4a5560', fontSize: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#00E5B2', marginBottom: 8, fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '1px' }}>SYSTEM STANDBY</div>
              <div style={{ fontSize: 12, color: '#4a5560' }}>Configure parameters and execute calculation</div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '16px 20px', background: '#0f1620', border: '1px solid #1e2a38', borderRadius: 2 }}>
              <h2 style={{ fontSize: 10, fontWeight: 600, color: '#00E5B2', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'Fira Code', monospace" }}>TELEMETRY DATA</h2>
              <div style={{ fontSize: 11, color: '#8899a6', fontFamily: "'Fira Code', monospace" }}>{oxidizer} / {fuel}</div>
            </div>

            {/* Sweep result selector */}
            {sweepResults && sweepResults.length > 1 && (
              <div style={{ marginBottom: '16px', display: 'flex', gap: 8, alignItems: 'center', padding: '12px 16px', background: '#0f1620', borderRadius: 2, border: '1px solid #1e2a38' }}>
                <label style={{ fontSize: 9, fontWeight: 600, color: '#8899a6', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>SELECT RESULT:</label>
                <select
                  value={selectedResultIndex}
                  onChange={(e) => setSelectedResultIndex(Number(e.target.value))}
                  style={{ padding: '8px 12px', borderRadius: 2, border: '1px solid #1e2a38', fontSize: 11, background: '#0a0e14', color: '#e0e0e0', fontFamily: "'Fira Code', monospace", cursor: 'pointer', transition: 'all 0.2s' }}
                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#00E5B2'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px #00E5B21a'; }}
                  onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1e2a38'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  {sweepResults.map((_r, i) => {
                    const ofIdx = i % ofSteps;
                    const pIdx = Math.floor(i / ofSteps);
                    const ofVal = Math.round((ofStart + ofStep * ofIdx) * 100) / 100;
                    const pVal = Math.round((pStart + pStep * pIdx) * 100) / 100;
                    const label = `O/F ${ofVal.toFixed(2)} @ ${pVal} ${pressureUnit}`;
                    return (
                      <option key={i} value={i}>
                        #{i + 1} - {label}
                      </option>
                    );
                  })}
                </select>
                <span style={{ fontSize: 9, color: '#4a5560', fontFamily: "'Fira Code', monospace" }}>{sweepResults.length} DATA POINTS</span>
              </div>
            )}

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
              <Kpi label="Isp VACUUM" value={displayResult.performance.isp_vac} unit="s" />
              <Kpi label="C* EFFICIENCY" value={displayResult.performance.c_star} unit="m/s" />
              <Kpi label="THRUST COEFF" value={displayResult.performance.cf} unit="" />
              <Kpi label="CHAMBER TEMP" value={displayResult.performance.t_chamber} unit="R" />
            </div>

            {/* Tabs */}
            <div style={{ background: '#0f1620', borderRadius: 2, border: '1px solid #1e2a38', overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #1e2a38', background: '#141e2a', overflowX: 'auto', flexWrap: 'nowrap' }}>
                <TabButton active={activeTab === 'performance'} onClick={() => setActiveTab('performance')}>PERFORMANCE</TabButton>
                {is2DSweep ? (
                  <>
                    <TabButton active={activeTab === 'of-isp'} onClick={() => setActiveTab('of-isp')}>O/F → Isp</TabButton>
                    <TabButton active={activeTab === 'of-cstar'} onClick={() => setActiveTab('of-cstar')}>O/F → C*</TabButton>
                    <TabButton active={activeTab === 'of-cf'} onClick={() => setActiveTab('of-cf')}>O/F → Cf</TabButton>
                    <TabButton active={activeTab === 'p-isp'} onClick={() => setActiveTab('p-isp')}>Pc → Isp</TabButton>
                    <TabButton active={activeTab === 'p-cstar'} onClick={() => setActiveTab('p-cstar')}>Pc → C*</TabButton>
                    <TabButton active={activeTab === 'p-cf'} onClick={() => setActiveTab('p-cf')}>Pc → Cf</TabButton>
                    <TabButton active={activeTab === 'heatmap-isp'} onClick={() => setActiveTab('heatmap-isp')}>ISP MATRIX</TabButton>
                    <TabButton active={activeTab === 'heatmap-cstar'} onClick={() => setActiveTab('heatmap-cstar')}>C* MATRIX</TabButton>
                    <TabButton active={activeTab === 'heatmap-cf'} onClick={() => setActiveTab('heatmap-cf')}>CF MATRIX</TabButton>
                  </>
                ) : null}
                <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')}>DETAILED</TabButton>
                <TabButton active={activeTab === 'composition'} onClick={() => setActiveTab('composition')}>COMPOSITION</TabButton>
              </div>

              <div style={{ padding: '20px', overflowX: 'auto' }}>
                {activeTab === 'performance' && (
                  <PerformanceTable result={displayResult} />
                )}
                {activeTab === 'of-isp' && (
                  <div>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: '#8899a6', marginBottom: '16px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.8px' }}>O/F SWEEP</h3>
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: 10, fontWeight: 600, color: '#4a5560', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>ISP VACUUM</h4>
                      <PerformanceChart data={ofSweepData} xKey="of_ratio" yKey="isp_vac" xLabel="O/F RATIO" yLabel="Isp [s]" color="#00E5B2" yFormat={(v) => v.toFixed(1)} />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: 10, fontWeight: 600, color: '#4a5560', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>C* EFFICIENCY</h4>
                      <PerformanceChart data={ofSweepData} xKey="of_ratio" yKey="c_star" xLabel="O/F RATIO" yLabel="C* [m/s]" color="#00E5B2" yFormat={(v) => v.toFixed(0)} />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: 10, fontWeight: 600, color: '#4a5560', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>THRUST COEFFICIENT</h4>
                      <PerformanceChart data={ofSweepData} xKey="of_ratio" yKey="cf" xLabel="O/F RATIO" yLabel="Cf" color="#00E5B2" yFormat={(v) => v.toFixed(3)} />
                    </div>
                  </div>
                )}
                {activeTab === 'of-isp' && (
                  <div>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: '#8899a6', marginBottom: '16px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.8px' }}>O/F SWEEP - ISP</h3>
                    {ofSweepData.length > 0 ? (
                      <PerformanceChart data={ofSweepData} xKey="of_ratio" yKey="isp_vac" xLabel="O/F RATIO" yLabel="Isp [s]" color="#00E5B2" yFormat={(v) => v.toFixed(1)} />
                    ) : (
                      <div style={{ color: '#4a5560', fontSize: 12, padding: '40px', textAlign: 'center', fontFamily: "'Fira Code', monospace" }}>NO O/F SWEEP DATA</div>
                    )}
                  </div>
                )}
                {activeTab === 'of-cstar' && (
                  <div>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: '#8899a6', marginBottom: '16px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.8px' }}>O/F SWEEP - C*</h3>
                    {ofSweepData.length > 0 ? (
                      <PerformanceChart data={ofSweepData} xKey="of_ratio" yKey="c_star" xLabel="O/F RATIO" yLabel="C* [m/s]" color="#00E5B2" yFormat={(v) => v.toFixed(0)} />
                    ) : (
                      <div style={{ color: '#4a5560', fontSize: 12, padding: '40px', textAlign: 'center', fontFamily: "'Fira Code', monospace" }}>NO O/F SWEEP DATA</div>
                    )}
                  </div>
                )}
                {activeTab === 'of-cf' && (
                  <div>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: '#8899a6', marginBottom: '16px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.8px' }}>O/F SWEEP - CF</h3>
                    {ofSweepData.length > 0 ? (
                      <PerformanceChart data={ofSweepData} xKey="of_ratio" yKey="cf" xLabel="O/F RATIO" yLabel="Cf" color="#00E5B2" yFormat={(v) => v.toFixed(3)} />
                    ) : (
                      <div style={{ color: '#4a5560', fontSize: 12, padding: '40px', textAlign: 'center', fontFamily: "'Fira Code', monospace" }}>NO O/F SWEEP DATA</div>
                    )}
                  </div>
                )}
                {activeTab === 'p-isp' && (
                  <div>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: '#8899a6', marginBottom: '16px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.8px' }}>PRESSURE SWEEP - ISP</h3>
                    {pressureSweepData.length > 0 ? (
                      <PerformanceChart data={pressureSweepData} xKey="pressure" yKey="isp_vac" xLabel={`CHAMBER PRESSURE (${pressureUnit})`} yLabel="Isp [s]" color="#00E5B2" yFormat={(v) => v.toFixed(1)} />
                    ) : (
                      <div style={{ color: '#4a5560', fontSize: 12, padding: '40px', textAlign: 'center', fontFamily: "'Fira Code', monospace" }}>NO PRESSURE SWEEP DATA</div>
                    )}
                  </div>
                )}
                {activeTab === 'p-cstar' && (
                  <div>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: '#8899a6', marginBottom: '16px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.8px' }}>PRESSURE SWEEP - C*</h3>
                    {pressureSweepData.length > 0 ? (
                      <PerformanceChart data={pressureSweepData} xKey="pressure" yKey="c_star" xLabel={`CHAMBER PRESSURE (${pressureUnit})`} yLabel="C* [m/s]" color="#00E5B2" yFormat={(v) => v.toFixed(0)} />
                    ) : (
                      <div style={{ color: '#4a5560', fontSize: 12, padding: '40px', textAlign: 'center', fontFamily: "'Fira Code', monospace" }}>NO PRESSURE SWEEP DATA</div>
                    )}
                  </div>
                )}
                {activeTab === 'p-cf' && (
                  <div>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: '#8899a6', marginBottom: '16px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.8px' }}>PRESSURE SWEEP - CF</h3>
                    {pressureSweepData.length > 0 ? (
                      <PerformanceChart data={pressureSweepData} xKey="pressure" yKey="cf" xLabel={`CHAMBER PRESSURE (${pressureUnit})`} yLabel="Cf" color="#00E5B2" yFormat={(v) => v.toFixed(3)} />
                    ) : (
                      <div style={{ color: '#4a5560', fontSize: 12, padding: '40px', textAlign: 'center', fontFamily: "'Fira Code', monospace" }}>NO PRESSURE SWEEP DATA</div>
                    )}
                  </div>
                )}
                {activeTab === 'heatmap-isp' && (
                  <div>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: '#8899a6', marginBottom: '16px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.8px' }}>ISP MATRIX</h3>
                    {is2DSweep && heatmapData.length > 0 ? (
                      <HeatmapChart
                        data={heatmapData}
                        valueKey="isp_vac"
                        xLabel="O/F RATIO"
                        yLabel={`CHAMBER PRESSURE (${pressureUnit})`}
                        valueLabel="Isp"
                        colorScale={['#0a2a1f', '#0f3a2f', '#144a3f', '#1a5a4f', '#206a5f', '#267a6f', '#2c8a7f', '#00E5B2', '#00FFE0']}
                        onCellClick={(of, pressure) => {
                          const idx = heatmapData.findIndex(d => Math.abs(d.of - of) < 0.01 && Math.abs(d.pressure - pressure) < 0.01);
                          if (idx >= 0) setSelectedResultIndex(idx);
                        }}
                        pressureUnit={pressureUnit}
                      />
                    ) : (
                      <div style={{ color: '#4a5560', fontSize: 12, padding: '40px', textAlign: 'center', fontFamily: "'Fira Code', monospace" }}>NO 2D SWEEP DATA. SET BOTH O/F AND PRESSURE SWEEPS.</div>
                    )}
                  </div>
                )}
                {activeTab === 'heatmap-cstar' && (
                  <div>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: '#8899a6', marginBottom: '16px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.8px' }}>C* MATRIX</h3>
                    {is2DSweep && heatmapData.length > 0 ? (
                      <HeatmapChart
                        data={heatmapData}
                        valueKey="c_star"
                        xLabel="O/F RATIO"
                        yLabel={`CHAMBER PRESSURE (${pressureUnit})`}
                        valueLabel="C*"
                        colorScale={['#0a2a1f', '#0f3a2f', '#144a3f', '#1a5a4f', '#206a5f', '#267a6f', '#2c8a7f', '#00E5B2', '#00FFE0']}
                        onCellClick={(of, pressure) => {
                          const idx = heatmapData.findIndex(d => Math.abs(d.of - of) < 0.01 && Math.abs(d.pressure - pressure) < 0.01);
                          if (idx >= 0) setSelectedResultIndex(idx);
                        }}
                        pressureUnit={pressureUnit}
                      />
                    ) : (
                      <div style={{ color: '#4a5560', fontSize: 12, padding: '40px', textAlign: 'center', fontFamily: "'Fira Code', monospace" }}>NO 2D SWEEP DATA. SET BOTH O/F AND PRESSURE SWEEPS.</div>
                    )}
                  </div>
                )}
                {activeTab === 'heatmap-cf' && (
                  <div>
                    <h3 style={{ fontSize: 11, fontWeight: 600, color: '#8899a6', marginBottom: '16px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.8px' }}>CF MATRIX</h3>
                    {is2DSweep && heatmapData.length > 0 ? (
                      <HeatmapChart
                        data={heatmapData}
                        valueKey="cf"
                        xLabel="O/F RATIO"
                        yLabel={`CHAMBER PRESSURE (${pressureUnit})`}
                        valueLabel="Cf"
                        colorScale={['#0a2a1f', '#0f3a2f', '#144a3f', '#1a5a4f', '#206a5f', '#267a6f', '#2c8a7f', '#00E5B2', '#00FFE0']}
                        onCellClick={(of, pressure) => {
                          const idx = heatmapData.findIndex(d => Math.abs(d.of - of) < 0.01 && Math.abs(d.pressure - pressure) < 0.01);
                          if (idx >= 0) setSelectedResultIndex(idx);
                        }}
                        pressureUnit={pressureUnit}
                      />
                    ) : (
                      <div style={{ color: '#4a5560', fontSize: 12, padding: '40px', textAlign: 'center', fontFamily: "'Fira Code', monospace" }}>NO 2D SWEEP DATA. SET BOTH O/F AND PRESSURE SWEEPS.</div>
                    )}
                  </div>
                )}
                {activeTab === 'details' && (
                  <DetailedTable result={displayResult} />
                )}
                {activeTab === 'composition' && (
                  <CompositionTable composition={displayResult.composition} />
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Kpi({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div style={{
      background: '#0f1620',
      borderRadius: 2,
      padding: '14px',
      border: '1px solid #1e2a38',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.2s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#00E5B2'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px #00E5B21a'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e2a38'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '2px', height: '100%', background: '#00E5B2', opacity: 0.5 }} />
      <div style={{ fontSize: 9, fontWeight: 600, color: '#8899a6', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>{label}</div>
      <div style={{ fontFamily: "'Fira Code', monospace", fontSize: 22, fontWeight: 600, color: '#00E5B2', textShadow: '0 0 10px #00E5B240' }}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        <span style={{ fontSize: 11, fontWeight: 400, color: '#4a5560', marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 16px',
        background: active ? '#0a0e14' : 'none',
        border: 'none',
        borderBottom: active ? '2px solid #00E5B2' : '2px solid transparent',
        fontSize: 10,
        fontWeight: 600,
        color: active ? '#00E5B2' : '#8899a6',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        fontFamily: "'Fira Code', monospace",
      }}
      onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#e0e0e0'; (e.currentTarget as HTMLElement).style.background = '#0a0e14'; } }}
      onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#8899a6'; (e.currentTarget as HTMLElement).style.background = 'none'; } }}
    >
      {children}
    </button>
  );
}

function PerformanceTable({ result }: { result: CEAResult }) {
  const { performance, stations } = result;
  const fmt = (v: number) => {
    if (Math.abs(v) < 0.001) return v.toExponential(2);
    if (Math.abs(v) < 1) return v.toFixed(5);
    if (Math.abs(v) < 100) return v.toFixed(3);
    return v.toFixed(1);
  };

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: "'Fira Code', monospace" }}>
        <thead>
          <tr style={{ background: '#141e2a' }}>
            <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>Property</th>
            <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>Chamber</th>
            <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>Throat</th>
            <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>Exit</th>
          </tr>
        </thead>
        <tbody>
          <TableRow label="P, BAR" chamber={stations.chamber.pressure} throat={stations.throat.pressure} exit={stations.exit.pressure} fmt={fmt} />
          <TableRow label="T, K" chamber={stations.chamber.temperature} throat={stations.throat.temperature} exit={stations.exit.temperature} fmt={fmt} />
          <TableRow label="Density" chamber={stations.chamber.density} throat={stations.throat.density} exit={stations.exit.density} fmt={fmt} />
          <TableRow label="Mach" chamber={stations.chamber.mach} throat={stations.throat.mach} exit={stations.exit.mach} fmt={fmt} />
          <TableRow label="Velocity (m/s)" chamber={stations.chamber.velocity} throat={stations.throat.velocity} exit={stations.exit.velocity} fmt={fmt} />
        </tbody>
      </table>
      <h3 style={{ fontSize: 10, fontWeight: 600, color: '#8899a6', marginTop: '24px', marginBottom: '12px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.8px' }}>Performance</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: "'Fira Code', monospace" }}>
        <tbody>
          <TableRow label="C* (m/s)" chamber={performance.c_star} throat={performance.c_star} exit={performance.c_star} fmt={fmt} />
          <TableRow label="Cf" chamber={performance.cf} throat={performance.cf} exit={performance.cf} fmt={fmt} />
          <TableRow label="Isp vac (s)" chamber={performance.isp_vac} throat={performance.isp_vac} exit={performance.isp_vac} fmt={(v) => v.toFixed(1)} />
        </tbody>
      </table>
    </div>
  );
}

function TableRow({ label, chamber, throat, exit, fmt }: { label: string; chamber: number; throat: number; exit: number; fmt: (v: number) => string }) {
  return (
    <tr style={{ borderBottom: '1px solid #1e2a38' }}>
      <td style={{ padding: '12px 14px', fontSize: 11, fontWeight: 500, color: '#e0e0e0' }}>{label}</td>
      <td style={{ padding: '12px 14px', fontSize: 11, fontFamily: "'Fira Code', monospace", color: '#8899a6' }}>{fmt(chamber)}</td>
      <td style={{ padding: '12px 14px', fontSize: 11, fontFamily: "'Fira Code', monospace", color: '#8899a6' }}>{fmt(throat)}</td>
      <td style={{ padding: '12px 14px', fontSize: 11, fontFamily: "'Fira Code', monospace", color: '#8899a6' }}>{fmt(exit)}</td>
    </tr>
  );
}

function DetailedTable({ result }: { result: CEAResult }) {
  const { performance, stations } = result;
  const fmt = (v: number) => {
    if (Math.abs(v) < 0.001) return v.toExponential(2);
    if (Math.abs(v) < 0.1) return v.toFixed(4);
    if (Math.abs(v) < 1) return v.toFixed(3);
    if (Math.abs(v) < 10) return v.toFixed(2);
    if (Math.abs(v) < 100) return v.toFixed(1);
    return v.toFixed(0);
  };

  // Calculate Ae/At (area ratio) from exit Mach and gamma
  const calculateAeAt = (mach: number, gamma: number): number => {
    if (mach <= 0) return 1.0;
    const term = (1 + 0.5 * (gamma - 1) * mach * mach);
    const exp = (gamma + 1) / (2 * (gamma - 1));
    return (1 / mach) * Math.pow(term, exp) * Math.pow((gamma + 1) / 2, -exp);
  };
  const AeAt_exit = calculateAeAt(stations.exit.mach, stations.exit.gamma);
  const AeAt_throat = 1.0; // At throat, Mach = 1, Ae/At = 1

  return (
    <div>
      <h3 style={{ fontSize: 11, fontWeight: 600, color: '#8899a6', marginBottom: '16px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.8px' }}>Detailed Station Parameters</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: "'Fira Code', monospace" }}>
        <thead>
          <tr style={{ background: '#141e2a' }}>
            <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>Property</th>
            <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>Chamber</th>
            <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>Throat</th>
            <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>Exit</th>
          </tr>
        </thead>
        <tbody>
          <TableRow label="P, BAR" chamber={stations.chamber.pressure} throat={stations.throat.pressure} exit={stations.exit.pressure} fmt={fmt} />
          <TableRow label="T, K" chamber={stations.chamber.temperature} throat={stations.throat.temperature} exit={stations.exit.temperature} fmt={fmt} />
          <TableRow label="RHO, kg/m³" chamber={stations.chamber.density} throat={stations.throat.density} exit={stations.exit.density} fmt={fmt} />
          <TableRow label="H, kJ/kg" chamber={stations.chamber.enthalpy} throat={stations.throat.enthalpy} exit={stations.exit.enthalpy} fmt={fmt} />
          <TableRow label="U, kJ/kg" chamber={stations.chamber.internal_energy} throat={stations.throat.internal_energy} exit={stations.exit.internal_energy} fmt={fmt} />
          <TableRow label="G, kJ/kg" chamber={stations.chamber.gibbs_free_energy} throat={stations.throat.gibbs_free_energy} exit={stations.exit.gibbs_free_energy} fmt={fmt} />
          <TableRow label="S, kJ/(kg·K)" chamber={stations.chamber.entropy} throat={stations.throat.entropy} exit={stations.exit.entropy} fmt={fmt} />
          <TableRow label="MW, mol wt" chamber={stations.chamber.molecular_weight} throat={stations.throat.molecular_weight} exit={stations.exit.molecular_weight} fmt={fmt} />
          <TableRow label="Cp, kJ/(kg·K)" chamber={stations.chamber.cp} throat={stations.throat.cp} exit={stations.exit.cp} fmt={fmt} />
          <TableRow label="Gamma" chamber={stations.chamber.gamma} throat={stations.throat.gamma} exit={stations.exit.gamma} fmt={fmt} />
          <TableRow label="Son Vel, m/s" chamber={stations.chamber.sonic_velocity} throat={stations.throat.sonic_velocity} exit={stations.exit.sonic_velocity} fmt={fmt} />
          <TableRow label="Mach" chamber={stations.chamber.mach} throat={stations.throat.mach} exit={stations.exit.mach} fmt={fmt} />
          <TableRow label="Velocity, m/s" chamber={stations.chamber.velocity} throat={stations.throat.velocity} exit={stations.exit.velocity} fmt={fmt} />
        </tbody>
      </table>

      <h3 style={{ fontSize: 10, fontWeight: 600, color: '#8899a6', marginTop: '24px', marginBottom: '12px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.8px' }}>Performance Parameters</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: "'Fira Code', monospace" }}>
        <tbody>
          <TableRow label="Ae/At" chamber={1.0} throat={AeAt_throat} exit={AeAt_exit} fmt={fmt} />
          <TableRow label="CSTAR, m/s" chamber={performance.c_star} throat={performance.c_star} exit={performance.c_star} fmt={(v) => v.toFixed(0)} />
          <TableRow label="CF" chamber={performance.cf} throat={performance.cf} exit={performance.cf} fmt={fmt} />
          <TableRow label="Ivac, m/s" chamber={performance.isp_vac * 9.80665} throat={performance.isp_vac * 9.80665} exit={performance.isp_vac * 9.80665} fmt={(v) => v.toFixed(0)} />
          <TableRow label="Isp, m/s" chamber={performance.isp_vac * 9.80665} throat={performance.isp_vac * 9.80665} exit={performance.isp_vac * 9.80665} fmt={(v) => v.toFixed(0)} />
        </tbody>
      </table>
    </div>
  );
}

function CompositionTable({ composition }: { composition: CEAResult['composition'] }) {
  return (
    <div>
      <h3 style={{ fontSize: 11, fontWeight: 600, color: '#8899a6', marginBottom: '16px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '0.8px' }}>Exit Composition</h3>
      <div>
        {composition.map((sp, i) => {
          const maxMole = Math.max(...composition.map(s => s.mole_fraction));
          const pct = (sp.mole_fraction / maxMole) * 100;
          const colors = ['#00E5B2', '#0ea5e9', '#6366F1', '#10b981', '#f59e0b'];
          return (
            <div key={sp.name} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ width: 80, fontSize: 11, color: '#e0e0e0', fontWeight: 500, fontFamily: "'Fira Code', monospace" }}>{sp.name}</span>
              <div style={{ flex: 1, height: 16, background: '#141e2a', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: colors[i % colors.length] }} />
              </div>
              <span style={{ width: 60, fontSize: 10, color: '#8899a6', paddingLeft: 10, fontFamily: "'Fira Code', monospace", textAlign: 'right' }}>{sp.mole_fraction.toFixed(3)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
