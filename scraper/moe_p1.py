from __future__ import annotations

import csv
import json
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from json import JSONDecodeError
from pathlib import Path
from typing import Any

SOURCE_URL = (
    "https://www.moe.gov.sg/primary/p1-registration/past-vacancies-and-balloting-data"
)
DEFAULT_OUTPUT_DIR = Path("public/data")
PHASE_ORDER = {"0": 0, "1": 1, "2A": 2, "2B": 3, "2C": 4, "2CS": 5}
CSV_FIELDNAMES = [
    ("year", "Year"),
    ("schoolName", "School Name"),
    ("schoolSlug", "School Slug"),
    ("schoolAreaId", "School Area ID"),
    ("phase", "Phase"),
    ("totalVacancies", "Total Vacancies"),
    ("totalApplicants", "Total Applicants"),
    ("ballotingRequired", "Balloting Required"),
    ("vacanciesBalloted", "Vacancies Balloted"),
    ("applicantsBalloted", "Applicants Balloted"),
    ("prCap", "PR Cap"),
    ("remarks", "Remarks"),
    ("ballotingDetails", "Balloting Details"),
    ("sourceUrl", "Source URL"),
    ("scrapedAt", "Scraped At"),
    ("vacancyDelta", "Vacancy Delta"),
    ("utilisationRate", "Utilisation Rate"),
    ("oversubscribed", "Oversubscribed"),
]


@dataclass
class ScrapeResult:
    rows: list[dict[str, Any]]
    scraped_at: str
    source_url: str
    years: list[str]
    fetch_mode: str


def _coerce_int(value: Any) -> int:
    if value in (None, ""):
        return 0
    return int(value)


def _coerce_bool(value: Any) -> bool | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() == "true"
    return bool(value)


def _extract_balanced_json_array(text: str, start_index: int) -> str:
    depth = 0
    in_string = False
    escape_next = False

    for index in range(start_index, len(text)):
        char = text[index]

        if escape_next:
            escape_next = False
            continue

        if char == "\\":
            escape_next = True
            continue

        if char == '"':
            in_string = not in_string
            continue

        if in_string:
            continue

        if char == "[":
          depth += 1
        elif char == "]":
          depth -= 1
          if depth == 0:
            return text[start_index : index + 1]

    raise ValueError("Could not locate balanced JSON array in HTML payload")


def extract_history_payload(html: str) -> list[dict[str, Any]]:
    markers = [
        "schoolData",
        "p1_registration_history_data",
    ]

    for marker in markers:
        marker_index = html.find(marker)
        if marker_index == -1:
            continue

        fragment = html[marker_index:]
        normalized_index = fragment.find(marker)
        if normalized_index == -1:
            continue

        array_start = fragment.find("[", normalized_index)
        if array_start == -1:
            continue

        payload_text = _extract_balanced_json_array(fragment, array_start)
        try:
            payload = json.loads(payload_text)
        except JSONDecodeError:
            decoded_payload_text = json.loads(f'"{payload_text}"')
            payload = json.loads(decoded_payload_text)

        if isinstance(payload, list):
            return payload

    raise ValueError("Embedded P1 registration payload was not found")


def _iter_school_records(payload: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []

    for item in payload:
        if not isinstance(item, dict):
            continue

        if "phase_items" in item and "school" in item:
            records.append(item)
            continue

        nested = item.get("school_name_folders")
        if isinstance(nested, list):
            for child in nested:
                if isinstance(child, dict) and "phase_items" in child and "school" in child:
                    records.append(child)

    return records


def normalize_rows(
    school_records: list[dict[str, Any]],
    *,
    scraped_at: str,
    source_url: str = SOURCE_URL,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for school_record in school_records:
        school = school_record.get("school") or {}
        phase_items = school_record.get("phase_items") or []

        for phase_item in phase_items:
            phase_data = phase_item.get("school_phase_item_id") or {}
            total_vacancies = _coerce_int(phase_data.get("total_vacancies"))
            total_applicants = _coerce_int(phase_data.get("total_applicants"))
            balloting_required = _coerce_bool(phase_data.get("balloting_required"))
            vacancy_delta = total_vacancies - total_applicants

            if total_vacancies <= 0:
                utilisation_rate = 0.0 if total_applicants == 0 else None
            else:
                utilisation_rate = round(total_applicants / total_vacancies, 4)

            rows.append(
                {
                    "year": str(phase_data.get("year", "")),
                    "schoolName": str(
                        school.get("school_name")
                        or phase_data.get("school_name")
                        or ""
                    ),
                    "schoolSlug": str(school.get("slug") or ""),
                    "schoolAreaId": (
                        int(school["school_area"])
                        if school.get("school_area") not in (None, "")
                        else None
                    ),
                    "phase": str(phase_data.get("phase", "")),
                    "totalVacancies": total_vacancies,
                    "totalApplicants": total_applicants,
                    "ballotingRequired": balloting_required,
                    "vacanciesBalloted": _coerce_int(
                        phase_data.get("vacancies_balloted")
                    ),
                    "applicantsBalloted": _coerce_int(
                        phase_data.get("applicants_balloted")
                    ),
                    "prCap": str(phase_data.get("pr_cap") or ""),
                    "remarks": str(phase_data.get("remarks") or ""),
                    "ballotingDetails": str(
                        phase_data.get("balloting_content_copy") or ""
                    ),
                    "sourceUrl": source_url,
                    "scrapedAt": scraped_at,
                    "vacancyDelta": vacancy_delta,
                    "utilisationRate": utilisation_rate,
                    "oversubscribed": total_applicants > total_vacancies,
                }
            )

    rows.sort(
        key=lambda row: (
            row["year"],
            row["schoolName"],
            PHASE_ORDER.get(row["phase"], 999),
            row["phase"],
        )
    )
    return rows


def merge_rows(existing_rows: list[dict[str, Any]], new_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_year: dict[str, list[dict[str, Any]]] = defaultdict(list)

    for row in existing_rows:
        by_year[str(row["year"])].append(row)

    scraped_years = {str(row["year"]) for row in new_rows}
    for year in scraped_years:
        by_year.pop(year, None)

    for row in new_rows:
        by_year[str(row["year"])].append(row)

    merged: list[dict[str, Any]] = []
    for year in sorted(by_year):
        year_rows = sorted(
            by_year[year],
            key=lambda row: (
                row["schoolName"],
                PHASE_ORDER.get(row["phase"], 999),
                row["phase"],
            ),
        )
        merged.extend(year_rows)

    return merged


def load_existing_rows(output_dir: Path = DEFAULT_OUTPUT_DIR) -> list[dict[str, Any]]:
    all_json_path = output_dir / "all.json"
    if not all_json_path.exists():
        return []

    return json.loads(all_json_path.read_text(encoding="utf8"))


def _write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf8")


def _write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[label for _, label in CSV_FIELDNAMES],
            extrasaction="ignore",
        )
        writer.writeheader()

        for row in rows:
            writer.writerow(
                {
                    label: row.get(key)
                    if row.get(key) is not None
                    else ""
                    for key, label in CSV_FIELDNAMES
                }
            )


def write_artifacts(
    rows: list[dict[str, Any]],
    *,
    scraped_at: str,
    source_url: str = SOURCE_URL,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)

    rows_by_year: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        rows_by_year[str(row["year"])].append(row)

    manifest = {
        "generatedAt": scraped_at,
        "sourceUrl": source_url,
        "years": sorted(rows_by_year),
        "totalRows": len(rows),
        "rowsByYear": {year: len(year_rows) for year, year_rows in rows_by_year.items()},
    }

    _write_json(output_dir / "manifest.json", manifest)
    _write_json(output_dir / "all.json", rows)
    _write_csv(output_dir / "all.csv", rows)

    for year, year_rows in rows_by_year.items():
        _write_json(output_dir / f"{year}.json", year_rows)
        _write_csv(output_dir / f"{year}.csv", year_rows)

    return manifest


def _coerce_html(response: Any) -> str:
    candidate_attributes = ("html", "html_content", "text", "content", "body")

    for attribute in candidate_attributes:
        value = getattr(response, attribute, None)
        if callable(value):
            try:
                value = value()
            except TypeError:
                continue

        if isinstance(value, bytes):
            return value.decode("utf8", errors="ignore")
        if isinstance(value, str) and value:
            return value

    return str(response)


def fetch_page_html(source_url: str = SOURCE_URL) -> tuple[str, str]:
    try:
        from scrapling.fetchers import DynamicFetcher, Fetcher
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "Scrapling fetchers are not installed. Run `pip install \"scrapling[fetchers]\"` "
            "and `scrapling install` first."
        ) from exc

    response = Fetcher.get(source_url)
    html = _coerce_html(response)

    try:
        extract_history_payload(html)
        return html, "fetcher"
    except ValueError:
        dynamic_response = DynamicFetcher.fetch(source_url, headless=True, network_idle=True)
        dynamic_html = _coerce_html(dynamic_response)
        extract_history_payload(dynamic_html)
        return dynamic_html, "dynamic-fetcher"


def scrape(source_url: str = SOURCE_URL) -> ScrapeResult:
    html, fetch_mode = fetch_page_html(source_url)
    payload = extract_history_payload(html)
    school_records = _iter_school_records(payload)
    scraped_at = datetime.now(timezone.utc).isoformat()
    rows = normalize_rows(school_records, scraped_at=scraped_at, source_url=source_url)
    years = sorted({row["year"] for row in rows})

    return ScrapeResult(
        rows=rows,
        scraped_at=scraped_at,
        source_url=source_url,
        years=years,
        fetch_mode=fetch_mode,
    )


def refresh_artifacts(output_dir: Path = DEFAULT_OUTPUT_DIR) -> dict[str, Any]:
    scrape_result = scrape()
    existing_rows = load_existing_rows(output_dir)
    merged_rows = merge_rows(existing_rows, scrape_result.rows)
    manifest = write_artifacts(
        merged_rows,
        scraped_at=scrape_result.scraped_at,
        source_url=scrape_result.source_url,
        output_dir=output_dir,
    )
    manifest["fetchMode"] = scrape_result.fetch_mode
    return manifest
