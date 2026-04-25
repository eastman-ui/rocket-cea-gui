import { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import type { CEAResult } from '../types/api';

const tabItems = [
  { value: 'performance', label: 'Performance' },
  { value: 'thermo', label: 'Thermodynamics' },
  { value: 'composition', label: 'Composition' },
  { value: 'transport', label: 'Transport' },
];

interface Props {
  result: CEAResult | null;
}

export default function ResultsPage({ result }: Props) {
  const [activeTab, setActiveTab] = useState('performance');

  if (!result) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 52px)', color: '#a0937f', fontSize: 14 }}>
        Run a CEA calculation to see results here.
      </div>
    );
  }

  const { performance, stations, composition } = result;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Section title */}
      <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#c4500a', marginBottom: 20, paddingBottom: 8, borderBottom: '2px solid #c4500a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'inline-block', width: 8, height: 8, background: '#c4500a' }} />
        LOX / RP-1 Results
      </h2>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <Kpi label="Isp (vac)" value={performance.isp_vac} unit="s" borderTopColor="#c4500a" />
        <Kpi label="C*" value={performance.c_star} unit="ft/s" borderTopColor="#2d7a3a" />
        <Kpi label="Cf" value={performance.cf} unit="" borderTopColor="#1a5c9e" />
        <Kpi label="T_chamber" value={performance.t_chamber} unit="R" borderTopColor="#c4500a" />
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List style={{ display: 'flex', borderBottom: '2px solid #c8c0b4', marginBottom: 20 }}>
          {tabItems.map(t => (
            <Tabs.Trigger
              key={t.value}
              value={t.value}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === t.value ? '2px solid #c4500a' : '2px solid transparent',
                marginBottom: -2,
                padding: '10px 18px',
                fontFamily: "'Fira Sans', sans-serif",
                fontSize: 13,
                fontWeight: activeTab === t.value ? 600 : 500,
                color: activeTab === t.value ? '#c4500a' : '#a0937f',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="performance">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#ffffff', borderRadius: 6, overflow: 'hidden', border: '1px solid #e0dcd5' }}>
            <thead>
              <tr style={{ background: '#2c2416' }}>
                <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#f4f1eb', padding: '10px 16px' }}>Property</th>
                <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#f4f1eb', padding: '10px 16px' }}>Chamber</th>
                <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#f4f1eb', padding: '10px 16px' }}>Throat</th>
                <th style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#f4f1eb', padding: '10px 16px' }}>Exit</th>
              </tr>
            </thead>
            <tbody>
              <DataRow label="Pressure" unit="psia" chamber={stations.chamber.pressure} throat={stations.throat.pressure} exit={stations.exit.pressure} />
              <DataRow label="Temperature" unit="R" chamber={stations.chamber.temperature} throat={stations.throat.temperature} exit={stations.exit.temperature} />
              <DataRow label="Density" unit="lb/ft³" chamber={stations.chamber.density} throat={stations.throat.density} exit={stations.exit.density} />
              <DataRow label="Mach Number" unit="" chamber={stations.chamber.mach} throat={stations.throat.mach} exit={stations.exit.mach} />
              <DataRow label="Velocity" unit="ft/s" chamber={stations.chamber.velocity} throat={stations.throat.velocity} exit={stations.exit.velocity} />
            </tbody>
          </table>
        </Tabs.Content>

        <Tabs.Content value="composition">
          <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#a0937f', marginBottom: 16 }}>Exit Composition (Mole Fractions)</h3>
          <div>
            {composition.map((sp, i) => {
              const maxMole = Math.max(...composition.map(s => s.mole_fraction));
              const pct = (sp.mole_fraction / maxMole) * 100;
              const colors = ['#c4500a', '#c4500aCC', '#1a5c9e', '#1a5c9eCC', '#2d7a3a', '#2d7a3aCC'];
              return (
                <div key={sp.name} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ width: 70, fontFamily: "'Fira Code', monospace", fontSize: 12, color: '#6b5d4d', textAlign: 'right', paddingRight: 12 }}>{sp.name}</span>
                  <div style={{ flex: 1, height: 24, background: '#faf8f5', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: colors[i % colors.length] }} />
                  </div>
                  <span style={{ width: 50, fontFamily: "'Fira Code', monospace", fontSize: 12, color: '#a0937f', paddingLeft: 10 }}>{sp.mole_fraction.toFixed(3)}</span>
                </div>
              );
            })}
          </div>
        </Tabs.Content>

        <Tabs.Content value="thermo">
          <div style={{ color: '#a0937f', fontSize: 13 }}>Thermodynamic detail view — available after full CEA implementation.</div>
        </Tabs.Content>

        <Tabs.Content value="transport">
          <div style={{ color: '#a0937f', fontSize: 13 }}>Transport property detail view — available after full CEA implementation.</div>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}

function Kpi({ label, value, unit, borderTopColor }: { label: string; value: number; unit: string; borderTopColor: string }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e0dcd5', borderRadius: 6, padding: 16, borderTop: `3px solid ${borderTopColor}` }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#a0937f', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: "'Fira Code', monospace", fontSize: 26, fontWeight: 700, color: '#2c2416' }}>
        {typeof value === 'number' ? value.toFixed(1) : value}
        {unit && <span style={{ fontSize: 13, fontWeight: 400, color: '#a0937f', marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  );
}

function DataRow({ label, unit, chamber, throat, exit }: { label: string; unit: string; chamber: number; throat: number; exit: number }) {
  const fmt = (v: number) => {
    if (Math.abs(v) < 0.001) return v.toExponential(2);
    if (Math.abs(v) < 1) return v.toFixed(5);
    if (Math.abs(v) < 100) return v.toFixed(3);
    return v.toFixed(1);
  };
  return (
    <tr style={{ transition: 'background 0.15s' }}>
      <td style={{ padding: '10px 16px', borderBottom: '1px solid #e0dcd5', fontFamily: "'Fira Sans', sans-serif", fontWeight: 500, color: '#2c2416', fontSize: 13 }}>{label}{unit && <span style={{ color: '#a0937f', fontWeight: 400 }}> ({unit})</span>}</td>
      <td style={{ padding: '10px 16px', borderBottom: '1px solid #e0dcd5', fontFamily: "'Fira Code', monospace", fontSize: 12, color: '#6b5d4d' }}>{fmt(chamber)}</td>
      <td style={{ padding: '10px 16px', borderBottom: '1px solid #e0dcd5', fontFamily: "'Fira Code', monospace", fontSize: 12, color: '#6b5d4d' }}>{fmt(throat)}</td>
      <td style={{ padding: '10px 16px', borderBottom: '1px solid #e0dcd5', fontFamily: "'Fira Code', monospace", fontSize: 12, color: '#6b5d4d' }}>{fmt(exit)}</td>
    </tr>
  );
}