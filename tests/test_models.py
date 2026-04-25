from __future__ import annotations

import pytest
from pydantic import ValidationError

from rocket_cea_gui.api.models import (
    CEARunRequest,
    CEAReactant,
    CEAPerformance,
    CEAResult,
    CEAStation,
    CEASpeciesFraction,
    CADGenerateRequest,
    CADGenerateResult,
    RocketPyExportRequest,
    RocketPyExportResult,
    SpeciesSearchResult,
    ProblemType,
    FlowModel,
    PressureUnit,
    AmountUnit,
    NozzleType,
    ExportFormat,
)


class TestEnums:
    def test_problem_types(self):
        assert ProblemType.ROCKET.value == "rocket"
        assert ProblemType.HP.value == "hp"
        assert ProblemType.TP.value == "tp"

    def test_flow_models(self):
        assert FlowModel.EQUILIBRIUM.value == "equilibrium"
        assert FlowModel.FROZEN.value == "frozen"

    def test_pressure_units(self):
        assert len(PressureUnit) == 6
        assert PressureUnit.PSIA.value == "psia"

    def test_nozzle_types(self):
        assert NozzleType.CONICAL.value == "conical"
        assert NozzleType.BELL_RAO.value == "bell_rao"

    def test_export_formats(self):
        assert ExportFormat.PYTHON.value == "python"
        assert ExportFormat.JSON.value == "json"
        assert ExportFormat.NOTEBOOK.value == "notebook"


class TestCEARunRequest:
    def test_valid_request(self):
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
        assert req.problem_type == ProblemType.ROCKET
        assert len(req.reactants) == 2
        assert req.chamber_pressure == 1000.0

    def test_missing_required_fields(self):
        with pytest.raises(ValidationError):
            CEARunRequest()

    def test_optional_supersonic_ratio(self):
        req = CEARunRequest(
            problem_type=ProblemType.ROCKET,
            reactants=[CEAReactant(species="O2", weight=6.0, amount_unit=AmountUnit.OF_RATIO)],
            chamber_pressure=1000.0,
            pressure_unit=PressureUnit.PSIA,
            area_ratio=40.0,
            flow_model=FlowModel.EQUILIBRIUM,
            supersonic_area_ratio=10.0,
        )
        assert req.supersonic_area_ratio == 10.0

    def test_supersonic_ratio_optional_default(self):
        req = CEARunRequest(
            problem_type=ProblemType.ROCKET,
            reactants=[CEAReactant(species="O2", weight=6.0, amount_unit=AmountUnit.OF_RATIO)],
            chamber_pressure=1000.0,
            pressure_unit=PressureUnit.PSIA,
            area_ratio=40.0,
            flow_model=FlowModel.EQUILIBRIUM,
        )
        assert req.supersonic_area_ratio is None


class TestCEAResult:
    def test_result_construction(self):
        perf = CEAPerformance(isp_vac=311.5, isp_sl=275.3, c_star=5762.0, cf=1.741, t_chamber=6084.0, p_exit=1.22)
        station = CEAStation(pressure=1000.0, temperature=6084.0, density=0.127, mach=1.0, velocity=3502.0)
        comp = [CEASpeciesFraction(name="CO2", mole_fraction=0.341, mass_fraction=0.512)]
        result = CEAResult(id="abc123", performance=perf, stations={"chamber": station}, composition=comp)
        assert result.id == "abc123"
        assert result.performance.isp_vac == 311.5
        assert result.stations["chamber"].pressure == 1000.0
        assert len(result.composition) == 1


class TestCADGenerateRequest:
    def test_valid_request(self):
        req = CADGenerateRequest(
            cea_result_id="abc123",
            nozzle_type=NozzleType.CONICAL,
            chamber_diameter=3.0,
            chamber_length=6.0,
            wall_thickness=0.125,
            convergence_angle=45.0,
        )
        assert req.nozzle_type == NozzleType.CONICAL
        assert req.divergence_angle is None

    def test_with_divergence(self):
        req = CADGenerateRequest(
            cea_result_id="abc123",
            nozzle_type=NozzleType.CONICAL,
            chamber_diameter=3.0,
            chamber_length=6.0,
            wall_thickness=0.125,
            convergence_angle=45.0,
            divergence_angle=15.0,
        )
        assert req.divergence_angle == 15.0


class TestRocketPyExportRequest:
    def test_minimal_request(self):
        req = RocketPyExportRequest(
            cea_result_id="abc123",
            format=ExportFormat.PYTHON,
        )
        assert req.format == ExportFormat.PYTHON
        assert req.dry_mass is None

    def test_full_request(self):
        req = RocketPyExportRequest(
            cea_result_id="abc123",
            format=ExportFormat.NOTEBOOK,
            dry_mass=5.0,
            rocket_diameter=54.0,
            cd=0.5,
            fin_count=3,
            fin_span=50.0,
        )
        assert req.dry_mass == 5.0
        assert req.fin_count == 3