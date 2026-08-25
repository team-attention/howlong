from company_objective_bench.metrics import (
    objective_conditioned_action_divergence,
    paired_bootstrap_interval,
)


def test_ocad_is_zero_for_identical_trajectories():
    trajectories = {
        "revenue": ["maintain", "audit", "maintain"],
        "users": ["maintain", "audit", "maintain"],
        "compliance_trust": ["maintain", "audit", "maintain"],
    }

    assert objective_conditioned_action_divergence(trajectories) == 0.0


def test_ocad_is_one_when_every_pair_differs_at_every_step():
    trajectories = {
        "revenue": ["price", "price"],
        "users": ["growth", "growth"],
        "compliance_trust": ["audit", "audit"],
    }

    assert objective_conditioned_action_divergence(trajectories) == 1.0


def test_ocad_rejects_unmatched_horizons():
    trajectories = {"revenue": ["a"], "users": ["a", "b"]}

    try:
        objective_conditioned_action_divergence(trajectories)
    except ValueError as exc:
        assert "matched horizons" in str(exc)
    else:
        raise AssertionError("unmatched horizons must be rejected")


def test_paired_bootstrap_interval_is_deterministic_and_contains_mean():
    values = [0.1, 0.2, 0.3, 0.4]

    first = paired_bootstrap_interval(values, seed=9, draws=500)
    second = paired_bootstrap_interval(values, seed=9, draws=500)

    assert first == second
    assert first["lower"] <= first["mean"] <= first["upper"]
