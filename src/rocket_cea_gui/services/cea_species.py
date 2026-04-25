from __future__ import annotations
from ..api.models import SpeciesSearchResult

_SPECIES_DB: list[SpeciesSearchResult] = [
    SpeciesSearchResult(name="O2", formula="O2", category="oxidizer", molecular_weight=32.00),
    SpeciesSearchResult(name="N2O4", formula="N2O4", category="oxidizer", molecular_weight=92.01),
    SpeciesSearchResult(name="H2O2", formula="H2O2", category="oxidizer", molecular_weight=34.01),
    SpeciesSearchResult(name="N2O", formula="N2O", category="oxidizer", molecular_weight=44.01),
    SpeciesSearchResult(name="O3", formula="O3", category="oxidizer", molecular_weight=48.00),
    SpeciesSearchResult(name="H2", formula="H2", category="fuel", molecular_weight=2.02),
    SpeciesSearchResult(name="RP-1", formula="CH1.92", category="fuel", molecular_weight=12.96),
    SpeciesSearchResult(name="CH4", formula="CH4", category="fuel", molecular_weight=16.04),
    SpeciesSearchResult(name="C2H6", formula="C2H6", category="fuel", molecular_weight=30.07),
    SpeciesSearchResult(name="C2H4", formula="C2H4", category="fuel", molecular_weight=28.05),
    SpeciesSearchResult(name="C3H8", formula="C3H8", category="fuel", molecular_weight=44.10),
    SpeciesSearchResult(name="C2H5OH", formula="C2H6O", category="fuel", molecular_weight=46.07),
    SpeciesSearchResult(name="H", formula="H", category="element", molecular_weight=1.01),
    SpeciesSearchResult(name="C", formula="C", category="element", molecular_weight=12.01),
    SpeciesSearchResult(name="O", formula="O", category="element", molecular_weight=16.00),
    SpeciesSearchResult(name="N", formula="N", category="element", molecular_weight=14.01),
    SpeciesSearchResult(name="Al", formula="Al", category="element", molecular_weight=26.98),
    SpeciesSearchResult(name="CO2", formula="CO2", category="product", molecular_weight=44.01),
    SpeciesSearchResult(name="CO", formula="CO", category="product", molecular_weight=28.01),
    SpeciesSearchResult(name="H2O", formula="H2O", category="product", molecular_weight=18.02),
    SpeciesSearchResult(name="OH", formula="OH", category="product", molecular_weight=17.01),
]


def search(q: str) -> list[SpeciesSearchResult]:
    q_lower = q.lower()
    return [s for s in _SPECIES_DB if q_lower in s.name.lower() or q_lower in s.formula.lower()]


def list_common() -> list[SpeciesSearchResult]:
    common_names = {"O2", "N2O4", "H2O2", "H2", "RP-1", "CH4", "Al", "N2", "CO2", "CO"}
    return [s for s in _SPECIES_DB if s.name in common_names]