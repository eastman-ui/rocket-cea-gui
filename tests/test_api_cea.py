from __future__ import annotations

import pytest
from httpx import AsyncClient, ASGITransport

from rocket_cea_gui.server import app


@pytest.fixture
def client():
    from starlette.testclient import TestClient
    return TestClient(app)


class TestHealthEndpoint:
    def test_health(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestCEARunEndpoint:
    def test_run_cea_rocket(self, client):
        response = client.post("/api/cea/run", json={
            "problem_type": "rocket",
            "reactants": [
                {"species": "O2", "weight": 6.0, "amount_unit": "of_ratio"},
                {"species": "RP-1", "weight": 1.0, "amount_unit": "of_ratio"},
            ],
            "chamber_pressure": 1000.0,
            "pressure_unit": "psia",
            "area_ratio": 40.0,
            "flow_model": "equilibrium",
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "performance" in data
        assert data["performance"]["isp_vac"] > 0
        assert data["performance"]["c_star"] > 0

    def test_run_cea_minimal(self, client):
        response = client.post("/api/cea/run", json={
            "problem_type": "rocket",
            "reactants": [
                {"species": "O2", "weight": 6.0, "amount_unit": "of_ratio"},
            ],
            "chamber_pressure": 500.0,
            "pressure_unit": "atm",
            "area_ratio": 20.0,
            "flow_model": "frozen",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["stations"]["chamber"]["pressure"] == 500.0

    def test_run_cea_invalid_problem_type(self, client):
        response = client.post("/api/cea/run", json={
            "problem_type": "invalid",
            "reactants": [],
            "chamber_pressure": 1000.0,
            "pressure_unit": "psia",
            "area_ratio": 40.0,
            "flow_model": "equilibrium",
        })
        assert response.status_code == 422

    def test_run_cea_missing_fields(self, client):
        response = client.post("/api/cea/run", json={})
        assert response.status_code == 422


class TestSpeciesEndpoint:
    def test_search_species(self, client):
        response = client.get("/api/cea/species?q=O2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert data[0]["name"] == "O2"

    def test_search_species_empty_query(self, client):
        response = client.get("/api/cea/species?q=")
        assert response.status_code == 200
        assert response.json() == []

    def test_search_species_partial(self, client):
        response = client.get("/api/cea/species?q=CH")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2  # CH4, C2H6, etc.


class TestResultEndpoint:
    def test_get_result_existing(self, client):
        # First create a result
        run_response = client.post("/api/cea/run", json={
            "problem_type": "rocket",
            "reactants": [{"species": "O2", "weight": 6.0, "amount_unit": "of_ratio"}],
            "chamber_pressure": 1000.0,
            "pressure_unit": "psia",
            "area_ratio": 40.0,
            "flow_model": "equilibrium",
        })
        result_id = run_response.json()["id"]

        # Then retrieve it
        response = client.get(f"/api/cea/result/{result_id}")
        assert response.status_code == 200
        assert response.json()["id"] == result_id

    def test_get_result_not_found(self, client):
        response = client.get("/api/cea/result/nonexistent")
        assert response.status_code == 404


class TestCADEndpoints:
    def test_generate_cad_stub(self, client):
        response = client.post("/api/cad/generate", json={
            "cea_result_id": "test123",
            "nozzle_type": "conical",
            "chamber_diameter": 3.0,
            "chamber_length": 6.0,
            "wall_thickness": 0.125,
            "convergence_angle": 45.0,
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "stl_preview_url" in data

    def test_cad_file_download_not_implemented(self, client):
        response = client.get("/api/cad/files/test123/preview.stl")
        assert response.status_code == 501


class TestExportEndpoints:
    def test_export_rocketpy_python(self, client):
        response = client.post("/api/export/rocketpy", json={
            "cea_result_id": "test123",
            "format": "python",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["filename"].endswith(".py")

    def test_export_rocketpy_json(self, client):
        response = client.post("/api/export/rocketpy", json={
            "cea_result_id": "test123",
            "format": "json",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["filename"].endswith(".json")

    def test_export_rocketpy_notebook(self, client):
        response = client.post("/api/export/rocketpy", json={
            "cea_result_id": "test123",
            "format": "notebook",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["filename"].endswith(".ipynb")

    def test_export_download_not_implemented(self, client):
        response = client.get("/api/export/download/test123/rocketpy_config.py")
        assert response.status_code == 501