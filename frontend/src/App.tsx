import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import Layout from './components/Layout';
import CEAInputPage from './pages/CEAInputPage';
import ResultsPage from './pages/ResultsPage';
import ModelPage from './pages/ModelPage';
import ExportPage from './pages/ExportPage';
import type { CEAResult, CEARunRequest, NozzleType, ExportFormat } from './types/api';
import { cea } from './api/client';

const queryClient = new QueryClient();

export default function App() {
  const [result, setResult] = useState<CEAResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [stlUrl] = useState<string | undefined>();
  const [exportLoading, setExportLoading] = useState(false);

  const handleRunCEA = async (data: CEARunRequest) => {
    setLoading(true);
    try {
      const res = await cea.run(data);
      setResult(res);
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
  }) => {
    if (!result) return;
    setLoading(true);
    try {
      console.log('Generate model:', { cea_result_id: result.id, ...params });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: ExportFormat, manualParams: Record<string, number | undefined>) => {
    if (!result) return;
    setExportLoading(true);
    try {
      console.log('Export:', { cea_result_id: result.id, format, ...manualParams });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<CEAInputPage onSubmit={handleRunCEA} loading={loading} />} />
            <Route path="results" element={<ResultsPage result={result} />} />
            <Route path="model" element={<ModelPage result={result} onGenerate={handleGenerateModel} loading={loading} stlUrl={stlUrl} />} />
            <Route path="export" element={<ExportPage result={result} onExport={handleExport} loading={exportLoading} />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}