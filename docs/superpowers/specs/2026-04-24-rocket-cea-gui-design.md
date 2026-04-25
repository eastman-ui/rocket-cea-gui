# Rocket CEA GUI — Design Specification

## Overview

A local web application that provides an intuitive GUI for NASA CEA (Chemical Equilibrium with Applications) rocket propulsion calculations, generates 3D CAD models of rocket chambers/nozzles from CEA outputs, and exports RocketPy-compatible flight simulation configurations.

**Target user:** Public-facing product for rocket engineers, students, and hobbyists.

**Deployment:** Local web app — `pip install rocket-cea-gui` → `rocket-cea-gui serve` → opens browser.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│  Browser (React SPA)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ CEA Input │ │ 3D View  │ │ RocketPy     │ │
│  │ Form      │ │ (Three.js│ │ Export Panel │ │
│  │           │ │  + STL)  │ │              │ │
│  └─────┬─────┘ └────┬─────┘ └──────┬───────┘ │
│        │             │              │          │
│        └──────┬──────┘──────────────┘          │
│               │ REST API                       │
└───────────────┼───────────────────────────────┘
                │
┌───────────────┼───────────────────────────────┐
│  FastAPI Server (localhost:8000)                │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ /api/cea   │ │ /api/cad   │ │ /api/export │  │
│  │ (run CEA   │ │ (generate  │ │ (RocketPy  │  │
│  │  solver)   │ │  3D models)│ │  JSON/py)  │  │
│  └─────┬──────┘ └─────┬──────┘ └──────┬─────┘  │
│        │              │               │         │
│  ┌─────┴──────┐ ┌─────┴──────┐ ┌──────┴────┐  │
│  │ cea (NASA) │ │ CadQuery + │ │ Jinja2    │  │
│  │ Python pkg │ │ OpenSCAD   │ │ templates  │  │
│  └────────────┘ └────────────┘ └───────────┘  │
└────────────────────────────────────────────────┘
```

### Key decisions

- Single `pip install rocket-cea-gui` installs everything
- `rocket-cea-gui serve` starts FastAPI on localhost:8000, opens browser
- CEA calculations are synchronous (fast, <1s)
- 3D model generation uses CadQuery for STEP, OpenSCAD CLI for .scad
- Three.js in browser renders STL previews of generated models
- RocketPy is export-only — no in-app simulation
- CEA results are stored in-memory with UUID keys; cleared on server restart. No persistent storage.

---

## Data Flow & Screens

### Screen 1: CEA Input Form

- Select problem type (rocket, hp, tp, etc.)
- Add reactants (fuel/oxidizer pairs) with species picker from thermo database
- Set chamber pressure, O/F ratio, expansion ratios
- Choose equilibrium vs frozen flow, IAC vs FAC
- Click "Run CEA" → POST `/api/cea/run` → returns structured JSON

### Screen 2: Results Dashboard

- Tabbed view: Performance | Thermodynamics | Composition | Transport
- Performance table: chamber/throat/exit conditions
- Key metrics highlighted: Isp, Cstar, CF, T_chamber, P_exit
- Mole fraction charts (bar chart by species)

### Screen 3: 3D Model Generator

- Nozzle type selector: conical / bell (Rao)
- Parameters auto-populated from CEA results (Ae/At, throat area, expansion ratio)
- Additional inputs: chamber length, chamber diameter, wall thickness, convergence angle
- "Generate" → POST `/api/cad/generate` → returns STL for preview + download links for STEP/OpenSCAD
- Three.js viewport shows interactive 3D preview

### Screen 4: RocketPy Export

- Auto-populated fields from CEA results: Isp, chamber pressure, throat area, exit area, propellant masses
- Manual fields: dry mass, rocket diameter, CD, fin geometry, launch site coords
- Export formats: Python script, JSON config, Jupyter notebook
- One-click download, no in-app simulation

### Data Model

```
CEARun → { problem_type, reactants, conditions }
CEAResult → { performance: {Isp, Cstar, CF, ...}, stations: [{T, P, rho, M, ...}], composition: [...] }
CADParams → { nozzle_type, chamber_diam, chamber_length, wall_thickness, ... }
CADModel → { stl_url, step_download_url, openscad_download_url, parameters_used }
RocketPyExport → { motor_config, rocket_config, environment_config }
```

---

## 3D Model Generation

### CadQuery for STEP files

CadQuery is a Python parametric CAD library. It creates solid geometry from parametric sketches, then exports STEP/IGES.

### Nozzle Geometry

**Conical nozzle:**
- Straight convergent section (chamber → throat) at user-specified convergence half-angle (default 45°)
- Straight divergent section (throat → exit) at user-specified divergence half-angle (default 15°)
- Circular throat with radius from CEA throat area
- Chamber cylinder with user-specified length and diameter

**Bell nozzle (Rao method):**
- Parabolic approximation of Rao's optimum contour
- Input: throat radius, exit radius, throat-to-throat-wall radius ratio, initial expansion angle, exit angle
- Auto-calculated from CEA area ratios when available
- Chamber same as conical

### Wall Generation

- Outer wall offset from inner contour by `wall_thickness` parameter
- Closed at both ends (injector face and nozzle exit lip)

### OpenSCAD Generation

- Export same parameters as OpenSCAD script
- Parameters at top of file as variables — user can tweak in OpenSCAD directly
- Uses `rotate_extrude()` on 2D profile cross-section

### API Endpoints

```
POST /api/cad/generate
  body: { cea_result_id, nozzle_type, chamber_diam, chamber_length, wall_thickness, ... }
  response: { stl_preview_url, step_download_url, openscad_download_url, parameters }
```

### Preview Pipeline

1. CadQuery generates geometry → exports STL (for preview)
2. CadQuery exports STEP (for download)
3. Generate OpenSCAD script as string
4. Frontend loads STL into Three.js viewer
5. Download links for STEP and .scad

---

## RocketPy Export

Export-only — no in-app simulation, just generate files users can run locally.

### Auto-populated from CEA Results

| CEA Output | RocketPy Field | Mapping |
|---|---|---|
| Isp | `SolidMotor.burn_time` / impulse calc | Isp + propellant mass → burn duration |
| Chamber pressure | `SolidMotor.chamber_pressure` | Direct |
| Throat area | `SolidMotor.throat_area` | Direct |
| Exit area | `SolidMotor.exit_area` | Direct |
| Cstar | `SolidMotor.cstar` | Direct |
| Grain density | `SolidMotor.grain_density` | From propellant data |
| Propellant mass | `SolidMotor.propellant_initial_mass` | User-specified or calculated |

Note: CEA models both liquid and solid propulsion. The export defaults to RocketPy's `SolidMotor` class since RocketPy is oriented toward solid motors. For liquid engines, the export maps to `HybridMotor` or `LiquidMotor` (if available in user's RocketPy version), with a clear warning about compatibility.

### Manual User Inputs (GUI form)

| Category | Fields |
|---|---|
| Rocket | dry mass, diameter, length, CD coefficient |
| Aero | fin count, fin span, fin root chord, fin tip chord, fin sweep |
| Environment | latitude, longitude, elevation, date, wind model |
| Recovery | parachute Cd, parachute diameter, deploy altitude |

### Export Formats

1. **Python script** — standalone `.py` file with all imports, object construction, and `Flight.simulate()` call
2. **JSON config** — structured JSON with all parameters, for programmatic use
3. **Jupyter notebook** — `.ipynb` with explanatory markdown cells + code cells

### API Endpoint

```
POST /api/export/rocketpy
  body: { cea_result_id, manual_params, format }
  response: { download_url, filename }
```

---

## Tech Stack

### Backend (Python)

- **FastAPI** — async server, auto-generated API docs, WebSocket support for progress
- **cea** (NASA) — CEA calculations
- **CadQuery** — parametric 3D model generation, STEP export
- **numpy** — CadQuery dependency, numerical operations
- **Openscad** (CLI) — .scad script generation, STL rendering for preview
- **Jinja2** — template engine for Python/JSON/notebook exports

### Frontend (React + TypeScript)

- **Vite** — build tool, HMR during development
- **React 18** — UI framework
- **Three.js / React Three Fiber** — 3D model preview
- **Recharts** — charts for composition/performance data
- **Radix UI + Tailwind** — component library + styling
- **React Hook Form + Zod** — form validation

### Packaging & Distribution

- Single pip package: `rocket-cea-gui`
- `pip install rocket-cea-gui` installs Python deps + bundled React build
- `rocket-cea-gui serve` starts server, opens browser
- Prerequisites: Python 3.10+, OpenSCAD CLI (for .scad → STL)
- Optional: CQ-editor for CadQuery debugging

---

## Project Structure

```
rocket-cea-gui/
├── pyproject.toml
├── src/
│   └── rocket_cea_gui/
│       ├── __init__.py
│       ├── server.py          # FastAPI app
│       ├── api/
│       │   ├── cea.py         # /api/cea endpoints
│       │   ├── cad.py         # /api/cad endpoints
│       │   └── export.py      # /api/export endpoints
│       ├── services/
│       │   ├── cea_solver.py   # CEA calculation service
│       │   ├── cad_generator.py # CadQuery/OpenSCAD generation
│       │   └── rocketpy_export.py # RocketPy export builder
│       ├── templates/          # Jinja2 templates for exports
│       └── static/             # Bundled React SPA
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── CEAInputForm.tsx
│   │   │   ├── ResultsDashboard.tsx
│   │   │   ├── ModelViewer.tsx
│   │   │   └── RocketPyExport.tsx
│   │   ├── api/
│   │   │   └── client.ts
│   │   └── App.tsx
│   └── vite.config.ts
├── wiki/                       # CEA wiki content
└── docs/
    └── superpowers/
        └── specs/
```

---

## CEA Integration Details

### NASA cea Python Package

- Install: `pip install cea`
- Initialize: `cea.init()` (auto-discovers thermo.lib, trans.lib)
- Rocket solver: `cea.RocketSolver(products, reactants=reactants)`
- Rocket solution: `cea.RocketSolution(rocket_solver)`
- Key outputs: `solution.T[]`, `solution.P[]`, `solution.Isp`, `solution.c_star`, `solution.CF`, mole/mass fractions

### Input Parameter Mapping (GUI → CEA)

| GUI Field | CEA Parameter | Example |
|---|---|---|
| Problem type | `cea.Rocket` or `cea.HP` etc. | rocket |
| Fuel species | `cea.Mixture.species` | H2 |
| Oxidizer species | `cea.Mixture.species` | O2 |
| Chamber pressure | `solver.solve(pc=...)` | 68.046 bar |
| O/F ratio | `weights` | 6.0 |
| Area ratio | `solver.solve(supar=[40.0])` | 40.0 |
| Flow model | equilibrium/frozen flag | equilibrium |

### CEA Database

- Over 2000 species in `thermo.lib`
- Species picker in GUI: searchable dropdown with type-ahead, grouped by category (elements, oxides, hydrocarbons, inorganics, ions)
- Recent/favorite species cached per user session