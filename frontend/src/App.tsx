import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import Layout from './components/Layout';
import CEAInputPage from './pages/CEAInputPage';
import ResultsPage from './pages/ResultsPage';
import ModelPage from './pages/ModelPage';
import ExportPage from './pages/ExportPage';
import type { CEAResult, CEARunRequest, NozzleType, ExportFormat } from './types/api';
import { cea, cad, exportApi } from './api/client';

const queryClient = new QueryClient();

function AppRoutes() {
  const navigate = useNavigate();
  const [result, setResult] = useState<CEAResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | undefined>();
  const [stepUrl, setStepUrl] = useState<string | undefined>();
  const [scadUrl, setScadUrl] = useState<string | undefined>();
  const [exportLoading, setExportLoading] = useState(false);

  const handleRunCEA = async (data: CEARunRequest) => {
    setLoading(true);
    try {
      const res = await cea.run(data);
      setResult(res);
      navigate('/results');
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

  const handleExport = async (format: ExportFormat, manualParams: Record<string, number | undefined>) => {
    if (!result) return;
    setExportLoading(true);
    try {
      await exportApi.rocketpy({
        cea_result_id: result.id,
        format,
        ...manualParams,
      });
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CEAInputPage onSubmit={handleRunCEA} loading={loading} />} />
        <Route path="results" element={<ResultsPage result={result} />} />
        <Route path="model" element={<ModelPage result={result} onGenerate={handleGenerateModel} loading={loading} stlUrl={stlUrl} stepUrl={stepUrl} scadUrl={scadUrl} />} />
        <Route path="export" element={<ExportPage result={result} onExport={handleExport} loading={exportLoading} />} />
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