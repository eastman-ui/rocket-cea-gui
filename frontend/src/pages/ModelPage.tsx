import { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
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
    throat_diameter?: number;
    exit_diameter?: number;
    L_star?: number;
  }) => void;
  loading?: boolean;
  stlUrl?: string;
  stepUrl?: string;
  scadUrl?: string;
}

function STLModel({ url }: { url: string }) {
  const [geometry, setGeometry] = useState<any>(null);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(url, (loadedGeometry) => {
      loadedGeometry.center();
      loadedGeometry.computeVertexNormals();
      setGeometry(loadedGeometry);
    });
  }, [url]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#00E5B2" metalness={0.7} roughness={0.3} />
    </mesh>
  );
}

export default function ModelPage({ result, onGenerate, loading, stlUrl, stepUrl, scadUrl }: Props) {
  const [nozzleType, setNozzleType] = useState<NozzleType>('conical');
  const [throatDiameter, setThroatDiameter] = useState(1.5);
  const [LStar, setLStar] = useState(60);
  const [chamberDiameter] = useState(3.0);
  const [chamberLength, setChamberLength] = useState(6.0);
  const [convergence_angle] = useState(45);

  // Calculate chamber dimensions from L* and throat diameter
  // L* = Vc / At, where Vc includes cylindrical chamber + convergent section
  useEffect(() => {
    if (throatDiameter > 0 && LStar > 0) {
      const R_c = chamberDiameter / 2;
      const R_t = Math.min(throatDiameter / 2, R_c); // Clamp throat radius to chamber radius
      const convergenceRad = (convergence_angle * Math.PI) / 180;

      // Convergent section length (axial) - only if chamber > throat
      const L_conv = R_c > R_t ? (R_c - R_t) / Math.tan(convergenceRad) : 0;

      // Convergent section volume (frustum of cone)
      const V_conv = L_conv > 0 ? (Math.PI * L_conv / 3) * (R_c * R_c + R_c * R_t + R_t * R_t) : 0;

      // Total chamber volume from L*
      const throatArea = Math.PI * R_t * R_t;
      const V_total = LStar * throatArea;

      // Cylindrical chamber volume = total - convergent
      const V_cyl = Math.max(V_total - V_conv, 0);

      // Chamber cross-sectional area
      const A_c = Math.PI * R_c * R_c;

      // Cylindrical chamber length
      const calculatedLength = V_cyl / A_c;
      console.log(`L* calc: throat=${throatDiameter}, L*=${LStar}, R_c=${R_c}, R_t=${R_t}, L_conv=${L_conv.toFixed(2)}, V_conv=${V_conv.toFixed(2)}, V_total=${V_total.toFixed(2)}, L_cyl=${calculatedLength.toFixed(2)}`);
      setChamberLength(Math.max(calculatedLength, 0.5));
    }
  }, [throatDiameter, LStar, chamberDiameter, convergence_angle]);

  // Calculate Ae/At from result
  const calculateAeAt = () => {
    if (!result) return null;
    const { mach, gamma } = result.stations.exit;
    if (mach <= 0) return 1.0;
    const term = (1 + 0.5 * (gamma - 1) * mach * mach);
    const exp = (gamma + 1) / (2 * (gamma - 1));
    return (1 / mach) * Math.pow(term, exp) * Math.pow((gamma + 1) / 2, -exp);
  };

  const AeAt = calculateAeAt();

  // Calculate throat area and exit diameter based on Ae/At
  const throatArea = throatDiameter > 0 ? Math.PI * Math.pow(throatDiameter / 2, 2) : 0;
  const exitArea = AeAt ? throatArea * AeAt : 0;
  const exitDiameter = exitArea > 0 ? 2 * Math.sqrt(exitArea / Math.PI) : 0;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = {
      nozzle_type: nozzleType,
      chamber_diameter: Number(fd.get('chamber_diameter')) || chamberDiameter,
      chamber_length: Number(fd.get('chamber_length')) || chamberLength,
      wall_thickness: Number(fd.get('wall_thickness')),
      convergence_angle: Number(fd.get('convergence_angle')),
      divergence_angle: nozzleType === 'conical' ? Number(fd.get('divergence_angle')) : undefined,
      throat_diameter: Number(fd.get('throat_diameter')) || throatDiameter,
      exit_diameter: exitDiameter,
      L_star: LStar,
    };
    console.log('Generating model with params:', params);
    onGenerate(params);
  };

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: 'uppercase',
        color: '#00E5B2',
        marginBottom: 20,
        paddingBottom: 8,
        borderBottom: '2px solid #00E5B2',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: "'Fira Code', monospace"
      }}>
        <span style={{ width: 6, height: 6, background: '#00E5B2', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 4px #00E5B2' }} />
        Nozzle Model
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 3D Viewer */}
        <div style={{
          background: '#0f1620',
          border: '1px solid #1e2a38',
          borderRadius: 6,
          padding: 20,
        }}>
          <div style={{
            background: '#0a0e14',
            border: '1px solid #1e2a38',
            borderRadius: 6,
            height: 340,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Blueprint grid overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(30,42,56,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(30,42,56,0.5) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              pointerEvents: 'none',
              zIndex: 10,
            }} />
            {stlUrl ? (
              <Suspense fallback={
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8899a6', fontSize: 12, fontFamily: "'Fira Code', monospace" }}>
                  Loading model...
                </div>
              }>
                <Canvas key={stlUrl} camera={{ position: [0, 0, 8], fov: 50 }}>
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[5, 5, 5]} intensity={1} />
                  <STLModel url={stlUrl} />
                  <OrbitControls autoRotate autoRotateSpeed={0.5} />
                </Canvas>
              </Suspense>
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#8899a6' }}>
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" stroke="#8899a6" style={{ opacity: 0.4, marginBottom: 12 }}>
                  <path d="M20 10h40v15c0 8-5 12-8 15s-5 10-5 15v15H33V55c0-5-2-12-5-15s-8-7-8-15V10z" strokeWidth="1.5" />
                </svg>
                <p style={{ fontSize: 12, fontFamily: "'Fira Code', monospace" }}>Generate model to preview</p>
              </div>
            )}
          </div>

          {/* Nozzle type selector */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              onClick={() => setNozzleType('conical')}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                border: '1px solid',
                borderColor: nozzleType === 'conical' ? '#00E5B2' : '#1e2a38',
                backgroundColor: nozzleType === 'conical' ? '#00E5B2' : '#0a0e14',
                color: nozzleType === 'conical' ? '#000' : '#8899a6',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Fira Code', monospace",
              }}
              onMouseEnter={(e) => {
                if (nozzleType !== 'conical') {
                  e.currentTarget.style.borderColor = '#00E5B2';
                  e.currentTarget.style.color = '#00E5B2';
                }
              }}
              onMouseLeave={(e) => {
                if (nozzleType !== 'conical') {
                  e.currentTarget.style.borderColor = '#1e2a38';
                  e.currentTarget.style.color = '#8899a6';
                }
              }}
            >
              Conical
            </button>
            <button
              onClick={() => setNozzleType('bell_rao')}
              style={{
                flex: 1,
                padding: '8px 16px',
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                border: '1px solid',
                borderColor: nozzleType === 'bell_rao' ? '#00E5B2' : '#1e2a38',
                backgroundColor: nozzleType === 'bell_rao' ? '#00E5B2' : '#0a0e14',
                color: nozzleType === 'bell_rao' ? '#000' : '#8899a6',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Fira Code', monospace",
              }}
              onMouseEnter={(e) => {
                if (nozzleType !== 'bell_rao') {
                  e.currentTarget.style.borderColor = '#00E5B2';
                  e.currentTarget.style.color = '#00E5B2';
                }
              }}
              onMouseLeave={(e) => {
                if (nozzleType !== 'bell_rao') {
                  e.currentTarget.style.borderColor = '#1e2a38';
                  e.currentTarget.style.color = '#8899a6';
                }
              }}
            >
              Bell (Rao)
            </button>
          </div>
        </div>

        {/* Parameters */}
        <div style={{
          background: '#0f1620',
          border: '1px solid #1e2a38',
          borderRadius: 6,
          padding: 20,
        }}>
          <h3 style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: '#8899a6',
            marginBottom: 16,
            fontFamily: "'Fira Code', monospace",
          }}>Nozzle Parameters</h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Ae/At Display - from CEA result */}
            {AeAt && (
              <div style={{
                background: '#0a0e14',
                border: '1px solid #1e2a38',
                borderRadius: 4,
                padding: 12,
              }}>
                <div style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: '#8899a6',
                  marginBottom: 4,
                  fontFamily: "'Fira Code', monospace",
                }}>Area Ratio (Ae/At)</div>
                <div style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 14,
                  color: '#00E5B2',
                }}>{AeAt.toFixed(4)}</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#8899a6', marginBottom: 6, fontFamily: "'Fira Code', monospace" }}>Throat Dia (in)</label>
                <input
                  type="text"
                  step="0.01"
                  name="throat_diameter"
                  value={throatDiameter}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '-') {
                      setThroatDiameter(0);
                      return;
                    }
                    if (val === '') {
                      setThroatDiameter(0);
                      return;
                    }
                    const num = Number(val);
                    if (!isNaN(num) && num > 0) setThroatDiameter(num);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#0a0e14',
                    border: '1px solid #1e2a38',
                    borderRadius: 4,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 12,
                    color: '#e0e0e0',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#00E5B2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#1e2a38'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#8899a6', marginBottom: 6, fontFamily: "'Fira Code', monospace" }}>L* (in)</label>
                <input
                  type="text"
                  step="1"
                  value={LStar}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || val === '-') return;
                    const num = Number(val);
                    if (!isNaN(num)) setLStar(num);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#0a0e14',
                    border: '1px solid #1e2a38',
                    borderRadius: 4,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 12,
                    color: '#e0e0e0',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#00E5B2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#1e2a38'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#8899a6', marginBottom: 6, fontFamily: "'Fira Code', monospace" }}>Chamber Dia (in)</label>
                <input
                  name="chamber_diameter"
                  defaultValue="3.00"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#0a0e14',
                    border: '1px solid #1e2a38',
                    borderRadius: 4,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 12,
                    color: '#e0e0e0',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#00E5B2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#1e2a38'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#8899a6', marginBottom: 6, fontFamily: "'Fira Code', monospace" }}>Chamber Length (in)</label>
                <input
                  type="text"
                  readOnly
                  value={chamberLength.toFixed(3)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#0a0e14',
                    border: '1px solid #1e2a38',
                    borderRadius: 4,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 12,
                    color: '#8899a6',
                    cursor: 'default',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#8899a6', marginBottom: 6, fontFamily: "'Fira Code', monospace" }}>Exit Dia (in)</label>
                <input
                  type="text"
                  readOnly
                  value={exitDiameter.toFixed(3)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#0a0e14',
                    border: '1px solid #1e2a38',
                    borderRadius: 4,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 12,
                    color: '#8899a6',
                    cursor: 'default',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#8899a6', marginBottom: 6, fontFamily: "'Fira Code', monospace" }}>Convergence Angle</label>
                <input
                  name="convergence_angle"
                  defaultValue="45"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#0a0e14',
                    border: '1px solid #1e2a38',
                    borderRadius: 4,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 12,
                    color: '#e0e0e0',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#00E5B2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#1e2a38'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#8899a6', marginBottom: 6, fontFamily: "'Fira Code', monospace" }}>Wall Thickness (in)</label>
                <input
                  name="wall_thickness"
                  defaultValue="0.125"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#0a0e14',
                    border: '1px solid #1e2a38',
                    borderRadius: 4,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 12,
                    color: '#e0e0e0',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#00E5B2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#1e2a38'}
                />
              </div>
            </div>

            {nozzleType === 'conical' && (
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#8899a6', marginBottom: 6, fontFamily: "'Fira Code', monospace" }}>Divergence Angle</label>
                <input
                  name="divergence_angle"
                  defaultValue="15"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#0a0e14',
                    border: '1px solid #1e2a38',
                    borderRadius: 4,
                    fontFamily: "'Fira Code', monospace",
                    fontSize: 12,
                    color: '#e0e0e0',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#00E5B2'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#1e2a38'}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: loading ? '#1e2a38' : '#00E5B2',
                color: loading ? '#8899a6' : '#000',
                border: 'none',
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 13,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.2s',
                fontFamily: "'Fira Code', monospace",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#00cc9a';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#00E5B2';
                }
              }}
            >
              {loading ? 'Generating…' : 'Generate Model'}
            </button>
          </form>

          {(stlUrl || stepUrl || scadUrl) && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: '#8899a6',
                marginBottom: 8,
                fontFamily: "'Fira Code', monospace",
              }}>Downloads</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stepUrl && (
                  <a
                    href={stepUrl}
                    style={{
                      padding: '8px 12px',
                      background: '#0a0e14',
                      border: '1px solid #1e2a38',
                      borderRadius: 4,
                      fontSize: 12,
                      color: '#8899a6',
                      textDecoration: 'none',
                      fontFamily: "'Fira Code', monospace",
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#00E5B2';
                      e.currentTarget.style.color = '#00E5B2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#1e2a38';
                      e.currentTarget.style.color = '#8899a6';
                    }}
                  >
                    Download STEP file
                  </a>
                )}
                {scadUrl && (
                  <a
                    href={scadUrl}
                    style={{
                      padding: '8px 12px',
                      background: '#0a0e14',
                      border: '1px solid #1e2a38',
                      borderRadius: 4,
                      fontSize: 12,
                      color: '#8899a6',
                      textDecoration: 'none',
                      fontFamily: "'Fira Code', monospace",
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#00E5B2';
                      e.currentTarget.style.color = '#00E5B2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#1e2a38';
                      e.currentTarget.style.color = '#8899a6';
                    }}
                  >
                    Download OpenSCAD (.scad)
                  </a>
                )}
                {stlUrl && (
                  <a
                    href={stlUrl}
                    style={{
                      padding: '8px 12px',
                      background: '#0a0e14',
                      border: '1px solid #1e2a38',
                      borderRadius: 4,
                      fontSize: 12,
                      color: '#8899a6',
                      textDecoration: 'none',
                      fontFamily: "'Fira Code', monospace",
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#00E5B2';
                      e.currentTarget.style.color = '#00E5B2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#1e2a38';
                      e.currentTarget.style.color = '#8899a6';
                    }}
                  >
                    Download STL preview
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}