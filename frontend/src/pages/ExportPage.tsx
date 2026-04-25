import { useState } from 'react';
import type { CEAResult, ExportFormat } from '../types/api';

interface Props {
  result: CEAResult | null;
  onExport: (format: ExportFormat, manualParams: Record<string, number | undefined>) => void;
  loading?: boolean;
}

export default function ExportPage({ result, onExport, loading }: Props) {
  const [format, setFormat] = useState<ExportFormat>('python');

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-52px)] text-muted text-[14px]">
        Run a CEA calculation first to configure the export.
      </div>
    );
  }

  const { performance } = result;

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <h2 className="text-[11px] font-bold tracking-[2px] uppercase text-accent mb-5 pb-2 border-b-2 border-accent flex items-center gap-2">
        <span className="w-2 h-2 bg-accent inline-block" />
        RocketPy Export
      </h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Auto-populated */}
        <div className="bg-white border border-border-light rounded-md p-5">
          <h3 className="text-[11px] font-semibold tracking-[1.5px] uppercase text-accent mb-4">Auto-populated from CEA</h3>
          <div className="bg-paper border border-border-light rounded p-3.5 space-y-1.5 font-mono text-[12px]">
            <div className="flex justify-between">
              <span className="text-ink-light">Isp (vac)</span>
              <span className="text-accent font-semibold">{performance.isp_vac.toFixed(1)} s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-light">C*</span>
              <span className="text-accent font-semibold">{performance.c_star.toFixed(0)} ft/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-light">Throat Area</span>
              <span className="text-ink">1.767 in²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-light">Exit Area</span>
              <span className="text-ink">70.69 in²</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-light">Cf</span>
              <span className="text-ink">{performance.cf.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Manual inputs */}
        <div className="bg-white border border-border-light rounded-md p-5">
          <h3 className="text-[11px] font-semibold tracking-[1.5px] uppercase text-muted mb-4">Manual Inputs</h3>
          <form
            onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              onExport(format, {
                dry_mass: fd.get('dry_mass') ? Number(fd.get('dry_mass')) : undefined,
                rocket_diameter: fd.get('rocket_diameter') ? Number(fd.get('rocket_diameter')) : undefined,
                cd: fd.get('cd') ? Number(fd.get('cd')) : undefined,
                fin_count: fd.get('fin_count') ? Number(fd.get('fin_count')) : undefined,
                fin_span: fd.get('fin_span') ? Number(fd.get('fin_span')) : undefined,
              });
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-ink-light mb-1">Dry Mass (kg)</label>
                <input name="dry_mass" placeholder="e.g. 5.0" className="w-full p-2 bg-white border border-border rounded-md font-mono text-[12px] outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-light mb-1">Rocket Dia (mm)</label>
                <input name="rocket_diameter" placeholder="e.g. 54" className="w-full p-2 bg-white border border-border rounded-md font-mono text-[12px] outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-light mb-1">Cd</label>
                <input name="cd" placeholder="e.g. 0.5" className="w-full p-2 bg-white border border-border rounded-md font-mono text-[12px] outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-light mb-1">Fin Count</label>
                <input name="fin_count" placeholder="e.g. 3" className="w-full p-2 bg-white border border-border rounded-md font-mono text-[12px] outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-light mb-1">Fin Span (mm)</label>
                <input name="fin_span" placeholder="e.g. 50" className="w-full p-2 bg-white border border-border rounded-md font-mono text-[12px] outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-light mb-1">Fin Root Chord (mm)</label>
                <input name="fin_root_chord" placeholder="e.g. 120" className="w-full p-2 bg-white border border-border rounded-md font-mono text-[12px] outline-none focus:border-accent" />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-semibold tracking-[1.5px] uppercase text-muted mb-2">Export Format</label>
              <div className="grid grid-cols-3 gap-2">
                {(['python', 'json', 'notebook'] as ExportFormat[]).map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={`py-2 px-3 rounded text-[12px] font-medium border transition-colors cursor-pointer ${
                      format === f
                        ? 'bg-accent text-white border-accent'
                        : 'bg-paper text-ink-light border-border hover:border-accent hover:text-accent'
                    }`}
                  >
                    {f === 'python' ? '.py' : f === 'json' ? '.json' : '.ipynb'}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent text-white rounded-md font-semibold text-[14px] mt-4 hover:bg-accent-hover transition-all hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
              {loading ? 'Exporting…' : 'Export RocketPy Config'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}