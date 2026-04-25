# NASA CEA — Usage & Programming Guide

## What Is CEA?

NASA CEA (Chemical Equilibrium with Applications) computes chemical equilibrium compositions of complex mixtures via Gibbs free-energy minimization. It then derives thermodynamic and transport properties from the resulting product concentrations.

Originally developed at NASA Glenn Research Center (Cleveland, Ohio), CEA has evolved through several generations: CEC (1971) → CET (1984) → CEA (1994) → CEA2 (2002) → current open-source v3.1.2 (released 2026-03-23). Over 2,000 copies have been distributed across the aerodynamics and thermodynamics community.

**License:** Apache-2.0

**Contact:** Mark Leader (mark.leader@nasa.gov), NASA Glenn Research Center

**Key references:**
- Gordon & McBride, NASA RP-1311 Part I (Analysis, 1994) and Part II (User's Manual, 1996)
- McBride, Zehe & Gordon, NASA TP-2002-211556 (Thermodynamic coefficients, 2002)

---

## Problem Types

| Keyword | Problem Type | Description |
|---|---|---|
| `tp` | Assigned Temperature & Pressure | Equilibrium at given T and P |
| `hp` | Assigned Enthalpy & Pressure | Combustion at constant P (adiabatic flame temp) |
| `sp` | Assigned Entropy & Pressure | Isentropic process at given S and P |
| `tv` | Assigned Temperature & Volume | Equilibrium at given T and specific volume |
| `uv` | Assigned Internal Energy & Volume | Constant-volume combustion |
| `sv` | Assigned Entropy & Volume | Isentropic process at given S and V |
| `rocket` | Rocket Performance | Nozzle flow from chamber through throat to exit |
| `det` | Chapman-Jouguet Detonation | Detonation wave calculations |
| `shock` | Shock Tube | Incident and reflected shock parameters |

---

## Installation

### Python Installation (Recommended)

```bash
pip install cea
```

This installs pre-built wheels with Cython bindings. The `cea` package auto-discovers `thermo.lib` and `trans.lib` databases.

### Build from Source

**Requirements:** CMake v3.19+ and a Fortran compiler (gfortran or Intel ifort/ifx).

```bash
cd cea
mkdir build && cd build
cmake -DCMAKE_INSTALL_PREFIX=<install_dir> -DCEA_BUILD_TESTING=OFF ..
cmake --build .
cmake --install .
```

Add to PATH:
```bash
export PATH="<install_dir>/bin:$PATH"
```

### CMake Presets

| Preset | Description |
|---|---|
| `core` | Minimal Fortran-only (no C/Python/Matlab bindings) |
| `core-c` | Fortran + C only |
| `dev` | Full development build with gfortran (Debug, all bindings) |
| `dev-intel` | Full development with Intel ifort |
| `dev-ub-hunt` | Aggressive debug/UB sanitization with gfortran |

### Database Lookup Order

- **CLI/C/Fortran:** Current directory → `CEA_DATA_DIR` env var → `./data` → `<install_dir>/data`
- **Python:** Current directory → `CEA_DATA_DIR` env var → Packaged `cea/data` → Repo `data/`

---

## Input File Format

Input files use the suffix `.inp`. The format is free-form (modernized from original CEA2 format). Input is organized into datasets, each starting with a keyword:

| Keyword | Purpose |
|---|---|
| `reac` | Reactant names, amounts, temperatures, enthalpies, exploded formulas |
| `prob` | Problem type and associated parameters |
| `outp` | Output options (calories, short, debug, massf, plot, trace, tran) |
| `only` | Restrict products to listed species |
| `omit` | Omit listed product species |
| `inse` | Insert condensed species for initial iterations |
| `end` | End of problem |

### Example — Rocket Problem (LOX/LH2)

```
reac
  fuel H2(L)  H 2
    h,cal=-2154.0      t(k)=20.27       wt%=100.
  oxid O2(L)  O 2
    h,cal=-3102.      t(k)=90.18       wt%=100.
prob case=LOX_/_LH2
  rocket equilibrium  p,psia=1000.000000, supar=40.000000,
  o/f=6.000000
outp   calories short
end
```

### Reactant Specification Keywords

| Keyword | Description |
|---|---|
| `fuel` / `fu` | Fuel designation |
| `oxid` / `ox` | Oxidant designation |
| `name` / `na` | Generic name |

### Reactant Properties

| Property | Syntax | Units Available |
|---|---|---|
| Amount | `moles=N`, `wt%=N`, `wt_fraction=N` | moles, weight percent, weight fraction |
| Temperature | `t,k=300`, `t,r=540`, `t,c=27`, `t,f=80` | Kelvin, Rankine, Celsius, Fahrenheit |
| Enthalpy | `h,cal/mol=123`, `h,j/mol=-9996.3`, `h,kj/mol=556` | cal/mol, J/mol, kJ/mol |
| Density | `rho,g/cc=0.437`, `rho,kg/m3=437` | g/cc, kg/m³ |
| Exploded formula | `N 1.56168 O .419590 Ar .009365` | Element coefficients |

### Rocket Problem Parameters (in `prob` dataset)

| Parameter | Keyword | Description |
|---|---|---|
| Problem type | `ro` or `rkt` | Rocket performance calculation |
| Chamber pressure | `p,psia=1000` / `p,bar=68.9` / `p,atm=68` | Chamber stagnation pressure |
| O/F ratio | `o/f=6.0` | Oxidant-to-fuel mass ratio |
| Fuel percentage | `%fuel=14.28` | Fuel mass percentage |
| Equivalence ratio | `r,eq.ratio=1.3` | Chemical equivalence ratio |
| Exit pressure ratio | `pi/p=3,10,300` | Chamber-to-exit pressure ratios (multiple) |
| Area ratio | `supar=40` | Exit-to-throat area ratio (Ae/At) |
| Subsonic area ratio | `subar=` | Chamber-to-throat area ratio |
| Flow model | `equilibrium` / `frozen` | Re-equilibrating or frozen composition |
| Combustor model | `iac` / `fac` | Infinite-area or finite-area combustor |
| Contraction ratio | `acat=` | Ac/At for finite-area combustor |
| Mass flow rate | `ma=` | kg/s/m² of chamber area |
| Freeze at throat | `nfz=2` | Freeze composition at throat |
| Freeze at point | `nfz=N` (N>2) | Freeze composition at Nth exit point |
| Initial T estimate | `tcest=1100` | Starting estimate for convergence |
| Include ions | `ions` | Include ionized species |

### Output Control (in `outp` dataset)

| Option | Description |
|---|---|
| `calories` | Use calorie-based units |
| `si` | Use SI units (default) |
| `short` | Abbreviated output |
| `massf` | Include mass fractions |
| `plot` | Generate plot file |
| `trace` | Include trace species |
| `tran` | Include transport properties |

---

## Output Format

Output files receive the same prefix as the input with suffix `.out`. Optional plot files use `.plt`.

### Rocket Performance Output Table

For rocket problems, CEA outputs a structured table with columns for **Chamber**, **Throat**, and **Exit** conditions:

```
            CHAMBER   THROAT     EXIT
Pinf/P            1.0000   1.7351   459.06
P, ATM            68.046   39.216  0.14823
T, K             3483.35  3291.03  1440.95
RHO, G/CC       3.2038-3 1.9758-3 1.7690-5
H, CAL/G         -235.74  -509.81 -2372.54
S, CAL/(G)(K)     4.2644   4.2644   4.2644
M, (1/n)          13.458   13.606   14.111
GAMMAs            1.1401   1.1403   1.2388
SON VEL,M/SEC     1566.3   1514.4   1025.6
MACH NUMBER        0.000    1.000    4.123

PERFORMANCE PARAMETERS
Ae/At                     1.00000   40.000
CSTAR, FT/SEC              7560.0   7560.0
CF                         0.6572   1.8351
Ivac,LB-SEC/LB              289.8    451.7
Isp, LB-SEC/LB              154.4    431.2
```

### Key Output Parameters

**Thermodynamic State (at each station):**

| Parameter | Symbol | Units (SI) | Description |
|---|---|---|---|
| Pressure ratio | Pinf/P | dimensionless | Chamber-to-local pressure ratio |
| Pressure | P | bar or atm | Local static pressure |
| Temperature | T | K | Local static temperature |
| Density | rho | kg/m³ or g/cc | Local density |
| Enthalpy | h | kJ/kg or cal/g | Specific enthalpy |
| Internal energy | u | kJ/kg | Specific internal energy |
| Entropy | s | kJ/(kg·K) | Specific entropy (constant through isentropic nozzle) |
| Gibbs energy | g | kJ/kg | Specific Gibbs free energy |
| Molecular weight (gas) | M | kg/kmol | 1/n, where n = total gas moles per kg |
| Molecular weight (total) | MW | kg/kmol | Including condensed phases |

**Thermodynamic Derivatives and Transport:**

| Parameter | Symbol | Description |
|---|---|---|
| (dLV/dLP)t | — | Log-volume derivative w.r.t. log-pressure at constant T |
| (dLV/dLT)p | — | Log-volume derivative w.r.t. log-temperature at constant P |
| Cp (equilibrium) | Cp,eq | Equilibrium specific heat at constant pressure |
| Cp (frozen) | Cp,fr | Frozen specific heat at constant pressure |
| Gamma (isentropic) | gamma_s | Ratio of specific heats for isentropic processes |
| Sonic velocity | a | Local speed of sound |
| Viscosity | mu | Gas mixture viscosity (millipoise) |
| Thermal conductivity | k | Frozen/equilibrium conductivity |
| Prandtl number | Pr | Frozen/equilibrium Prandtl number |

**Performance Parameters:**

| Parameter | Symbol | Units | Description |
|---|---|---|---|
| Area ratio | Ae/At | dimensionless | Exit-to-throat area ratio |
| Characteristic velocity | C* | m/s or ft/s | Chamber characteristic velocity |
| Thrust coefficient | CF | dimensionless | Ratio of thrust to chamber pressure × throat area |
| Vacuum specific impulse | Isp,vac | m/s or lbf·s/lbm | Specific impulse in vacuum |
| Specific impulse | Isp | m/s or lbf·s/lbm | Specific impulse at given pressure ratio |
| Mach number | M | dimensionless | Local Mach number |

**Species Mole Fractions** are listed below the performance table for each station, with condensed species marked with `*`. Species below the trace threshold are grouped as "TRACE SPECIES."

---

## CEArun Web Interface

CEArun is the official web-based interface at https://cearun.grc.nasa.gov that lets users run CEA calculations through a browser without local installation.

**How it works:**
1. User selects problem type from menu (rocket, hp, tp, det, shock, tv, uv, sp, sv)
2. User enters optional alphanumeric case identifier (up to 15 characters)
3. User fills in reactant and problem parameter forms
4. User clicks "Submit"
5. CEArun processes input through the CEA engine and returns results

The site also provides **ThermoBuild**, which lets users interactively select species from the NASA Glenn thermodynamic database and generate property tables or data subsets.

**Requirements:** Cookies and JavaScript enabled.

---

## Python API

### Basic Setup

```python
import cea

# Initialize with thermodynamic databases
cea.init()  # auto-locates thermo.lib and trans.lib
```

### Define Reactants and Products

```python
# Define reactants
reactants = cea.Mixture(
    species=["H2", "O2"],
    products_from_reactants=True
)

# Define products (optional - can auto-detect from reactants)
products = cea.Mixture(
    species=["H", "H2", "H2O", "O", "O2", "OH"],
    omit=[]
)
```

### Run Equilibrium Calculation

```python
# Create solver
solver = cea.EqSolver(products, reactants=reactants)

# Solve at assigned enthalpy and pressure (HP problem)
solution = cea.EqSolution(solver)
of_ratio = 8.0
weights = reactants.of_ratio_to_weights(oxidant_weights, fuel_weights, of_ratio)
solver.solve(solution, cea.HP, 101.325, 0.0, weights)

# Access results
print(f"T = {solution.T} K")
print(f"Molecular weight = {solution.M}")
print(f"Enthalpy = {solution.enthalpy} kJ/kg")
```

### Rocket Solver

```python
# Create rocket solver
rocket_solver = cea.RocketSolver(products, reactants=reactants)
rocket_soln = cea.RocketSolution(rocket_solver)

# Solve rocket problem
# pc = chamber pressure (atm), supar = exit-to-throat area ratios
rocket_solver.solve(rocket_soln, weights, pc=68.046, supar=[40.0], iac=True)

# Access results
print(f"Isp = {rocket_soln.Isp} m/s")
print(f"C* = {rocket_soln.c_star} m/s")
print(f"T_chamber = {rocket_soln.T[0]} K")
print(f"T_throat = {rocket_soln.T[1]} K")
print(f"T_exit = {rocket_soln.T[2]} K")
```

### Key Python API Objects

| Object | Purpose |
|---|---|
| `cea.Mixture` | Define species compositions (reactants or products) |
| `cea.EqSolver` | General equilibrium solver |
| `cea.EqSolution` | Solution from equilibrium solver |
| `cea.RocketSolver` | Rocket performance solver |
| `cea.RocketSolution` | Solution from rocket solver |
| `cea.HP`, `cea.TP`, `cea.SP` | Problem type constants |
| `cea.init()` | Initialize CEA with databases |

---

## Source Code Structure

| File | Purpose |
|---|---|
| `source/main.f90` | Program entry point (CLI driver) |
| `source/cea.f90` | Core CEA orchestration module |
| `source/equilibrium.f90` | Chemical equilibrium solver (Gibbs minimization) |
| `source/rocket.f90` | Rocket performance calculations |
| `source/detonation.f90` | Chapman-Jouguet detonation |
| `source/shock.f90` | Shock wave computations |
| `source/mixture.f90` | Species/mixture composition handling |
| `source/thermo.f90` | Thermodynamic property evaluation |
| `source/transport.f90` | Transport properties (viscosity, conductivity) |
| `source/fits.f90` | Curve-fit utilities |
| `source/input.f90` | Legacy input file parsing |
| `source/database_compile.f90` | Thermodynamic database compilation |
| `source/atomic_data.f90` | Atomic/element data |
| `source/units.f90` | Unit conversion |
| `source/param.f90.in` | CMake-configured parameter template |

**Binding layers:**
- `source/bind/c/` — C API (header `cea.h`, enum header `cea_enum.h`, Fortran ISO_C_BINDING shim `bindc.F90`)
- `source/bind/python/` — Python/Cython bindings (`CEA.pyx`, `cea_def.pxd`, package in `cea/`)

**Data files:**
- `data/thermo.inp` — Thermodynamic data (2000+ species, 7- and 9-coefficient polynomial fits)
- `data/trans.inp` — Transport property data (viscosity and thermal conductivity)

**Language breakdown:** Fortran 56.6%, Python 20.6%, Cython 12.1%, CMake 5.7%, C 3.9%, TeX 0.5%

---

## Thermodynamic Database

CEA includes over 2,000 species with NASA 7- and 9-coefficient polynomial curve fits, continuously updated since the 1950s.

**Species categories include:** elements, oxides, hydrocarbons, inorganics, ions, and condensed phases.

**Curve fit format:** Each species entry in `thermo.inp` provides temperature-range-dependent polynomial coefficients for:
- Specific heat Cp
- Enthalpy H
- Entropy S

**Transport data** (`trans.inp`) provides collision integral data for:
- Viscosity
- Thermal conductivity

---

## Architectural Principles (from AGENTS.md)

- **Data integrity:** `data/thermo.inp` and `data/trans.inp` must not be modified unless explicitly instructed
- **Numerical precision is critical:** Contributors must preserve bitwise results and scientific behavior
- **Clarity over optimization:** Prefer clear code over clever micro-optimizations
- **Backward compatibility:** Must be maintained for existing user base
- **Line length:** Fortran source lines must stay within 132 characters (GNU free-form default)

---

## Common Workflows

### Run a Rocket Calculation (CLI)

```bash
cea < rocket_input.inp > rocket_output.out
```

### Run via CEArun

1. Go to https://cearun.grc.nasa.gov
2. Select "rocket" problem type
3. Enter reactants and conditions
4. Click Submit

### Run via Python

```python
import cea
cea.init()

# Setup and solve...
# (see Python API section above)
```

### Common Propellant Combinations

| Name | Fuel | Oxidizer | Typical O/F | Approx. Isp (s) |
|---|---|---|---|---|
| LOX/LH2 | H2(L) | O2(L) | 5.0-6.0 | 390-452 |
| LOX/RP-1 | RP-1 | O2(L) | 2.2-2.6 | 260-310 |
| N2O4/MMH | MMH | N2O4 | 1.6-2.0 | 270-310 |
| LOX/CH4 | CH4 | O2(L) | 3.0-3.6 | 310-360 |

---

## RocketCEA (Third-Party Python Wrapper)

RocketCEA is a separate, popular Python wrapper specifically targeting the NASA FORTRAN CEA code for rocket propulsion. It uses `f2py` to wrap a modified version of the FORTRAN code.

**Installation:**
```bash
pip install rocketcea
```

**Key class:** `CEA_Obj`

**Key methods:**
- `Isp(Pc=1000, MR=6.0, ...)` — Specific impulse
- `Cstar(Pc=1000, MR=6.0, ...)` — Characteristic velocity
- `Tcham(Pc=1000, MR=6.0, ...)` — Chamber temperature
- `get_Chamber_MolWt(Pc, MR)` — Chamber molecular weight
- `get_Throat_MachNumber(Pc, MR)` — Throat Mach number

**Documentation:** https://rocketcea.readthedocs.io

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `cea.init()` fails to find databases | Set `CEA_DATA_DIR` env var or ensure `thermo.lib`/`trans.lib` are in current directory |
| Convergence failure | Try `tcest=` to set initial temperature estimate; check reactant amounts; simplify product list |
| Wrong units | Check `outp` section — `calories` vs `si` (default); pressure units: `psia`, `bar`, `atm` |
| Species not found | Check species name format in `thermo.inp`; use exploded formula for custom species |
| Fortran line length error | Keep lines under 132 characters in free-form input |