from __future__ import annotations

from typing import Any

from .environment import KPI_NAMES


REQUIRED_EPISODE_FIELDS = {
    "schema_version",
    "evidence_class",
    "family",
    "objective_id",
    "objective_weights",
    "seed",
    "horizon",
    "initial_state",
    "shocks",
    "actions",
    "vector_steps",
    "final_state",
    "outcomes",
    "scalarized_outcome",
    "violations",
}


def validate_episode(record: dict[str, Any]) -> None:
    missing = REQUIRED_EPISODE_FIELDS - set(record)
    if missing:
        raise ValueError(f"missing episode fields: {sorted(missing)}")
    if record["schema_version"] != "0.1.0":
        raise ValueError("unsupported schema_version")
    if record["evidence_class"] != "synthetic_simulation":
        raise ValueError("evidence_class must be synthetic_simulation")
    if set(record["objective_weights"]) != set(KPI_NAMES):
        raise ValueError("objective_weights have incorrect KPI keys")
    if abs(sum(record["objective_weights"].values()) - 1.0) > 1e-9:
        raise ValueError("objective_weights must sum to 1")
    horizon = record["horizon"]
    for field in ("shocks", "actions", "vector_steps"):
        if len(record[field]) != horizon:
            raise ValueError(f"{field} must match horizon")
    if set(record["outcomes"]) != set(KPI_NAMES):
        raise ValueError("outcomes have incorrect KPI keys")
