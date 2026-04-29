import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/engineering', label: 'Engineering' },
  { to: '/model', label: '3D Model' },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Fira Sans', sans-serif", background: '#0a0e14' }}>
      <nav
        className="flex items-center justify-between px-8 sticky top-0 z-50"
        style={{
          background: '#0f1620',
          borderBottom: '1px solid #1e2a38',
          color: '#e0e0e0',
          height: 52,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center font-bold text-sm"
            style={{
              width: 24,
              height: 24,
              background: '#00E5B2',
              borderRadius: 4,
              color: '#000',
              fontFamily: "'Fira Code', monospace",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            R
          </div>
          <span className="font-semibold" style={{ letterSpacing: '2px', fontSize: 14, textTransform: 'uppercase', fontFamily: "'Fira Code', monospace" }}>
            Rocket CEA
            <small style={{ color: '#4a5560', marginLeft: 8, fontWeight: 400, fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px' }}>v2.4.1</small>
          </span>
        </div>
        <div className="flex gap-0">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className="transition-colors"
              style={({ isActive }) => ({
                color: isActive ? '#00E5B2' : '#8899a6',
                fontSize: 10,
                fontWeight: 600,
                padding: '16px 20px',
                borderBottom: isActive ? '2px solid #00E5B2' : '2px solid transparent',
                textDecoration: 'none',
                fontFamily: "'Fira Code', monospace",
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, background: '#00ff88', borderRadius: '50%', boxShadow: '0 0 6px #00ff88' }}></span>
            <span style={{ color: '#8899a6', fontSize: 9, letterSpacing: '0.5px', fontFamily: "'Fira Code', monospace", textTransform: 'uppercase' }}>Ready</span>
          </div>
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}