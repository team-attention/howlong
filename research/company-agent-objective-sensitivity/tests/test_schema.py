import json
from pathlib import Path

import pytest

from company_objective_bench.validation import validate_episode


ROOT = Path(__file__).resolve().parents[1]


def test_generated_episode_passes_schema_validator():
    first = json.loads(
        (ROOT / "results" / "sample-episodes.jsonl")
        .read_text(encoding="utf-8")
        .splitlines()[0]
    )

    validate_episode(first)


def test_schema_validator_rejects_unclassified_evidence():
    record = json.loads(
        (ROOT / "results" / "sample-episodes.jsonl")
        .read_text(encoding="utf-8")
        .splitlines()[0]
    )
    record["evidence_class"] = "frontier_result"

    with pytest.raises(ValueError, match="evidence_class"):
        validate_episode(record)


def test_json_schema_documents_are_parseable_and_versioned():
    for path in (ROOT / "schemas").glob("*.json"):
        payload = json.loads(path.read_text(encoding="utf-8"))
        assert payload["$schema"] == "https://json-schema.org/draft/2020-12/schema"
        assert payload["$id"].startswith("https://example.org/company-objective/")
