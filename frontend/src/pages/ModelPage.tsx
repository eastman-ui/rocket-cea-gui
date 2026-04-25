import { useState } from 'react';
import type { CEAResult, NozzleType } from '../types/api';

interface Props {
  result: CEAResult | null;
  onGenerate: (params: {
    nozzle_type: NozzleType;
    chamber_diameter: number;
    chamber_length: number;
    wall_thickness: number;
    convergence_angle: number;
    divergence_angle?: number;
  }) => void;
  loading?: boolean;
  stlUrl?: string;
}

export default function ModelPage({ result, onGenerate, loading, stlUrl }: Props) {
  const [nozzleType, setNozzleType] = useState<NozzleType>('conical');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onGenerate({
      nozzle_type: nozzleType,
      chamber_diameter: Number(fd.get('chamber_diameter')),
      chamber_length: Number(fd.get('chamber_length')),
      wall_thickness: Number(fd.get('wall_thickness')),
      convergence_angle: Number(fd.get('convergence_angle')),
      divergence_angle: nozzleType === 'conical' ? Number(fd.get('divergence_angle')) : undefined,
    });
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <h2 className="text-[11px] font-bold tracking-[2px] uppercase text-accent mb-5 pb-2 border-b-2 border-accent flex items-center gap-2">
        <span className="w-2 h-2 bg-accent inline-block" />
        Nozzle Model
      </h2>

      <div className="grid grid-cols-2 gap-6">
        {/* 3D Viewer */}
        <div className="bg-white border border-border-light rounded-md p-5">
          <div className="bg-paper border border-border-light rounded h-[340px] flex items-center justify-center relative overflow-hidden">
            {/* Blueprint grid overlay */}
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(180,170,155,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(180,170,155,0.08) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }} />
            <div className="relative z-10 text-center">
              {stlUrl ? (
                <div className="text-ink-light text-[13px]">3D model loaded — Three.js viewer placeholder</div>
              ) : (
                <>
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="currentColor" className="text-muted mx-auto mb-3 opacity-40">
                    <path d="M20 10h40v15c0 8-5 12-8 15s-5 10-5 15v15H33V55c0-5-2-12-5-15s-8-7-8-15V10z" strokeWidth="1.5" />
                  </svg>
                  <p className="text-muted text-[12px]">Generate model to preview</p>
                </>
              )}
            </div>
          </div>

          {/* Nozzle type selector */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setNozzleType('conical')}
              className={`flex-1 py-2 px-4 rounded text-[12px] font-medium border transition-colors cursor-pointer ${
                nozzleType === 'conical'
                  ? 'bg-accent text-white border-accent'
                  : 'bg-paper text-ink-light border-border hover:border-accent hover:text-accent'
              }`}
            >
              Conical
            </button>
            <button
              onClick={() => setNozzleType('bell_rao')}
              className={`flex-1 py-2 px-4 rounded text-[12px] font-medium border transition-colors cursor-pointer ${
                nozzleType === 'bell_rao'
                  ? 'bg-accent text-white border-accent'
                  : 'bg-paper text-ink-light border-border hover:border-accent hover:text-accent'
              }`}
            >
              Bell (Rao)
            </button>
          </div>
        </div>

        {/* Parameters */}
        <div className="bg-white border border-border-light rounded-md p-5">
          <h3 className="text-[11px] font-semibold tracking-[1.5px] uppercase text-muted mb-4">Nozzle Parameters</h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-ink-light mb-1">Throat Dia (in)</label>
                <input name="throat_diameter" defaultValue={result ? '1.50' : ''} className="w-full p-2 bg-white border border-border rounded-md font-mono text-[12px] outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-light mb-1">Exit Dia (in)</label>
                <input name="exit_diameter" defaultValue={result ? '9.49' : ''} className="w-full p-2 bg-white border border-border rounded-md font-mono text-[12px] outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-light mb-1">Chamber Dia (in)</label>
                <input name="chamber_diameter" defaultValue="3.00" className="w-full p-2 bg-white border border-border rounded-md font-mono text-[12px] outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-light mb-1">Chamber Length (in)</label>
                <input name="chamber_length" defaultValue="6.00" className="w-full p-2 bg-white border border-border rounded-md font-mono text-[12px] outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-light mb-1">Convergence Angle</label>
                <input name="convergence_angle" defaultValue="45" className="w-full p-2 bg-white border border-border rounded-md font-mono text-[12px] outline-none focus:border-accent" />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-ink-light mb-1">Wall Thickness (in)</label>
                <input name="wall_thickness" defaultValue="0.125" className="w-full p-2 bg-white border border-border rounded-md font-mono text-[12px] outline-none focus:border-accent" />
              </div>
            </div>

            {nozzleType === 'conical' && (
              <div>
                <label className="block text-[12px] font-medium text-ink-light mb-1">Divergence Angle</label>
                <input name="divergence_angle" defaultValue="15" className="w-full p-2 bg-white border border-border rounded-md font-mono text-[12px] outline-none focus:border-accent" />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent text-white rounded-md font-semibold text-[13px] mt-2 hover:bg-accent-hover transition-all hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Generating…' : 'Generate Model'}
            </button>
          </form>

          {stlUrl && (
            <div className="mt-4 space-y-2">
              <h3 className="text-[11px] font-semibold tracking-[1.5px] uppercase text-muted">Downloads</h3>
              <a href={stlUrl} className="block py-2 px-3 bg-paper border border-border rounded text-[12px] text-ink-light hover:border-accent hover:text-accent transition-colors">
                Download STEP file
              </a>
              <a href={stlUrl} className="block py-2 px-3 bg-paper border border-border rounded text-[12px] text-ink-light hover:border-accent hover:text-accent transition-colors">
                Download OpenSCAD (.scad)
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}