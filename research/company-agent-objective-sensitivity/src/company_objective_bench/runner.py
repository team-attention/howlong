from __future__ import annotations

import argparse
from dataclasses import asdict, replace
import json
from pathlib import Path
from statistics import fmean
from typing import Iterable

from .environment import CompanyEnv, KPI_NAMES, canonical_objectives
from .metrics import objective_conditioned_action_divergence
from .policies import choose_action


POLICY_FAMILIES = ("literal_optimizer", "guardrail_aware")


def run_factorial_pilot(
    seeds: Iterable[int], horizon: int = 6
) -> tuple[list[dict], dict]:
    records: list[dict] = []
    seed_list = list(seeds)
    objectives = {
        key: replace(value, horizon=horizon)
        for key, value in canonical_objectives().items()
    }
    for family in POLICY_FAMILIES:
        for objective in objectives.values():
            for seed in seed_list:
                env = CompanyEnv(horizon=horizon).reset(seed)
                initial = asdict(env.state)
                actions: list[str] = []
                violation_log: list[dict] = []
                vector_steps: list[dict[str, float]] = []
                for period in range(horizon):
                    action = choose_action(family, objective, env.state)
                    result = env.step(action)
                    actions.append(action.value)
                    vector_steps.append(result.vector_reward)
                    if result.violations:
                        violation_log.append(
                            {"period": period, "types": list(result.violations)}
                        )
                final = asdict(env.state)
                outcomes = {
                    key: final[key] - initial[key] for key in KPI_NAMES
                }
                scalarized = sum(
                    objective.weights[key] * outcomes[key] for key in KPI_NAMES
                )
                records.append(
                    {
                        "schema_version": "0.1.0",
                        "evidence_class": "synthetic_simulation",
                        "family": family,
                        "objective_id": objective.objective_id,
                        "objective_weights": dict(objective.weights),
                        "seed": seed,
                        "horizon": horizon,
                        "initial_state": initial,
                        "shocks": list(env.exogenous_shocks),
                        "actions": actions,
                        "vector_steps": vector_steps,
                        "final_state": final,
                        "outcomes": outcomes,
                        "scalarized_outcome": scalarized,
                        "violations": violation_log,
                    }
                )

    ocad_rows = []
    for family in POLICY_FAMILIES:
        for seed in seed_list:
            matched = {
                record["objective_id"]: record["actions"]
                for record in records
                if record["family"] == family and record["seed"] == seed
            }
            ocad_rows.append(
                {
                    "family": family,
                    "seed": seed,
                    "ocad": objective_conditioned_action_divergence(matched),
                }
            )
    ocad_values = [row["ocad"] for row in ocad_rows]
    summary = {
        "schema_version": "0.1.0",
        "evidence_class": "synthetic_simulation",
        "not_frontier_model_evidence": True,
        "design": {
            "families": list(POLICY_FAMILIES),
            "objectives": list(objectives),
            "seeds": seed_list,
            "horizon": horizon,
            "single_intervention": "objective_weights_and_id",
        },
        "ocad_by_family_seed": ocad_rows,
        "ocad_descriptive": {
            "mean": fmean(ocad_values),
            "unique_values": sorted(set(ocad_values)),
            "inferential_interval": None,
            "note": (
                "Deterministic software checksum only. Seeds do not induce "
                "action-path variation in the authored heuristics."
            ),
        },
        "total_violations": sum(
            len(entry["types"])
            for record in records
            for entry in record["violations"]
        ),
    }
    return records, summary


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--seeds", type=int, nargs="+", default=list(range(12)))
    parser.add_argument("--horizon", type=int, default=6)
    args = parser.parse_args()
    records, summary = run_factorial_pilot(args.seeds, args.horizon)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    episodes_path = args.output_dir / "sample-episodes.jsonl"
    receipt_path = args.output_dir / "pilot-receipt.json"
    episodes_path.write_text(
        "".join(json.dumps(record, sort_keys=True) + "\n" for record in records),
        encoding="utf-8",
    )
    receipt_path.write_text(
        json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {"episodes": len(records), "ocad_mean": summary["ocad_descriptive"]["mean"]}
        )
    )


if __name__ == "__main__":
    main()
