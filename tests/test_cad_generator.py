from __future__ import annotations

import math
import os
import tempfile

from rocket_cea_gui.services.cad_generator import (
    NozzleProfile,
    compute_conical_profile,
    compute_bell_profile,
    generate_nozzle,
    generate_openscad,
    generate_step,
    generate_stl,
    get_file_path,
    _conical_inner_points,
    _bell_inner_points,
)
from rocket_cea_gui.api.models import NozzleType


class TestConicalProfile:
    def test_basic_profile(self):
        p = compute_conical_profile(
            chamber_diameter=4.0,
            throat_diameter=1.5,
            exit_diameter=9.49,
            chamber_length=6.0,
            convergence_angle=45.0,
            divergence_angle=15.0,
            wall_thickness=0.125,
        )
        assert p.chamber_radius == 2.0
        assert p.throat_radius == 0.75
        assert p.exit_radius == 4.745
        assert p.chamber_length == 6.0
        assert p.convergence_angle == 45.0
        assert p.divergence_angle == 15.0
        assert p.wall_thickness == 0.125
        assert p.nozzle_type == NozzleType.CONICAL

    def test_radii_are_half_diameters(self):
        p = compute_conical_profile(10.0, 2.0, 6.0, 5.0, 30.0, 15.0, 0.25)
        assert p.chamber_radius == 5.0
        assert p.throat_radius == 1.0
        assert p.exit_radius == 3.0


class TestBellProfile:
    def test_basic_profile(self):
        p = compute_bell_profile(
            chamber_diameter=4.0,
            throat_diameter=1.5,
            exit_diameter=9.49,
            chamber_length=6.0,
            convergence_angle=45.0,
            wall_thickness=0.125,
        )
        assert p.chamber_radius == 2.0
        assert p.throat_radius == 0.75
        assert p.exit_radius == 4.745
        assert p.divergence_angle is None
        assert p.nozzle_type == NozzleType.BELL_RAO
        assert p.initial_expansion_angle == 30.0
        assert p.exit_angle == 8.0

    def test_custom_angles(self):
        p = compute_bell_profile(
            chamber_diameter=4.0,
            throat_diameter=1.5,
            exit_diameter=9.49,
            chamber_length=6.0,
            convergence_angle=45.0,
            wall_thickness=0.125,
            initial_expansion_angle=25.0,
            exit_angle=10.0,
        )
        assert p.initial_expansion_angle == 25.0
        assert p.exit_angle == 10.0


class TestConicalInnerPoints:
    def test_returns_list_of_tuples(self):
        p = compute_conical_profile(4.0, 1.5, 9.49, 6.0, 45.0, 15.0, 0.125)
        points = _conical_inner_points(p)
        assert isinstance(points, list)
        assert all(isinstance(pt, tuple) and len(pt) == 2 for pt in points)

    def test_first_point_is_chamber_start(self):
        p = compute_conical_profile(4.0, 1.5, 9.49, 6.0, 45.0, 15.0, 0.125)
        points = _conical_inner_points(p)
        assert points[0] == (0, p.chamber_radius)

    def test_throat_radius_at_convergence_end(self):
        p = compute_conical_profile(4.0, 1.5, 9.49, 6.0, 45.0, 15.0, 0.125)
        points = _conical_inner_points(p)
        # Point after chamber should be throat
        throat_point = points[2]
        assert abs(throat_point[1] - p.throat_radius) < 1e-10

    def test_exit_radius_at_divergence_end(self):
        p = compute_conical_profile(4.0, 1.5, 9.49, 6.0, 45.0, 15.0, 0.125)
        points = _conical_inner_points(p)
        last = points[-1]
        assert abs(last[1] - p.exit_radius) < 1e-10

    def test_monotonic_z(self):
        p = compute_conical_profile(4.0, 1.5, 9.49, 6.0, 45.0, 15.0, 0.125)
        points = _conical_inner_points(p)
        zs = [z for z, _ in points]
        assert zs == sorted(zs)


class TestBellInnerPoints:
    def test_returns_list_of_tuples(self):
        p = compute_bell_profile(4.0, 1.5, 9.49, 6.0, 45.0, 0.125)
        points = _bell_inner_points(p)
        assert isinstance(points, list)
        assert all(isinstance(pt, tuple) and len(pt) == 2 for pt in points)

    def test_starts_at_chamber(self):
        p = compute_bell_profile(4.0, 1.5, 9.49, 6.0, 45.0, 0.125)
        points = _bell_inner_points(p)
        assert points[0] == (0, p.chamber_radius)

    def test_has_more_points_than_conical(self):
        p_conical = compute_conical_profile(4.0, 1.5, 9.49, 6.0, 45.0, 15.0, 0.125)
        p_bell = compute_bell_profile(4.0, 1.5, 9.49, 6.0, 45.0, 0.125)
        conical_pts = _conical_inner_points(p_conical)
        bell_pts = _bell_inner_points(p_bell)
        assert len(bell_pts) > len(conical_pts)

    def test_exit_radius_approximately_correct(self):
        p = compute_bell_profile(4.0, 1.5, 9.49, 6.0, 45.0, 0.125)
        points = _bell_inner_points(p)
        last_r = points[-1][1]
        # Parabolic approximation won't be exact, but should be close
        assert abs(last_r - p.exit_radius) < 0.5

    def test_monotonic_z(self):
        p = compute_bell_profile(4.0, 1.5, 9.49, 6.0, 45.0, 0.125)
        points = _bell_inner_points(p)
        zs = [z for z, _ in points]
        assert zs == sorted(zs)


class TestGenerateOpenSCAD:
    def test_conical_openscad(self):
        p = compute_conical_profile(4.0, 1.5, 9.49, 6.0, 45.0, 15.0, 0.125)
        scad = generate_openscad(p)
        assert "conical" in scad
        assert "chamber_radius" in scad
        assert "rotate_extrude" in scad
        assert "difference" in scad

    def test_bell_openscad(self):
        p = compute_bell_profile(4.0, 1.5, 9.49, 6.0, 45.0, 0.125)
        scad = generate_openscad(p)
        assert "bell_rao" in scad
        assert "inner_profile" in scad
        assert "rotate_extrude" in scad

    def test_parameters_in_output(self):
        p = compute_conical_profile(4.0, 1.5, 9.49, 6.0, 45.0, 15.0, 0.125)
        scad = generate_openscad(p)
        assert "0.7500" in scad  # throat_radius
        assert "2.0000" in scad  # chamber_radius
        assert "15.0" in scad    # divergence angle


class TestGenerateNozzle:
    def test_conical_generation(self):
        result = generate_nozzle(
            nozzle_type=NozzleType.CONICAL,
            chamber_diameter=4.0,
            chamber_length=6.0,
            wall_thickness=0.125,
            convergence_angle=45.0,
            divergence_angle=15.0,
            throat_diameter=1.5,
            exit_diameter=9.49,
        )
        assert "id" in result
        assert "openscad_download_url" in result
        assert result["openscad_download_url"].endswith("model.scad")
        assert result["parameters"]["nozzle_type"] == "conical"

    def test_bell_generation(self):
        result = generate_nozzle(
            nozzle_type=NozzleType.BELL_RAO,
            chamber_diameter=4.0,
            chamber_length=6.0,
            wall_thickness=0.125,
            convergence_angle=45.0,
            throat_diameter=1.5,
            exit_diameter=9.49,
        )
        assert "id" in result
        assert result["parameters"]["nozzle_type"] == "bell_rao"

    def test_scad_file_exists(self):
        result = generate_nozzle(
            nozzle_type=NozzleType.CONICAL,
            chamber_diameter=4.0,
            chamber_length=6.0,
            wall_thickness=0.125,
            convergence_angle=45.0,
            divergence_angle=15.0,
        )
        scad_path = get_file_path(result["id"], "model.scad")
        assert scad_path is not None
        assert os.path.exists(scad_path)
        with open(scad_path) as f:
            content = f.read()
        assert "rotate_extrude" in content

    def test_parameters_recorded(self):
        result = generate_nozzle(
            nozzle_type=NozzleType.CONICAL,
            chamber_diameter=4.0,
            chamber_length=6.0,
            wall_thickness=0.125,
            convergence_angle=45.0,
            divergence_angle=15.0,
            throat_diameter=1.5,
            exit_diameter=9.49,
        )
        params = result["parameters"]
        assert params["chamber_diameter"] == 4.0
        assert params["chamber_length"] == 6.0
        assert params["wall_thickness"] == 0.125
        assert params["convergence_angle"] == 45.0
        assert params["divergence_angle"] == 15.0
        assert params["throat_diameter"] == 1.5
        assert params["exit_diameter"] == 9.49


class TestGetFilePath:
    def test_known_id_returns_scad(self):
        result = generate_nozzle(
            nozzle_type=NozzleType.CONICAL,
            chamber_diameter=4.0,
            chamber_length=6.0,
            wall_thickness=0.125,
            convergence_angle=45.0,
            divergence_angle=15.0,
        )
        path = get_file_path(result["id"], "model.scad")
        assert path is not None
        assert path.endswith(".scad")

    def test_unknown_id_returns_none(self):
        assert get_file_path("nonexistent", "model.scad") is None

    def test_step_file_may_be_none(self):
        # CadQuery may not be available, so step could be None
        result = generate_nozzle(
            nozzle_type=NozzleType.CONICAL,
            chamber_diameter=4.0,
            chamber_length=6.0,
            wall_thickness=0.125,
            convergence_angle=45.0,
            divergence_angle=15.0,
        )
        # get_file_path returns None for step if CadQuery unavailable
        step_path = get_file_path(result["id"], "model.step")
        # Either exists or None — both valid depending on CadQuery availability
        if step_path is not None:
            assert os.path.exists(step_path)