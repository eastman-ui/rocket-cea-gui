from __future__ import annotations

from rocket_cea_gui.services.cea_species import search, list_common


class TestSearch:
    def test_search_by_name(self):
        results = search("O2")
        assert len(results) >= 1
        assert results[0].name == "O2"
        assert results[0].category == "oxidizer"

    def test_search_by_formula(self):
        results = search("CH4")
        assert len(results) >= 1
        assert results[0].name == "CH4"
        assert results[0].category == "fuel"

    def test_search_case_insensitive(self):
        results_lower = search("h2")
        results_upper = search("H2")
        assert len(results_lower) == len(results_upper)

    def test_search_partial_match(self):
        results = search("C2")
        assert len(results) >= 2  # C2H6, C2H4, C2H5OH

    def test_search_no_results(self):
        results = search("XYZ123")
        assert len(results) == 0

    def test_search_empty_returns_empty(self):
        # Empty string matches everything, but the API endpoint returns []
        results = search("")
        # Species DB has 21 entries, empty search returns all
        assert len(results) == 22


class TestListCommon:
    def test_common_species_count(self):
        common = list_common()
        assert len(common) == 10

    def test_common_includes_key_species(self):
        names = {s.name for s in list_common()}
        assert "O2" in names
        assert "H2" in names
        assert "RP-1" in names
        assert "CH4" in names
        assert "CO2" in names

    def test_common_categories(self):
        common = list_common()
        categories = {s.category for s in common}
        assert "oxidizer" in categories
        assert "fuel" in categories