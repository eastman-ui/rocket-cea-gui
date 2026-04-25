import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'CEA Input' },
  { to: '/results', label: 'Results' },
  { to: '/model', label: '3D Model' },
  { to: '/export', label: 'Export' },
];

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Fira Sans', sans-serif" }}>
      <nav
        className="flex items-center justify-between px-8 sticky top-0 z-50"
        style={{
          background: '#2c2416',
          color: '#f4f1eb',
          height: 52,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center font-bold text-sm"
            style={{
              width: 28,
              height: 28,
              border: '2px solid #c4500a',
              borderRadius: '50%',
              color: '#c4500a',
              fontFamily: "'Fira Code', monospace",
            }}
          >
            R
          </div>
          <span className="font-semibold" style={{ letterSpacing: '0.5px', fontSize: 15 }}>
            Rocket CEA
            <small style={{ color: '#a0937f', marginLeft: 4, fontWeight: 400, fontSize: 11 }}>v0.1</small>
          </span>
        </div>
        <div className="flex gap-0">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className="transition-colors"
              style={({ isActive }) => ({
                color: isActive ? '#f4f1eb' : '#a0937f',
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                padding: '16px 20px',
                borderBottom: isActive ? '2px solid #c4500a' : '2px solid transparent',
                textDecoration: 'none',
                fontFamily: "'Fira Sans', sans-serif",
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </div>
        <div style={{ color: '#a0937f', fontSize: 11, letterSpacing: 1, fontFamily: "'Fira Code', monospace" }}>
          localhost:8000
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}