from __future__ import annotations

import pytest
from starlette.testclient import TestClient

from rocket_cea_gui.server import app


@pytest.fixture
def client():
    return TestClient(app)


class TestFullWorkflow:
    """End-to-end: CEA run → CAD generate → file download."""

    def test_cea_to_cad_to_download(self, client):
        # 1. Run CEA
        cea_response = client.post("/api/cea/run", json={
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
        assert cea_response.status_code == 200
        cea_id = cea_response.json()["id"]

        # 2. Retrieve CEA result
        result = client.get(f"/api/cea/result/{cea_id}")
        assert result.status_code == 200
        assert result.json()["id"] == cea_id

        # 3. Generate CAD model
        cad_response = client.post("/api/cad/generate", json={
            "cea_result_id": cea_id,
            "nozzle_type": "conical",
            "chamber_diameter": 3.0,
            "chamber_length": 6.0,
            "wall_thickness": 0.125,
            "convergence_angle": 45.0,
            "divergence_angle": 15.0,
        })
        assert cad_response.status_code == 200
        cad_data = cad_response.json()
        assert "id" in cad_data
        assert "openscad_download_url" in cad_data
        assert cad_data["parameters"]["nozzle_type"] == "conical"

        # 4. Download OpenSCAD file
        cad_id = cad_data["id"]
        scad_response = client.get(f"/api/cad/files/{cad_id}/model.scad")
        assert scad_response.status_code == 200
        assert b"rotate_extrude" in scad_response.content

        # 5. Download nonexistent file returns 404
        missing = client.get("/api/cad/files/nonexistent/model.scad")
        assert missing.status_code == 404

    def test_bell_nozzle_workflow(self, client):
        """Bell nozzle CAD generation works end-to-end."""
        cad_response = client.post("/api/cad/generate", json={
            "cea_result_id": "irrelevant",
            "nozzle_type": "bell_rao",
            "chamber_diameter": 4.0,
            "chamber_length": 6.0,
            "wall_thickness": 0.125,
            "convergence_angle": 45.0,
        })
        assert cad_response.status_code == 200
        cad_data = cad_response.json()
        assert cad_data["parameters"]["nozzle_type"] == "bell_rao"

        cad_id = cad_data["id"]
        scad = client.get(f"/api/cad/files/{cad_id}/model.scad")
        assert scad.status_code == 200
        assert b"bell_rao" in scad.content

    def test_species_search_to_cea_run(self, client):
        """Search species → use result in CEA run."""
        # Search
        species = client.get("/api/cea/species?q=O2")
        assert species.status_code == 200
        assert len(species.json()) >= 1

        # Run with found species
        cea = client.post("/api/cea/run", json={
            "problem_type": "rocket",
            "reactants": [
                {"species": "O2", "weight": 6.0, "amount_unit": "of_ratio"},
            ],
            "chamber_pressure": 500.0,
            "pressure_unit": "atm",
            "area_ratio": 20.0,
            "flow_model": "frozen",
        })
        assert cea.status_code == 200
        assert cea.json()["performance"]["isp_vac"] > 0


class TestStaticServing:
    """Verify built frontend is served."""

    def test_index_html(self, client):
        response = client.get("/")
        # If static dir exists, returns 200 with HTML
        # If not (dev mode), may return 404
        if response.status_code == 200:
            assert "Rocket CEA" in response.text or "root" in response.text

    def test_api_health_unaffected(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}