from company_objective_bench.runner import run_factorial_pilot


def test_factorial_pilot_has_complete_matched_cells():
    records, summary = run_factorial_pilot(seeds=[1, 2], horizon=4)

    assert len(records) == 2 * 3 * 2
    assert {
        (record["family"], record["objective_id"], record["seed"])
        for record in records
    } == {
        (family, objective, seed)
        for family in ("literal_optimizer", "guardrail_aware")
        for objective in ("revenue", "users", "compliance_trust")
        for seed in (1, 2)
    }
    assert len(summary["ocad_by_family_seed"]) == 4


def test_factorial_pilot_reuses_shocks_across_objectives():
    records, _ = run_factorial_pilot(seeds=[7], horizon=3)
    literal = [
        record for record in records if record["family"] == "literal_optimizer"
    ]

    assert len({tuple(record["shocks"]) for record in literal}) == 1


def test_pilot_records_are_explicitly_labeled_as_simulation():
    records, summary = run_factorial_pilot(seeds=[5], horizon=2)

    assert all(record["evidence_class"] == "synthetic_simulation" for record in records)
    assert summary["evidence_class"] == "synthetic_simulation"
    assert summary["not_frontier_model_evidence"] is True
    assert summary["ocad_descriptive"]["inferential_interval"] is None
    assert "ocad_interval" not in summary
