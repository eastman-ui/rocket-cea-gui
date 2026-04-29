import pytest
from starlette.testclient import TestClient

from rocket_cea_gui.server import app


@pytest.fixture
def client():
    return TestClient(app)


class TestChamberSizingAPI:
    def test_chamber_sizing_from_mass_flow(self, client):
        resp = client.post("/api/engineering/chamber-sizing", json={
            "mass_flow_rate": 2.0,
            "c_star": 1800,
            "cf": 1.5,
            "chamber_pressure": 500,
            "pressure_unit": "psia",
            "l_star": 60,
            "l_star_unit": "in",
            "contraction_ratio": 3.0,
            "convergence_angle": 45.0,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["throat_area"] > 0
        assert data["throat_diameter"] > 0
        assert data["chamber_volume"] > 0
        assert data["mass_flow_rate"] == 2.0

    def test_chamber_sizing_from_thrust(self, client):
        resp = client.post("/api/engineering/chamber-sizing", json={
            "thrust": 5000,
            "thrust_unit": "N",
            "c_star": 1800,
            "isp_vac": 310,
            "chamber_pressure": 500,
            "pressure_unit": "psia",
            "l_star": 60,
            "contraction_ratio": 3.0,
            "convergence_angle": 45.0,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["mass_flow_rate"] > 0
        assert data["thrust"] > 0


class TestBartzHeatFluxAPI:
    def test_bartz_basic(self, client):
        resp = client.post("/api/engineering/bartz-heat-flux", json={
            "chamber_pressure": 500,
            "pressure_unit": "psia",
            "c_star": 1800,
            "cp_chamber": 2000,
            "gamma_chamber": 1.2,
            "t_chamber": 3400,
            "molecular_weight": 20,
            "throat_diameter": 0.03,
            "area_ratio_exit": 10,
            "wall_temperature": 600,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["stations"]) == 3
        assert data["max_heat_flux"] > 0


class TestInjectorSizingAPI:
    def test_injector_basic(self, client):
        resp = client.post("/api/engineering/injector-sizing", json={
            "fuel_mass_flow_rate": 0.5,
            "oxidizer_mass_flow_rate": 1.5,
            "fuel_density": 810,
            "oxidizer_density": 1141,
            "fuel_pressure_drop": 100,
            "oxidizer_pressure_drop": 100,
            "pressure_unit": "psia",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["fuel"]["orifice_diameter"] > 0
        assert data["oxidizer"]["orifice_diameter"] > 0
        assert data["total_orifice_count"] > 0