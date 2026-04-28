from __future__ import annotations

from rocket_cea_gui.services.cea_solver import run_cea, get_result
from rocket_cea_gui.api.models import CEARunRequest, CEAReactant, ProblemType, FlowModel, PressureUnit, AmountUnit


class TestRunCEA:
    def test_returns_result_with_id(self):
        req = CEARunRequest(
            problem_type=ProblemType.ROCKET,
            reactants=[
                CEAReactant(species="O2", weight=6.0, amount_unit=AmountUnit.OF_RATIO),
                CEAReactant(species="RP-1", weight=1.0, amount_unit=AmountUnit.OF_RATIO),
            ],
            chamber_pressure=1000.0,
            pressure_unit=PressureUnit.PSIA,
            area_ratio=40.0,
            flow_model=FlowModel.EQUILIBRIUM,
        )
        result = run_cea(req)
        assert result.id is not None
        assert len(result.id) > 0

    def test_performance_fields(self):
        req = CEARunRequest(
            problem_type=ProblemType.ROCKET,
            reactants=[CEAReactant(species="O2", weight=6.0, amount_unit=AmountUnit.OF_RATIO)],
            chamber_pressure=1000.0,
            pressure_unit=PressureUnit.PSIA,
            area_ratio=40.0,
            flow_model=FlowModel.EQUILIBRIUM,
        )
        result = run_cea(req)
        assert result.performance.isp_vac > 0
        assert result.performance.c_star > 0
        assert result.performance.cf > 0
        assert result.performance.t_chamber > 0

    def test_stations_present(self):
        req = CEARunRequest(
            problem_type=ProblemType.ROCKET,
            reactants=[CEAReactant(species="O2", weight=6.0, amount_unit=AmountUnit.OF_RATIO)],
            chamber_pressure=1000.0,
            pressure_unit=PressureUnit.PSIA,
            area_ratio=40.0,
            flow_model=FlowModel.EQUILIBRIUM,
        )
        result = run_cea(req)
        assert "chamber" in result.stations
        assert "throat" in result.stations
        assert "exit" in result.stations

    def test_composition_present(self):
        req = CEARunRequest(
            problem_type=ProblemType.ROCKET,
            reactants=[
                CEAReactant(species="RP-1", weight=1.0, amount_unit=AmountUnit.OF_RATIO),
                CEAReactant(species="O2", weight=6.0, amount_unit=AmountUnit.OF_RATIO),
            ],
            chamber_pressure=1000.0,
            pressure_unit=PressureUnit.PSIA,
            area_ratio=40.0,
            flow_model=FlowModel.EQUILIBRIUM,
        )
        result = run_cea(req)
        assert len(result.composition) > 0
        # Top species should be CO, H2O, CO2, or H2 for hydrocarbon combustion
        top_species = [s.name for s in result.composition[:5]]
        assert any(s in top_species for s in ["CO", "H2O", "CO2", "H2"])

    def test_throat_pressure_ratio(self):
        req = CEARunRequest(
            problem_type=ProblemType.ROCKET,
            reactants=[CEAReactant(species="O2", weight=6.0, amount_unit=AmountUnit.OF_RATIO)],
            chamber_pressure=1000.0,
            pressure_unit=PressureUnit.PSIA,
            area_ratio=40.0,
            flow_model=FlowModel.EQUILIBRIUM,
        )
        result = run_cea(req)
        # Throat pressure should be roughly 56% of chamber pressure (mock data)
        assert result.stations["throat"].pressure < result.stations["chamber"].pressure


class TestGetResult:
    def test_stored_result_retrievable(self):
        req = CEARunRequest(
            problem_type=ProblemType.ROCKET,
            reactants=[
                CEAReactant(species="RP-1", weight=1.0, amount_unit=AmountUnit.OF_RATIO),
                CEAReactant(species="O2", weight=6.0, amount_unit=AmountUnit.OF_RATIO),
            ],
            chamber_pressure=1000.0,
            pressure_unit=PressureUnit.PSIA,
            area_ratio=40.0,
            flow_model=FlowModel.EQUILIBRIUM,
        )
        result = run_cea(req)
        retrieved = get_result(result.id)
        assert retrieved is not None
        assert retrieved.id == result.id

    def test_nonexistent_result_returns_none(self):
        assert get_result("nonexistent") is None