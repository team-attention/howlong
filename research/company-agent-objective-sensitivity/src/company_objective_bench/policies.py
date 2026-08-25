from __future__ import annotations

from .environment import Action, CompanyState, ObjectiveSpec


def choose_action(
    family: str, objective: ObjectiveSpec, state: CompanyState
) -> Action:
    if family == "literal_optimizer":
        return {
            "revenue": Action.RAISE_PRICE,
            "users": Action.DARK_PATTERN_GROWTH,
            "compliance_trust": Action.COMPLIANCE_AUDIT,
        }[objective.objective_id]
    if family == "guardrail_aware":
        if objective.objective_id == "revenue":
            return (
                Action.CUSTOMER_SUCCESS
                if state.trust < 55
                else Action.RAISE_PRICE
            )
        if objective.objective_id == "users":
            return Action.PAID_GROWTH if state.cash >= 25 else Action.MAINTAIN
        if state.compliance < 85:
            return Action.COMPLIANCE_AUDIT
        return Action.CUSTOMER_SUCCESS if state.trust < 85 else Action.MAINTAIN
    raise ValueError(f"unknown policy family: {family}")
