import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CEARunRequest } from '../types/api';

const schema = z.object({
  problem_type: z.enum(['rocket', 'hp', 'tp', 'shock', 'det', 'tv', 'uv', 'sp', 'sv']),
  flow_model: z.enum(['equilibrium', 'frozen']),
  chamber_pressure: z.coerce.number().positive('Must be positive'),
  pressure_unit: z.enum(['psia', 'atm', 'bar']),
  area_ratio: z.coerce.number().positive('Must be positive'),
  supersonic_area_ratio: z.coerce.number().positive('Must be positive').optional(),
  reactants: z.array(z.object({
    species: z.string().min(1, 'Select a species'),
    weight: z.coerce.number().positive('Must be positive'),
    amount_unit: z.enum(['of_ratio', 'wt_fraction', 'mol_fraction', 'phi', 'f/o']),
  })).min(1, 'Add at least one reactant'),
});

type FormValues = z.infer<typeof schema>;

const defaultReactants = [
  { species: 'O2', weight: 6.0, amount_unit: 'of_ratio' as const },
  { species: 'RP-1', weight: 1.0, amount_unit: 'of_ratio' as const },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: '#ffffff',
  border: '1px solid #c8c0b4',
  borderRadius: 4,
  fontFamily: "'Fira Code', monospace",
  fontSize: 13,
  color: '#2c2416',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: '#6b5d4d',
  marginBottom: 5,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 2,
  textTransform: 'uppercase' as const,
  color: '#c4500a',
  marginBottom: 16,
  paddingBottom: 8,
  borderBottom: '2px solid #c4500a',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

interface Props {
  onSubmit: (data: CEARunRequest) => void;
  loading?: boolean;
}

export default function CEAInputPage({ onSubmit, loading }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      problem_type: 'rocket',
      flow_model: 'equilibrium',
      chamber_pressure: 1000,
      pressure_unit: 'psia',
      area_ratio: 40.0,
      supersonic_area_ratio: 10.0,
      reactants: defaultReactants,
    },
  });

  const processSubmit = (data: FormValues) => {
    onSubmit(data);
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)' }}>
      {/* Sidebar */}
      <aside style={{ width: 380, background: '#faf8f5', borderRight: '1px solid #c8c0b4', padding: 24, overflowY: 'auto' }}>
        <h2 style={sectionTitleStyle}>
          <span style={{ display: 'inline-block', width: 8, height: 8, background: '#c4500a' }} />
          Combustion Setup
        </h2>

        <form onSubmit={handleSubmit(processSubmit)}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Problem Type</label>
              <select {...register('problem_type')} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="rocket">Rocket (Isp, Cstar)</option>
                <option value="hp">HP — Enthalpy/Pressure</option>
                <option value="tp">TP — Temp/Pressure</option>
                <option value="det">Det — Chapman-Jouguet</option>
                <option value="shock">Shock — Shock Tube</option>
                <option value="tv">TV — Temp/Density</option>
                <option value="uv">UV — Combustion (ρ)</option>
                <option value="sp">SP — Entropy/Pressure</option>
                <option value="sv">SV — Entropy/Density</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Flow Model</label>
              <select {...register('flow_model')} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="equilibrium">Equilibrium</option>
                <option value="frozen">Frozen</option>
              </select>
            </div>
          </div>

          {/* Reactants section */}
          <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#a0937f', marginTop: 24, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, background: '#a0937f' }} />
            Reactants
          </h3>

          {/* Oxidizer card */}
          <div style={{ background: '#faf8f5', border: '1px solid #e0dcd5', borderRadius: 6, padding: 14, marginBottom: 10, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#1a5c9e', borderRadius: '6px 0 0 6px' }} />
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#1a5c9e', marginBottom: 8 }}>Oxidizer</div>
            <select {...register('reactants.0.species')} style={{ ...inputStyle, fontSize: 12, marginBottom: 8 }}>
              <option value="O2">O2 (Liquid Oxygen)</option>
              <option value="N2O4">N2O4</option>
              <option value="H2O2">H2O2</option>
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Weight</label>
                <input {...register('reactants.0.weight')} style={{ ...inputStyle, fontSize: 12, textAlign: 'right' }} />
              </div>
              <div style={{ width: 80 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Mode</label>
                <select {...register('reactants.0.amount_unit')} style={{ ...inputStyle, fontSize: 12, cursor: 'pointer' }}>
                  <option value="of_ratio">O/F</option>
                  <option value="phi">phi (equiv)</option>
                  <option value="f/o">F/O</option>
                  <option value="wt_fraction">Wt%</option>
                  <option value="mol_fraction">Mol%</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fuel card */}
          <div style={{ background: '#faf8f5', border: '1px solid #e0dcd5', borderRadius: 6, padding: 14, marginBottom: 10, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#c4500a', borderRadius: '6px 0 0 6px' }} />
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#c4500a', marginBottom: 8 }}>Fuel</div>
            <select {...register('reactants.1.species')} style={{ ...inputStyle, fontSize: 12, marginBottom: 8 }}>
              <option value="RP-1">RP-1 (CH1.92)</option>
              <option value="H2">H2 (Liquid)</option>
              <option value="CH4">CH4</option>
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Weight</label>
                <input {...register('reactants.1.weight')} style={{ ...inputStyle, fontSize: 12, textAlign: 'right' }} />
              </div>
              <div style={{ width: 80 }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Mode</label>
                <select {...register('reactants.1.amount_unit')} style={{ ...inputStyle, fontSize: 12, cursor: 'pointer' }}>
                  <option value="of_ratio">O/F</option>
                  <option value="wt_fraction">Wt%</option>
                </select>
              </div>
            </div>
          </div>

          <button type="button" style={{ width: '100%', padding: 8, background: 'none', border: '1px dashed #c8c0b4', color: '#a0937f', fontFamily: "'Fira Sans', sans-serif", fontSize: 12, borderRadius: 4, cursor: 'pointer', marginBottom: 16 }}>+ Add Reactant</button>

          {/* Chamber Conditions */}
          <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#a0937f', marginTop: 24, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-block', width: 6, height: 6, background: '#a0937f' }} />
            Chamber Conditions
          </h3>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Chamber Pressure</label>
              <input {...register('chamber_pressure')} style={inputStyle} />
            </div>
            <div style={{ width: 90 }}>
              <label style={labelStyle}>Unit</label>
              <select {...register('pressure_unit')} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="psia">psia</option>
                <option value="atm">atm</option>
                <option value="bar">bar</option>
                <option value="mbar">mbar</option>
                <option value="kpa">kPa</option>
                <option value="mpa">MPa</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Area Ratio (Ae/At)</label>
              <input {...register('area_ratio')} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Supersonic AR</label>
              <input {...register('supersonic_area_ratio')} style={inputStyle} />
            </div>
          </div>

          {Object.keys(errors).length > 0 && (
            <div style={{ padding: 10, background: '#fff3f3', border: '1px solid #d44', borderRadius: 4, marginBottom: 12, fontSize: 12, color: '#a00' }}>
              {errors.chamber_pressure && <div>Chamber pressure: {errors.chamber_pressure.message}</div>}
              {errors.area_ratio && <div>Area ratio: {errors.area_ratio.message}</div>}
              {errors.reactants && <div>Reactants: Check species and weight values</div>}
              {errors.supersonic_area_ratio && <div>Supersonic AR: {errors.supersonic_area_ratio.message}</div>}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              background: loading ? '#a84208' : '#c4500a',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontFamily: "'Fira Sans', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Calculating…' : '▶ Run CEA Calculation'}
          </button>
        </form>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0937f', fontSize: 14 }}>
        Configure combustion parameters and click "Run CEA Calculation" to see results.
      </div>
    </div>
  );
}