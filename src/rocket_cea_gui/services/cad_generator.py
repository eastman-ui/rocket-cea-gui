from __future__ import annotations

import math
import os
import tempfile
import uuid
from dataclasses import dataclass, field

from ..api.models import NozzleType


@dataclass
class NozzleProfile:
    """2D cross-section profile of a nozzle (half-section, rotated around axis)."""
    chamber_radius: float
    throat_radius: float
    exit_radius: float
    chamber_length: float
    convergence_angle: float  # degrees
    divergence_angle: float  # degrees (conical) or None (bell)
    wall_thickness: float
    nozzle_type: NozzleType
    # Bell-specific
    initial_expansion_angle: float | None = None
    exit_angle: float | None = None


def compute_conical_profile(
    chamber_diameter: float,
    throat_diameter: float,
    exit_diameter: float,
    chamber_length: float,
    convergence_angle: float,
    divergence_angle: float,
    wall_thickness: float,
) -> NozzleProfile:
    return NozzleProfile(
        chamber_radius=chamber_diameter / 2,
        throat_radius=throat_diameter / 2,
        exit_radius=exit_diameter / 2,
        chamber_length=chamber_length,
        convergence_angle=convergence_angle,
        divergence_angle=divergence_angle,
        wall_thickness=wall_thickness,
        nozzle_type=NozzleType.CONICAL,
    )


def compute_bell_profile(
    chamber_diameter: float,
    throat_diameter: float,
    exit_diameter: float,
    chamber_length: float,
    convergence_angle: float,
    wall_thickness: float,
    initial_expansion_angle: float = 30.0,
    exit_angle: float = 8.0,
) -> NozzleProfile:
    return NozzleProfile(
        chamber_radius=chamber_diameter / 2,
        throat_radius=throat_diameter / 2,
        exit_radius=exit_diameter / 2,
        chamber_length=chamber_length,
        convergence_angle=convergence_angle,
        divergence_angle=None,
        wall_thickness=wall_thickness,
        nozzle_type=NozzleType.BELL_RAO,
        initial_expansion_angle=initial_expansion_angle,
        exit_angle=exit_angle,
    )


def _conical_inner_points(profile: NozzleProfile, n_points: int = 80) -> list[tuple[float, float]]:
    """Generate (z, r) points for the inner contour of a conical nozzle."""
    points = []
    r_chamber = profile.chamber_radius
    r_throat = profile.throat_radius
    r_exit = profile.exit_radius

    # Convergent section length
    conv_len = (r_chamber - r_throat) / math.tan(math.radians(profile.convergence_angle))
    # Divergent section length
    div_len = (r_exit - r_throat) / math.tan(math.radians(profile.divergence_angle or 15))

    # Chamber cylinder - start at back face
    points.append((0, r_chamber))
    # Chamber back cap (center point for proper revolve)
    points.append((0, 0))
    # Chamber cylinder
    points.append((profile.chamber_length, 0))
    points.append((profile.chamber_length, r_chamber))

    # Convergent section
    z_conv_end = profile.chamber_length + conv_len
    points.append((z_conv_end, r_throat))

    # Divergent section
    z_div_end = z_conv_end + div_len
    points.append((z_div_end, r_exit))

    return points


def _bell_inner_points(profile: NozzleProfile, n_points: int = 80) -> list[tuple[float, float]]:
    """Generate (z, r) points for the inner contour of a bell (Rao) nozzle.

    Uses a parabolic approximation: the divergent section follows a
    parabola from the throat (at initial_expansion_angle) to the exit
    (at exit_angle).
    """
    r_chamber = profile.chamber_radius
    r_throat = profile.throat_radius
    r_exit = profile.exit_radius

    # Convergent section
    conv_len = (r_chamber - r_throat) / math.tan(math.radians(profile.convergence_angle))

    # Bell length from Rao approximation (fraction of equivalent conical length)
    theta_i = math.radians(profile.initial_expansion_angle or 30)
    theta_e = math.radians(profile.exit_angle or 8)
    # Approximate bell length
    div_len_conical = (r_exit - r_throat) / math.tan(math.radians(15))
    bell_len = div_len_conical * 0.8  # Bell is ~80% of conical length

    points = []
    # Chamber - start at back face
    points.append((0, r_chamber))
    # Chamber back cap (center point for proper revolve)
    points.append((0, 0))
    # Chamber cylinder
    points.append((profile.chamber_length, 0))
    points.append((profile.chamber_length, r_chamber))
    # Convergent to throat
    points.append((profile.chamber_length + conv_len, r_throat))

    # Parabolic bell contour
    # r(z) = a*z^2 + b*z + c where:
    #   at throat: r = r_throat, dr/dz = tan(theta_i)
    #   at exit: r = r_exit, dr/dz = tan(theta_e)
    # Using throat as z=0 for the parabola
    a = (math.tan(theta_e) - math.tan(theta_i)) / (2 * bell_len)
    b = math.tan(theta_i)
    c = r_throat

    for i in range(1, n_points + 1):
        z_frac = i / n_points
        z_local = z_frac * bell_len
        r = a * z_local ** 2 + b * z_local + c
        points.append((profile.chamber_length + conv_len + z_local, r))

    return points


def generate_openscad(profile: NozzleProfile) -> str:
    """Generate an OpenSCAD script for the nozzle."""
    r_chamber = profile.chamber_radius
    r_throat = profile.throat_radius
    r_exit = profile.exit_radius
    wall = profile.wall_thickness
    conv_angle = profile.convergence_angle
    conv_len = (r_chamber - r_throat) / math.tan(math.radians(conv_angle))

    if profile.nozzle_type == NozzleType.CONICAL:
        div_angle = profile.divergence_angle or 15
        div_len = (r_exit - r_throat) / math.tan(math.radians(div_angle))
        nozzle_type_str = "conical"
    else:
        div_len = (r_exit - r_throat) / math.tan(math.radians(15)) * 0.8
        nozzle_type_str = "bell_rao"

    total_len = profile.chamber_length + conv_len + div_len

    lines = [
        f"// Rocket Nozzle - {nozzle_type_str}",
        f"// Generated by rocket-cea-gui",
        f"",
        f"// Parameters",
        f"chamber_radius = {r_chamber:.4f};",
        f"throat_radius = {r_throat:.4f};",
        f"exit_radius = {r_exit:.4f};",
        f"chamber_length = {profile.chamber_length:.4f};",
        f"convergence_angle = {conv_angle:.1f};",
        f"wall_thickness = {wall:.4f};",
        f"",
        f"conv_length = (chamber_radius - throat_radius) / tan(convergence_angle);",
        f"div_length = (exit_radius - throat_radius) / tan({profile.divergence_angle or 15:.1f});",
        f"total_length = chamber_length + conv_length + div_length;",
        f"",
        f"// Inner profile as 2D polygon (half-section)",
        f"inner_profile = [",
    ]

    if profile.nozzle_type == NozzleType.CONICAL:
        lines.extend([
            f"  [0, chamber_radius],",
            f"  [chamber_length, chamber_radius],",
            f"  [chamber_length + conv_length, throat_radius],",
            f"  [total_length, exit_radius],",
        ])
    else:
        points = _bell_inner_points(profile, n_points=20)
        for z, r in points:
            lines.append(f"  [{z:.4f}, {r:.4f}],")

    lines.extend([
        f"];",
        f"",
        f"// Nozzle as revolved solid",
        f"difference() {{",
        f"  // Outer wall",
        f"  rotate_extrude()",
        f"    offset(r = wall_thickness)",
        f"      polygon(inner_profile);",
        f"  // Inner bore",
        f"  rotate_extrude()",
        f"    polygon(inner_profile);",
        f"}}",
    ])

    return "\n".join(lines)


def _try_cadquery_available() -> bool:
    try:
        import cadquery
        return True
    except ImportError:
        return False


def generate_step(profile: NozzleProfile, output_dir: str) -> str | None:
    """Generate a STEP file using CadQuery. Returns filepath or None if CadQuery unavailable."""
    if not _try_cadquery_available():
        return None

    import cadquery as cq

    points = (
        _conical_inner_points(profile) if profile.nozzle_type == NozzleType.CONICAL
        else _bell_inner_points(profile)
    )

    # Filter out centerline points for actual profile (keep only r > 0)
    wall_points = [(z, r) for z, r in points if r > 0]

    # Build outer wall profile (offset by wall thickness)
    outer_wall_points = [(z, r + profile.wall_thickness) for z, r in wall_points]

    # Build outer solid: chamber back cap + outer wall
    outer_wire = cq.Workplane("XZ")
    # Start at chamber back face, outer radius
    outer_wire = outer_wire.moveTo(0, profile.chamber_radius + profile.wall_thickness)
    # Chamber back face center
    outer_wire = outer_wire.lineTo(0, 0)
    # Follow outer wall points
    for z, r in outer_wall_points:
        outer_wire = outer_wire.lineTo(z, r)
    # Close to axis at exit
    outer_wire = outer_wire.lineTo(outer_wall_points[-1][0], 0)
    # Close back to start along axis
    outer_wire = outer_wire.lineTo(0, 0).close()
    outer_solid = outer_wire.revolve(angleDegrees=360, axisStart=(0, 0, 0), axisEnd=(1, 0, 0))

    # Build inner solid (hollow bore)
    inner_wire = cq.Workplane("XZ")
    # Start at chamber back face, inner radius
    inner_wire = inner_wire.moveTo(0, profile.chamber_radius)
    # Chamber back face center
    inner_wire = inner_wire.lineTo(0, 0)
    # Follow inner wall points
    for z, r in wall_points:
        inner_wire = inner_wire.lineTo(z, r)
    # Close to axis at exit
    inner_wire = inner_wire.lineTo(wall_points[-1][0], 0)
    # Close back to start along axis
    inner_wire = inner_wire.lineTo(0, 0).close()
    inner_solid = inner_wire.revolve(angleDegrees=360, axisStart=(0, 0, 0), axisEnd=(1, 0, 0))

    # Cut inner from outer
    nozzle = outer_solid.cut(inner_solid)

    # Scale from inches to mm for STEP (standard CAD unit)
    outer_wall_points_mm = [(z * 25.4, (r + profile.wall_thickness) * 25.4) for z, r in wall_points]
    inner_wall_points_mm = [(z * 25.4, r * 25.4) for z, r in wall_points]
    chamber_r_mm = profile.chamber_radius * 25.4
    chamber_r_outer_mm = (profile.chamber_radius + profile.wall_thickness) * 25.4

    # Outer solid in mm
    outer_wire_mm = cq.Workplane("XZ")
    outer_wire_mm = outer_wire_mm.moveTo(0, chamber_r_outer_mm)
    outer_wire_mm = outer_wire_mm.lineTo(0, 0)
    for z, r in outer_wall_points_mm:
        outer_wire_mm = outer_wire_mm.lineTo(z, r)
    outer_wire_mm = outer_wire_mm.lineTo(outer_wall_points_mm[-1][0], 0)
    outer_wire_mm = outer_wire_mm.lineTo(0, 0).close()
    outer_solid_mm = outer_wire_mm.revolve(angleDegrees=360, axisStart=(0, 0, 0), axisEnd=(1, 0, 0))

    # Inner solid in mm
    inner_wire_mm = cq.Workplane("XZ")
    inner_wire_mm = inner_wire_mm.moveTo(0, chamber_r_mm)
    inner_wire_mm = inner_wire_mm.lineTo(0, 0)
    for z, r in inner_wall_points_mm:
        inner_wire_mm = inner_wire_mm.lineTo(z, r)
    inner_wire_mm = inner_wire_mm.lineTo(inner_wall_points_mm[-1][0], 0)
    inner_wire_mm = inner_wire_mm.lineTo(0, 0).close()
    inner_solid_mm = inner_wire_mm.revolve(angleDegrees=360, axisStart=(0, 0, 0), axisEnd=(1, 0, 0))

    nozzle_mm = outer_solid_mm.cut(inner_solid_mm)

    filepath = os.path.join(output_dir, f"nozzle_{uuid.uuid4().hex[:8]}.step")
    cq.exporters.export(nozzle_mm, filepath, cq.exporters.ExportTypes.STEP)
    return filepath


def generate_stl(profile: NozzleProfile, output_dir: str) -> str | None:
    """Generate an STL file using CadQuery. Returns filepath or None if CadQuery unavailable."""
    if not _try_cadquery_available():
        return None

    import cadquery as cq

    points = (
        _conical_inner_points(profile) if profile.nozzle_type == NozzleType.CONICAL
        else _bell_inner_points(profile)
    )

    # Filter out centerline points for actual profile (keep only r > 0)
    wall_points = [(z, r) for z, r in points if r > 0]

    # Build outer wall profile (offset by wall thickness)
    outer_wall_points = [(z, r + profile.wall_thickness) for z, r in wall_points]

    # Build outer solid
    outer_wire = cq.Workplane("XZ")
    outer_wire = outer_wire.moveTo(0, profile.chamber_radius + profile.wall_thickness)
    outer_wire = outer_wire.lineTo(0, 0)
    for z, r in outer_wall_points:
        outer_wire = outer_wire.lineTo(z, r)
    outer_wire = outer_wire.lineTo(outer_wall_points[-1][0], 0)
    outer_wire = outer_wire.lineTo(0, 0).close()
    outer_solid = outer_wire.revolve(angleDegrees=360, axisStart=(0, 0, 0), axisEnd=(1, 0, 0))

    # Build inner solid (hollow bore)
    inner_wire = cq.Workplane("XZ")
    inner_wire = inner_wire.moveTo(0, profile.chamber_radius)
    inner_wire = inner_wire.lineTo(0, 0)
    for z, r in wall_points:
        inner_wire = inner_wire.lineTo(z, r)
    inner_wire = inner_wire.lineTo(wall_points[-1][0], 0)
    inner_wire = inner_wire.lineTo(0, 0).close()
    inner_solid = inner_wire.revolve(angleDegrees=360, axisStart=(0, 0, 0), axisEnd=(1, 0, 0))

    # Cut inner from outer
    nozzle = outer_solid.cut(inner_solid)

    # STL stays in inches (native units)
    filepath = os.path.join(output_dir, f"nozzle_{uuid.uuid4().hex[:8]}.stl")
    cq.exporters.export(nozzle, filepath, cq.exporters.ExportTypes.STL)
    return filepath


# Storage for generated files
_generated_files: dict[str, dict[str, str]] = {}


def generate_nozzle(
    nozzle_type: NozzleType,
    chamber_diameter: float,
    chamber_length: float,
    wall_thickness: float,
    convergence_angle: float,
    divergence_angle: float | None = None,
    throat_diameter: float = 1.5,
    exit_diameter: float = 9.49,
    **kwargs,
) -> dict:
    """Generate all nozzle files. Returns dict with URLs and parameters."""
    if nozzle_type == NozzleType.CONICAL:
        profile = compute_conical_profile(
            chamber_diameter=chamber_diameter,
            throat_diameter=throat_diameter,
            exit_diameter=exit_diameter,
            chamber_length=chamber_length,
            convergence_angle=convergence_angle,
            divergence_angle=divergence_angle or 15.0,
            wall_thickness=wall_thickness,
        )
    else:
        profile = compute_bell_profile(
            chamber_diameter=chamber_diameter,
            throat_diameter=throat_diameter,
            exit_diameter=exit_diameter,
            chamber_length=chamber_length,
            convergence_angle=convergence_angle,
            wall_thickness=wall_thickness,
        )

    result_id = uuid.uuid4().hex[:8]
    tmp_dir = tempfile.mkdtemp(prefix="rocket_cea_cad_")

    # Generate OpenSCAD script
    scad_content = generate_openscad(profile)
    scad_path = os.path.join(tmp_dir, "nozzle.scad")
    with open(scad_path, "w") as f:
        f.write(scad_content)

    # Try CadQuery generation
    step_path = generate_step(profile, tmp_dir)
    stl_path = generate_stl(profile, tmp_dir)

    # Store generated files
    _generated_files[result_id] = {
        "scad": scad_path,
        "step": step_path or "",
        "stl": stl_path or "",
        "dir": tmp_dir,
    }

    return {
        "id": result_id,
        "stl_preview_url": f"/api/cad/files/{result_id}/preview.stl" if stl_path else "",
        "step_download_url": f"/api/cad/files/{result_id}/model.step" if step_path else "",
        "openscad_download_url": f"/api/cad/files/{result_id}/model.scad",
        "parameters": {
            "chamber_diameter": chamber_diameter,
            "chamber_length": chamber_length,
            "wall_thickness": wall_thickness,
            "throat_diameter": throat_diameter,
            "exit_diameter": exit_diameter,
            "convergence_angle": convergence_angle,
            "divergence_angle": divergence_angle,
            "nozzle_type": nozzle_type.value,
        },
    }


def get_file_path(result_id: str, filename: str) -> str | None:
    """Get the filesystem path for a generated file."""
    files = _generated_files.get(result_id)
    if not files:
        return None

    if filename == "model.scad":
        return files.get("scad")
    elif filename == "model.step":
        return files.get("step") or None
    elif filename == "preview.stl":
        return files.get("stl") or None
    return None