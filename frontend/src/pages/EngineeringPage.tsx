import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { engineering } from '../api/client';
import type {
  CEAResult,
  ChamberSizingRequest,
  ChamberSizingResult,
  BartzHeatFluxResult,
  InjectorSizingResult,
  InjectorElementType,
  PressureUnit,
} from '../types/api';

type Tab = 'chamber' | 'heatflux' | 'injector';

interface Props {
  result: CEAResult | null;
}

const ELEMENT_TYPES: { value: InjectorElementType; label: string; desc: string }[] = [
  { value: 'shear_coaxial', label: 'Shear Coaxial', desc: 'Velocity-driven mixing' },
  { value: 'unlike_impinging_doublet', label: 'Unlike Doublet', desc: 'F/O impinge, 60°' },
  { value: 'like_doublet', label: 'Like Doublet', desc: 'Same-propellant impinge' },
  { value: 'triplet', label: 'Triplet', desc: 'Center + 2 outer streams' },
  { value: 'pentad', label: 'Pentad', desc: '4 outer + 1 center' },
  { value: 'showerhead', label: 'Showerhead', desc: 'Axial, no impingement' },
];

export default function EngineeringPage({ result }: Props) {
  const [tab, setTab] = useState<Tab>('chamber');
  const [chamberResult, setChamberResult] = useState<ChamberSizingResult | null>(null);
  const [heatfluxResult, setHeatfluxResult] = useState<BartzHeatFluxResult | null>(null);
  const [injectorResult, setInjectorResult] = useState<InjectorSizingResult | null>(null);

  return (
    <div style={{
      display: 'flex',
      minHeight: 'calc(100vh - 52px)',
      background: '#0a0e14',
      backgroundImage: 'radial-gradient(ellipse at top, #141e2a 0%, transparent 60%), radial-gradient(ellipse at bottom, #0a1018 0%, transparent 40%)',
    }}>
      {/* Left Panel — Inputs */}
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
        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #1e2a38',
          background: '#141e2a',
        }}>
          {(['chamber', 'heatflux', 'injector'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1,
              padding: '12px 16px',
              background: tab === t ? '#0a0e14' : 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid #00E5B2' : '2px solid transparent',
              fontSize: 10,
              fontWeight: 600,
              color: tab === t ? '#00E5B2' : '#8899a6',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontFamily: "'Fira Code', monospace",
            }}
            onMouseEnter={(e) => { if (tab !== t) { (e.currentTarget as HTMLElement).style.color = '#e0e0e0'; (e.currentTarget as HTMLElement).style.background = '#0a0e14'; } }}
            onMouseLeave={(e) => { if (tab !== t) { (e.currentTarget as HTMLElement).style.color = '#8899a6'; (e.currentTarget as HTMLElement).style.background = 'none'; } }}
            >
              {t === 'chamber' ? 'Chamber Sizing' : t === 'heatflux' ? 'Heat Flux' : 'Injector'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {tab === 'chamber' && <ChamberInputs result={result} onResult={setChamberResult} />}
          {tab === 'heatflux' && <HeatFluxInputs result={result} onResult={setHeatfluxResult} />}
          {tab === 'injector' && <InjectorInputs result={result} onResult={setInjectorResult} />}
        </div>
      </aside>

      {/* Main Content — Results */}
      <main style={{ flex: 1, padding: '20px', overflowY: 'auto', background: '#0a0e14' }}>
        {tab === 'chamber' && <ChamberResultsPanel result={chamberResult} />}
        {tab === 'heatflux' && <HeatFluxResultsPanel result={heatfluxResult} />}
        {tab === 'injector' && <InjectorResultsPanel result={injectorResult} />}
      </main>
    </div>
  );
}

/* ========== CHAMBER SIZING ========== */

function ChamberInputs({ result, onResult }: Props & { onResult: (r: ChamberSizingResult | null) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [populated, setPopulated] = useState(false);
  const [thrust, setThrust] = useState('');
  const [massFlow, setMassFlow] = useState('');
  const [cStar, setCStar] = useState('');
  const [ispVac, setIspVac] = useState('');
  const [cf, setCf] = useState('');
  const [chamberPressure, setChamberPressure] = useState('500');
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>('psia');
  const [lStar, setLStar] = useState('60');
  const [contractionRatio, setContractionRatio] = useState('3');
  const [convergenceAngle, setConvergenceAngle] = useState('45');

  useEffect(() => {
    if (result && result.performance.c_star > 0 && !populated) {
      setCStar(String(result.performance.c_star.toFixed(1)));
      if (result.performance.isp_vac > 0) setIspVac(String(result.performance.isp_vac.toFixed(1)));
      if (result.performance.cf > 0) setCf(String(result.performance.cf.toFixed(3)));
      const chamber = result.stations.chamber;
      if (chamber) setChamberPressure(String((chamber.pressure / 6894.76).toFixed(0)));
      setPopulated(true);
    }
  }, [result]);

  const calculate = async () => {
    setLoading(true);
    setError('');
    try {
      const req: ChamberSizingRequest = {
        c_star: parseFloat(cStar) || 0,
        chamber_pressure: parseFloat(chamberPressure) || 0,
        pressure_unit: pressureUnit,
        l_star: parseFloat(lStar) || 60,
        contraction_ratio: parseFloat(contractionRatio) || 3,
        convergence_angle: parseFloat(convergenceAngle) || 45,
      };
      if (thrust) { req.thrust = parseFloat(thrust); req.thrust_unit = 'N'; }
      if (massFlow) req.mass_flow_rate = parseFloat(massFlow);
      if (ispVac) req.isp_vac = parseFloat(ispVac);
      if (cf) req.cf = parseFloat(cf);
      onResult(await engineering.chamberSizing(req));
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SectionLabel label="CHAMBER SIZING" />
      {result && result.performance.c_star > 0 && !populated && (
        <div style={{ fontSize: 9, color: '#00E5B2', marginBottom: 12, fontFamily: "'Fira Code', monospace", letterSpacing: '0.5px' }}>
          CEA DATA AVAILABLE — VALUES AUTO-POPULATED
        </div>
      )}

      <FieldGroup label="DRIVE PARAMETER">
        <InputField label="Thrust (N)" value={thrust} onChange={setThrust} placeholder="e.g. 5000" />
        <div style={{ textAlign: 'center', color: '#4a5560', fontSize: 9, margin: '4px 0', fontFamily: "'Fira Code', monospace" }}>— or —</div>
        <InputField label="Mass Flow (kg/s)" value={massFlow} onChange={setMassFlow} placeholder="e.g. 2.0" />
      </FieldGroup>
      <FieldGroup label="GAS PROPERTIES">
        <InputField label="c* (m/s)" value={cStar} onChange={setCStar} placeholder="e.g. 1800" />
        <InputField label="Isp vac (s)" value={ispVac} onChange={setIspVac} placeholder="optional" />
        <InputField label="Cf" value={cf} onChange={setCf} placeholder="optional" />
      </FieldGroup>
      <FieldGroup label="CHAMBER PARAMETERS">
        <InputField label={`Chamber Pressure (${pressureUnit})`} value={chamberPressure} onChange={setChamberPressure} />
        <SelectField label="Pressure Unit" value={pressureUnit} onChange={setPressureUnit} options={['psia', 'atm', 'bar', 'kpa', 'mpa']} />
        <InputField label="L* (in)" value={lStar} onChange={setLStar} placeholder="60" />
        <InputField label="Contraction Ratio" value={contractionRatio} onChange={setContractionRatio} placeholder="3" />
        <InputField label="Convergence Angle (°)" value={convergenceAngle} onChange={setConvergenceAngle} placeholder="45" />
      </FieldGroup>

      <button onClick={calculate} disabled={loading} style={{
        width: '100%', padding: '14px',
        background: loading ? '#1e2a38' : 'transparent',
        color: loading ? '#4a5560' : '#00E5B2',
        border: '1px solid',
        borderColor: loading ? '#3a4a58' : '#00E5B2',
        borderRadius: 2, cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: "'Fira Code', monospace", fontSize: 11, fontWeight: 600,
        letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => { if (!loading) { (e.currentTarget as HTMLElement).style.background = '#00E5B2'; (e.currentTarget as HTMLElement).style.color = '#000'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px #00E5B240'; } }}
      onMouseLeave={(e) => { if (!loading) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#00E5B2'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; } }}
      >
        {loading ? 'CALCULATING...' : '▶ EXECUTE CALCULATION'}
      </button>
      {error && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 8, fontFamily: "'Fira Code', monospace" }}>{error}</div>}
    </>
  );
}

function ChamberResultsPanel({ result }: { result: ChamberSizingResult | null }) {
  const r = result;
  if (!r) return <EmptyState />;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '16px 20px', background: '#0f1620', border: '1px solid #1e2a38', borderRadius: 2 }}>
        <h2 style={{ fontSize: 10, fontWeight: 600, color: '#00E5B2', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'Fira Code', monospace" }}>CHAMBER SIZING</h2>
        <div style={{ fontSize: 11, color: '#8899a6', fontFamily: "'Fira Code', monospace" }}>Throat / Chamber</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <Kpi label="THROAT DIA" value={formatM(r.throat_diameter)} unit={formatIn(r.throat_diameter) + ' in'} />
        <Kpi label="CHAMBER DIA" value={formatM(r.chamber_diameter)} unit={formatIn(r.chamber_diameter) + ' in'} />
        <Kpi label="CHAMBER LEN" value={formatM(r.chamber_length)} unit={formatIn(r.chamber_length) + ' in'} />
        <Kpi label="THRUST" value={`${r.thrust.toFixed(1)} N`} unit={`${(r.thrust / 4.44822).toFixed(1)} lbf`} />
      </div>
      <div style={{ background: '#0f1620', borderRadius: 2, border: '1px solid #1e2a38', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: "'Fira Code', monospace" }}>
          <thead>
            <tr style={{ background: '#141e2a' }}>
              <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>Parameter</th>
              <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            <DetailRow label="Throat Area" value={`${(r.throat_area * 1e4).toFixed(3)} cm²`} />
            <DetailRow label="Chamber Volume" value={`${(r.chamber_volume * 1e6).toFixed(1)} cm³`} />
            <DetailRow label="Cylindrical Length" value={formatM(r.chamber_length_cylindrical)} />
            <DetailRow label="Convergent Length" value={formatM(r.convergent_length)} />
            <DetailRow label="Mass Flow Rate" value={`${r.mass_flow_rate.toFixed(3)} kg/s`} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========== HEAT FLUX ========== */

function HeatFluxInputs({ result: ceaResult, onResult }: Props & { onResult: (r: BartzHeatFluxResult | null) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [populated, setPopulated] = useState(false);
  const [chamberPressure, setChamberPressure] = useState('500');
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>('psia');
  const [cStar, setCStar] = useState('');
  const [cpChamber, setCpChamber] = useState('');
  const [gammaChamber, setGammaChamber] = useState('');
  const [tChamber, setTChamber] = useState('');
  const [molWeight, setMolWeight] = useState('');
  const [throatDia, setThroatDia] = useState('');
  const [areaRatioExit, setAreaRatioExit] = useState('10');
  const [wallTemp, setWallTemp] = useState('600');

  useEffect(() => {
    if (ceaResult && ceaResult.performance.c_star > 0 && !populated) {
      setCStar(String(ceaResult.performance.c_star.toFixed(1)));
      setTChamber(String(ceaResult.performance.t_chamber.toFixed(0)));
      const chamber = ceaResult.stations.chamber;
      if (chamber) {
        setCpChamber(String((chamber.cp * 1000).toFixed(1)));
        setGammaChamber(String(chamber.gamma.toFixed(3)));
        setMolWeight(String(chamber.molecular_weight.toFixed(2)));
        setChamberPressure(String((chamber.pressure / 6894.76).toFixed(0)));
      }
      setPopulated(true);
    }
  }, [ceaResult]);

  const calculate = async () => {
    setLoading(true);
    setError('');
    try {
      onResult(await engineering.bartzHeatFlux({
        chamber_pressure: parseFloat(chamberPressure) || 0,
        pressure_unit: pressureUnit,
        c_star: parseFloat(cStar) || 0,
        cp_chamber: parseFloat(cpChamber) || 0,
        gamma_chamber: parseFloat(gammaChamber) || 0,
        t_chamber: parseFloat(tChamber) || 0,
        molecular_weight: parseFloat(molWeight) || 0,
        throat_diameter: parseFloat(throatDia) || 0.01,
        area_ratio_exit: parseFloat(areaRatioExit) || 10,
        wall_temperature: parseFloat(wallTemp) || 600,
      }));
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SectionLabel label="BARTZ HEAT FLUX" />
      {ceaResult && ceaResult.performance.c_star > 0 && !populated && (
        <div style={{ fontSize: 9, color: '#00E5B2', marginBottom: 12, fontFamily: "'Fira Code', monospace", letterSpacing: '0.5px' }}>
          CEA DATA AVAILABLE — VALUES AUTO-POPULATED
        </div>
      )}
      <FieldGroup label="GAS PROPERTIES">
        <InputField label={`Pc (${pressureUnit})`} value={chamberPressure} onChange={setChamberPressure} />
        <SelectField label="Unit" value={pressureUnit} onChange={setPressureUnit} options={['psia', 'atm', 'bar', 'kpa', 'mpa']} />
        <InputField label="c* (m/s)" value={cStar} onChange={setCStar} />
        <InputField label="Cp (J/kg·K)" value={cpChamber} onChange={setCpChamber} />
        <InputField label="γ (gamma)" value={gammaChamber} onChange={setGammaChamber} />
        <InputField label="T chamber (K)" value={tChamber} onChange={setTChamber} />
        <InputField label="Mol. Weight (kg/kmol)" value={molWeight} onChange={setMolWeight} />
      </FieldGroup>
      <FieldGroup label="GEOMETRY">
        <InputField label="Throat Dia (m)" value={throatDia} onChange={setThroatDia} />
        <InputField label="Ae/At" value={areaRatioExit} onChange={setAreaRatioExit} />
      </FieldGroup>
      <FieldGroup label="WALL">
        <InputField label="Wall Temp (K)" value={wallTemp} onChange={setWallTemp} />
      </FieldGroup>

      <CalcButton onClick={calculate} loading={loading} />
      {error && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 8, fontFamily: "'Fira Code', monospace" }}>{error}</div>}
    </>
  );
}

function HeatFluxResultsPanel({ result }: { result: BartzHeatFluxResult | null }) {
  const r = result;
  if (!r) return <EmptyState />;
  const chartData = r.stations.map(s => ({
    station: s.station,
    heat_flux: s.heat_flux / 1e6,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '16px 20px', background: '#0f1620', border: '1px solid #1e2a38', borderRadius: 2 }}>
        <h2 style={{ fontSize: 10, fontWeight: 600, color: '#00E5B2', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'Fira Code', monospace" }}>BARTZ HEAT FLUX</h2>
        <div style={{ fontSize: 11, color: '#8899a6', fontFamily: "'Fira Code', monospace" }}>{r.max_heat_flux_station} peak</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <Kpi label="MAX HEAT FLUX" value={`${(r.max_heat_flux / 1e6).toFixed(2)} MW/m²`} unit={r.max_heat_flux_station} />
        <Kpi label="THROAT DIA" value={formatM(r.throat_diameter)} unit={formatIn(r.throat_diameter) + ' in'} />
        <Kpi label="STATIONS" value={String(r.stations.length)} unit="computed" />
      </div>
      <div style={{ background: '#0f1620', borderRadius: 2, border: '1px solid #1e2a38', overflow: 'hidden', marginBottom: '20px' }}>
        <h3 style={{ fontSize: 10, fontWeight: 600, color: '#8899a6', padding: '12px 14px', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Fira Code', monospace", borderBottom: '1px solid #1e2a38' }}>HEAT FLUX BY STATION</h3>
        <div style={{ padding: '0 14px' }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2a38" />
              <XAxis dataKey="station" tick={{ fontSize: 11, fill: '#8899a6', fontFamily: "'Fira Code', monospace" }} />
              <YAxis tick={{ fontSize: 11, fill: '#8899a6', fontFamily: "'Fira Code', monospace" }} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #1e2a38', fontSize: 11, fontFamily: "'Fira Code', monospace" }} />
              <Bar dataKey="heat_flux" name="Heat Flux (MW/m²)" fill="#ff6b6b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ background: '#0f1620', borderRadius: 2, border: '1px solid #1e2a38', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: "'Fira Code', monospace" }}>
          <thead>
            <tr style={{ background: '#141e2a' }}>
              <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>Station</th>
              <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>Mach</th>
              <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>h_g (W/m²K)</th>
              <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>T_aw (K)</th>
              <th style={{ textAlign: 'right', padding: '12px 14px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', color: '#8899a6', letterSpacing: '0.8px' }}>q (MW/m²)</th>
            </tr>
          </thead>
          <tbody>
            {r.stations.map(s => (
              <tr key={s.station} style={{ borderBottom: '1px solid #1e2a38' }}>
                <td style={{ padding: '12px 14px', color: '#e0e0e0' }}>{s.station}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#8899a6' }}>{s.mach.toFixed(3)}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#8899a6' }}>{s.h_g.toFixed(0)}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#8899a6' }}>{s.t_adiabatic_wall.toFixed(0)}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', color: '#8899a6' }}>{(s.heat_flux / 1e6).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========== INJECTOR SIZING ========== */

function InjectorInputs({ result: _ceaResult, onResult }: Props & { onResult: (r: InjectorSizingResult | null) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fuelMdot, setFuelMdot] = useState('');
  const [oxMdot, setOxMdot] = useState('');
  const [fuelDensity, setFuelDensity] = useState('810');
  const [oxDensity, setOxDensity] = useState('1141');
  const [fuelDp, setFuelDp] = useState('75');
  const [oxDp, setOxDp] = useState('75');
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>('psia');
  const [fuelCd, setFuelCd] = useState('0.65');
  const [oxCd, setOxCd] = useState('0.65');
  const [elementType, setElementType] = useState<InjectorElementType>('shear_coaxial');

  const calculate = async () => {
    setLoading(true);
    setError('');
    try {
      onResult(await engineering.injectorSizing({
        fuel_mass_flow_rate: parseFloat(fuelMdot) || 0,
        oxidizer_mass_flow_rate: parseFloat(oxMdot) || 0,
        fuel_density: parseFloat(fuelDensity) || 0,
        oxidizer_density: parseFloat(oxDensity) || 0,
        fuel_pressure_drop: parseFloat(fuelDp) || 0,
        oxidizer_pressure_drop: parseFloat(oxDp) || 0,
        fuel_discharge_coefficient: parseFloat(fuelCd) || 0.65,
        oxidizer_discharge_coefficient: parseFloat(oxCd) || 0.65,
        element_type: elementType,
        pressure_unit: pressureUnit,
      }));
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SectionLabel label="INJECTOR SIZING" />
      <FieldGroup label="ELEMENT TYPE">
        <div style={{ marginBottom: 6 }}>
          <select value={elementType} onChange={e => setElementType(e.target.value as InjectorElementType)} style={{
            width: '100%', padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38',
            borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace",
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#00E5B2'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px #00E5B21a'; }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1e2a38'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          >
            {ELEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div style={{ fontSize: 9, color: '#4a5560', marginTop: 4, fontFamily: "'Fira Code', monospace" }}>
            {ELEMENT_TYPES.find(t => t.value === elementType)?.desc}
          </div>
        </div>
      </FieldGroup>
      <FieldGroup label="FUEL">
        <InputField label="Mass Flow (kg/s)" value={fuelMdot} onChange={setFuelMdot} />
        <InputField label="Density (kg/m³)" value={fuelDensity} onChange={setFuelDensity} />
        <InputField label={`Pressure Drop (${pressureUnit})`} value={fuelDp} onChange={setFuelDp} />
        <InputField label="Discharge Coeff" value={fuelCd} onChange={setFuelCd} />
      </FieldGroup>
      <FieldGroup label="OXIDIZER">
        <InputField label="Mass Flow (kg/s)" value={oxMdot} onChange={setOxMdot} />
        <InputField label="Density (kg/m³)" value={oxDensity} onChange={setOxDensity} />
        <InputField label={`Pressure Drop (${pressureUnit})`} value={oxDp} onChange={setOxDp} />
        <InputField label="Discharge Coeff" value={oxCd} onChange={setOxCd} />
      </FieldGroup>
      <SelectField label="Pressure Unit" value={pressureUnit} onChange={setPressureUnit} options={['psia', 'atm', 'bar', 'kpa', 'mpa']} />

      <CalcButton onClick={calculate} loading={loading} />
      {error && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 8, fontFamily: "'Fira Code', monospace" }}>{error}</div>}
    </>
  );
}

function InjectorResultsPanel({ result }: { result: InjectorSizingResult | null }) {
  const r = result;
  if (!r) return <EmptyState />;

  const elInfo = r.element_info;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '16px 20px', background: '#0f1620', border: '1px solid #1e2a38', borderRadius: 2 }}>
        <h2 style={{ fontSize: 10, fontWeight: 600, color: '#00E5B2', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: "'Fira Code', monospace" }}>INJECTOR SIZING</h2>
        <div style={{ fontSize: 11, color: '#8899a6', fontFamily: "'Fira Code', monospace" }}>
          {elInfo ? elInfo.element_type.replace(/_/g, ' ').toUpperCase() : ''}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        <Kpi label="TOTAL ORIFICES" value={String(r.total_orifice_count)} unit={`F:${r.fuel.number_of_orifices} / OX:${r.oxidizer.number_of_orifices}`} />
        <Kpi label="MOMENTUM RATIO" value={r.momentum_ratio.toFixed(2)} unit="fuel/oxidizer" />
        <Kpi label="FUEL JET V" value={`${r.fuel.jet_velocity.toFixed(1)} m/s`} unit={`${r.oxidizer.jet_velocity.toFixed(1)} m/s OX`} />
        {elInfo && <Kpi label="MIXING EFF" value={`${(elInfo.mixing_efficiency * 100).toFixed(0)}%`} unit={`${elInfo.orifices_per_element} orif/elem`} />}
      </div>

      {/* Element info panel */}
      {elInfo && (
        <div style={{ background: '#0f1620', borderRadius: 2, border: '1px solid #1e2a38', marginBottom: '20px', padding: '16px 20px' }}>
          <h3 style={{ fontSize: 10, fontWeight: 600, color: '#00E5B2', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Fira Code', monospace", marginBottom: 12 }}>
            <span style={{ width: 6, height: 6, background: '#00E5B2', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 4px #00E5B2', marginRight: 8 }}></span>
            ELEMENT DESIGN
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#8899a6', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>Type</div>
              <div style={{ fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace" }}>{elInfo.element_type.replace(/_/g, ' ')}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#8899a6', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>Elements</div>
              <div style={{ fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace" }}>{elInfo.elements_per_injector}</div>
            </div>
            {elInfo.impingement_angle != null && (
              <div>
                <div style={{ fontSize: 9, fontWeight: 600, color: '#8899a6', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>Imping. Angle</div>
                <div style={{ fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace" }}>{elInfo.impingement_angle}°</div>
              </div>
            )}
          </div>
          {elInfo.design_notes.length > 0 && (
            <div style={{ fontSize: 10, color: '#4a5560', lineHeight: 1.8, fontFamily: "'Fira Code', monospace" }}>
              {elInfo.design_notes.map((note, i) => (
                <div key={i} style={{ marginBottom: 2 }}>{note.startsWith('⚠') ? <span style={{ color: '#f59e0b' }}>{note}</span> : `• ${note}`}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fuel and Oxidizer tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[r.fuel, r.oxidizer].map(p => (
          <div key={p.propellant_name} style={{ background: '#0f1620', borderRadius: 2, border: '1px solid #1e2a38', overflow: 'hidden' }}>
            <h3 style={{ fontSize: 10, fontWeight: 600, color: '#00E5B2', padding: '12px 14px', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: "'Fira Code', monospace", borderBottom: '1px solid #1e2a38' }}>
              {p.propellant_name}
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: "'Fira Code', monospace" }}>
              <tbody>
                <DetailRow label="Orifice Dia" value={`${(p.orifice_diameter * 1000).toFixed(2)} mm`} />
                <DetailRow label="Orifice Count" value={String(p.number_of_orifices)} />
                <DetailRow label="Total Area" value={`${(p.total_area * 1e6).toFixed(2)} mm²`} />
                <DetailRow label="Jet Velocity" value={`${p.jet_velocity.toFixed(1)} m/s`} />
                <DetailRow label="Pressure Drop" value={`${(p.pressure_drop / 6894.76).toFixed(1)} psi`} />
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========== SHARED UI — Dashboard aesthetic ========== */

function EmptyState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#4a5560', fontSize: 14 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#00E5B2', marginBottom: 8, fontFamily: "'Fira Code', monospace", textTransform: 'uppercase', letterSpacing: '1px' }}>SYSTEM STANDBY</div>
        <div style={{ fontSize: 12, color: '#4a5560' }}>Configure parameters and execute calculation</div>
      </div>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <h2 style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#00E5B2', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Fira Code', monospace" }}>
      <span style={{ width: 6, height: 6, background: '#00E5B2', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 4px #00E5B2' }}></span>
      {label}
    </h2>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20, padding: '14px', background: '#141e2a', borderRadius: 2, border: '1px solid #1e2a38' }}>
      <h3 style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#00E5B2', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Fira Code', monospace" }}>
        <span style={{ width: 6, height: 6, background: '#00E5B2', borderRadius: '50%', boxShadow: '0 0 4px #00E5B2' }}></span>
        {label}
      </h3>
      {children}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8899a6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38',
          borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace",
          transition: 'all 0.2s', outline: 'none', boxSizing: 'border-box',
        }}
        onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#00E5B2'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px #00E5B21a'; }}
        onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1e2a38'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: any) => void; options: string[];
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: 'block', fontSize: 9, fontWeight: 600, color: '#8899a6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '10px 12px', background: '#0a0e14', border: '1px solid #1e2a38',
          borderRadius: 2, fontSize: 12, color: '#e0e0e0', fontFamily: "'Fira Code', monospace",
          cursor: 'pointer', transition: 'all 0.2s',
        }}
        onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#00E5B2'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px #00E5B21a'; }}
        onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#1e2a38'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function CalcButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: '100%', padding: '14px',
      background: loading ? '#1e2a38' : 'transparent',
      color: loading ? '#4a5560' : '#00E5B2',
      border: '1px solid',
      borderColor: loading ? '#3a4a58' : '#00E5B2',
      borderRadius: 2, cursor: loading ? 'not-allowed' : 'pointer',
      fontFamily: "'Fira Code', monospace", fontSize: 11, fontWeight: 600,
      letterSpacing: '1px', textTransform: 'uppercase', transition: 'all 0.2s',
    }}
    onMouseEnter={(e) => { if (!loading) { (e.currentTarget as HTMLElement).style.background = '#00E5B2'; (e.currentTarget as HTMLElement).style.color = '#000'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px #00E5B240'; } }}
    onMouseLeave={(e) => { if (!loading) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#00E5B2'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; } }}
    >
      {loading ? 'CALCULATING...' : '▶ EXECUTE CALCULATION'}
    </button>
  );
}

function Kpi({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div style={{
      background: '#0f1620', borderRadius: 2, padding: '14px',
      border: '1px solid #1e2a38', position: 'relative', overflow: 'hidden', transition: 'all 0.2s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#00E5B2'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px #00E5B21a'; }}
    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1e2a38'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '2px', height: '100%', background: '#00E5B2', opacity: 0.5 }} />
      <div style={{ fontSize: 9, fontWeight: 600, color: '#8899a6', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.8px', fontFamily: "'Fira Code', monospace" }}>{label}</div>
      <div style={{ fontFamily: "'Fira Code', monospace", fontSize: 22, fontWeight: 600, color: '#00E5B2', textShadow: '0 0 10px #00E5B240' }}>
        {value}
        <span style={{ fontSize: 11, fontWeight: 400, color: '#4a5560', marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderBottom: '1px solid #1e2a38' }}>
      <td style={{ padding: '12px 14px', fontSize: 11, fontWeight: 500, color: '#e0e0e0' }}>{label}</td>
      <td style={{ padding: '12px 14px', fontSize: 11, textAlign: 'right', fontFamily: "'Fira Code', monospace", color: '#8899a6' }}>{value}</td>
    </tr>
  );
}

function formatM(m: number): string {
  return `${(m * 1000).toFixed(2)} mm`;
}

function formatIn(m: number): string {
  return `${(m * 39.3701).toFixed(3)}`;
}