from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scraper.moe_p1 import (
    extract_history_payload,
    load_existing_rows,
    merge_rows,
    normalize_rows,
    write_artifacts,
)


FIXTURE_PATH = Path("tests/fixtures/moe_p1_page.html")


class MoeP1ScraperTests(unittest.TestCase):
    def test_extract_history_payload_from_fixture(self) -> None:
        html = FIXTURE_PATH.read_text(encoding="utf8")
        payload = extract_history_payload(html)

        self.assertEqual(len(payload), 2)
        self.assertEqual(payload[0]["school"]["slug"], "north-vista-primary-school")

    def test_normalize_rows_preserves_fields_and_derivations(self) -> None:
        html = FIXTURE_PATH.read_text(encoding="utf8")
        payload = extract_history_payload(html)
        rows = normalize_rows(payload, scraped_at="2026-06-20T00:00:00+00:00")

        self.assertEqual(len(rows), 4)
        first_oversubscribed = next(
            row for row in rows if row["schoolSlug"] == "north-vista-primary-school" and row["phase"] == "2C"
        )

        self.assertTrue(first_oversubscribed["oversubscribed"])
        self.assertEqual(first_oversubscribed["vacancyDelta"], -18)
        self.assertEqual(
            first_oversubscribed["ballotingDetails"],
            "Conducted for: Singapore Citizen children within 1km.",
        )

        stable_row = next(row for row in rows if row["schoolSlug"] == "rosyth-school" and row["phase"] == "2B")
        self.assertIsNone(stable_row["ballotingRequired"])
        self.assertFalse(stable_row["oversubscribed"])

    def test_merge_rows_replaces_scraped_year_and_preserves_other_years(self) -> None:
        existing_rows = [
            {"year": "2024", "schoolName": "Legacy School", "phase": "2C"},
            {"year": "2025", "schoolName": "Outdated School", "phase": "2C"},
        ]
        new_rows = [
            {"year": "2025", "schoolName": "Fresh School", "phase": "2A"},
            {"year": "2025", "schoolName": "Fresh School", "phase": "2B"},
        ]

        merged = merge_rows(existing_rows, new_rows)

        self.assertEqual([row["schoolName"] for row in merged], ["Legacy School", "Fresh School", "Fresh School"])

    def test_write_artifacts_creates_manifest_and_year_files(self) -> None:
        html = FIXTURE_PATH.read_text(encoding="utf8")
        payload = extract_history_payload(html)
        rows = normalize_rows(payload, scraped_at="2026-06-20T00:00:00+00:00")

        with tempfile.TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir)
            manifest = write_artifacts(
                rows,
                scraped_at="2026-06-20T00:00:00+00:00",
                output_dir=output_dir,
            )

            self.assertEqual(manifest["years"], ["2025"])
            self.assertTrue((output_dir / "all.json").exists())
            self.assertTrue((output_dir / "all.csv").exists())
            self.assertTrue((output_dir / "2025.json").exists())
            self.assertTrue((output_dir / "2025.csv").exists())

            saved_rows = load_existing_rows(output_dir)
            self.assertEqual(len(saved_rows), 4)

            saved_manifest = json.loads((output_dir / "manifest.json").read_text(encoding="utf8"))
            self.assertEqual(saved_manifest["rowsByYear"]["2025"], 4)


if __name__ == "__main__":
    unittest.main()
