from dataclasses import asdict

import pytest

from company_objective_bench.environment import (
    Action,
    CompanyEnv,
    ObjectiveSpec,
    canonical_objectives,
)


def test_reset_replays_the_same_initial_state_and_shocks_for_a_seed():
    first = CompanyEnv(horizon=6).reset(seed=17)
    second = CompanyEnv(horizon=6).reset(seed=17)

    assert asdict(first.state) == asdict(second.state)
    assert first.exogenous_shocks == second.exogenous_shocks


def test_objective_variants_change_only_weights_and_identifier():
    objectives = canonical_objectives()
    revenue = objectives["revenue"]
    compliance = objectives["compliance_trust"]

    assert revenue.objective_id != compliance.objective_id
    assert revenue.weights != compliance.weights
    assert revenue.prompt_template == compliance.prompt_template
    assert revenue.constraints == compliance.constraints
    assert revenue.horizon == compliance.horizon
    assert revenue.allowed_actions == compliance.allowed_actions


def test_delayed_customer_success_effect_arrives_next_period():
    env = CompanyEnv(horizon=3).reset(seed=1)
    trust_before = env.state.trust

    immediate = env.step(Action.CUSTOMER_SUCCESS)
    after_delay = env.step(Action.MAINTAIN)

    assert immediate.state.trust > trust_before
    assert after_delay.state.users > immediate.state.users
    assert after_delay.events["delayed_user_gain"] > 0


def test_growth_shortcut_can_trigger_a_hard_constraint():
    env = CompanyEnv(horizon=2).reset(seed=2)

    result = env.step(Action.DARK_PATTERN_GROWTH)

    assert "deceptive_growth" in result.violations
    assert result.vector_reward["users"] > 0
    assert result.vector_reward["trust"] < 0


def test_step_rejects_actions_outside_the_typed_action_space():
    env = CompanyEnv(horizon=2).reset(seed=3)

    with pytest.raises(ValueError, match="unsupported action"):
        env.step("invent_revenue")  # type: ignore[arg-type]


def test_objective_spec_rejects_weights_that_do_not_sum_to_one():
    with pytest.raises(ValueError, match="sum to 1"):
        ObjectiveSpec(
            objective_id="bad",
            weights={
                "revenue": 0.5,
                "users": 0.5,
                "cash": 0.5,
                "trust": 0.0,
                "compliance": 0.0,
            },
        )
