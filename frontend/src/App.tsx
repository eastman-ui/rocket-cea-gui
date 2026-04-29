import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ModelPage from './pages/ModelPage';
import EngineeringPage from './pages/EngineeringPage';
import type { CEAResult, CEARunRequest, NozzleType } from './types/api';
import { cea, cad } from './api/client';

const queryClient = new QueryClient();

function AppRoutes() {
  const [result, setResult] = useState<CEAResult | null>(null);
  const [sweepResults, setSweepResults] = useState<CEAResult[] | undefined>();
  const [sweepXKey, setSweepXKey] = useState<'of_ratio' | 'pressure'>('of_ratio');
  const [sweepXLabel, setSweepXLabel] = useState<string>('O/F Ratio');
  const [loading, setLoading] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | undefined>();
  const [stepUrl, setStepUrl] = useState<string | undefined>();
  const [scadUrl, setScadUrl] = useState<string | undefined>();

  const hasSweep = (data: CEARunRequest) => {
    const hasOfSweep = data.sweep_of_start && data.sweep_of_end &&
                       data.sweep_of_steps && data.sweep_of_steps > 1 &&
                       data.sweep_of_start !== data.sweep_of_end;
    const hasPressureSweep = data.sweep_pressure_start && data.sweep_pressure_end &&
                             data.sweep_pressure_steps && data.sweep_pressure_steps > 1 &&
                             data.sweep_pressure_start !== data.sweep_pressure_end;
    return hasOfSweep || hasPressureSweep;
  };

  const is2DSweep = (data: CEARunRequest) => {
    const hasOfSweep = data.sweep_of_start && data.sweep_of_end &&
                       data.sweep_of_steps && data.sweep_of_steps > 1 &&
                       data.sweep_of_start !== data.sweep_of_end;
    const hasPressureSweep = data.sweep_pressure_start && data.sweep_pressure_end &&
                             data.sweep_pressure_steps && data.sweep_pressure_steps > 1 &&
                             data.sweep_pressure_start !== data.sweep_pressure_end;
    return hasOfSweep && hasPressureSweep;
  };

  const handleRunCEA = async (data: CEARunRequest) => {
    setLoading(true);
    try {
      if (hasSweep(data)) {
        const results = await cea.runSweep(data);
        setSweepResults(results);
        if (is2DSweep(data)) {
          setSweepXKey('of_ratio');
          setSweepXLabel(`2D Sweep: O/F ${data.sweep_of_start?.toFixed(2)}-${data.sweep_of_end?.toFixed(2)} × Pc ${data.sweep_pressure_start}-${data.sweep_pressure_end} ${data.pressure_unit}`);
        } else if (data.sweep_of_start && data.sweep_of_end) {
          setSweepXKey('of_ratio');
          setSweepXLabel(`O/F Ratio (${data.sweep_of_start.toFixed(2)} to ${data.sweep_of_end.toFixed(2)})`);
        } else if (data.sweep_pressure_start && data.sweep_pressure_end) {
          setSweepXKey('pressure');
          setSweepXLabel(`Chamber Pressure (${data.sweep_pressure_start} to ${data.sweep_pressure_end} ${data.pressure_unit})`);
        }
        setResult(results[0]);
      } else {
        const singleValueData = { ...data };
        if (data.sweep_of_start && data.sweep_of_start > 0) {
          singleValueData.reactants = data.reactants.map((r, i) =>
            i === 0 ? { ...r, weight: data.sweep_of_start!, temperature: r.temperature, temperature_unit: r.temperature_unit } : r
          );
        }
        if (data.sweep_pressure_start && data.sweep_pressure_start > 0) {
          singleValueData.chamber_pressure = data.sweep_pressure_start;
        }
        const res = await cea.run(singleValueData);
        setResult(res);
        setSweepResults(undefined);
      }
    } catch (err) {
      console.error('CEA run failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateModel = async (params: {
    nozzle_type: NozzleType;
    chamber_diameter: number;
    chamber_length: number;
    wall_thickness: number;
    convergence_angle: number;
    divergence_angle?: number;
    throat_diameter?: number;
    exit_diameter?: number;
  }) => {
    if (!result) return;
    setLoading(true);
    try {
      const res = await cad.generate({
        cea_result_id: result.id,
        nozzle_type: params.nozzle_type,
        chamber_diameter: params.chamber_diameter,
        chamber_length: params.chamber_length,
        wall_thickness: params.wall_thickness,
        convergence_angle: params.convergence_angle,
        divergence_angle: params.divergence_angle,
        throat_diameter: params.throat_diameter,
        exit_diameter: params.exit_diameter,
      });
      setStlUrl(res.stl_preview_url || undefined);
      setStepUrl(res.step_download_url || undefined);
      setScadUrl(res.openscad_download_url || undefined);
    } catch (err) {
      console.error('CAD generation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage onSubmit={handleRunCEA} loading={loading} result={result} sweepResults={sweepResults} sweepXKey={sweepXKey} sweepXLabel={sweepXLabel} />} />
        <Route path="engineering" element={<EngineeringPage result={result} />} />
        <Route path="model" element={<ModelPage result={result} onGenerate={handleGenerateModel} loading={loading} stlUrl={stlUrl} stepUrl={stepUrl} scadUrl={scadUrl} />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}