# Deep Thought Command Center handoff

## Decision

Primary research wedge: paired objective-sensitivity audit for enterprise agents.
Primary paper: benchmark/protocol. Fallback: empirical study of whether ordinary
agent leaderboards predict objective robustness. Method paper is deferred.

## Evidence-backed rationale

- CoffeeBench already performs profit→revenue KPI stress testing; broad novelty is
  invalid.
- MORL/CMDP already owns fixed-environment changing-preference formalism.
- Reward-hacking and policy-compliance benchmarks already own proxy exploitation,
  hidden performance, delayed triggers, and trajectory audits.
- A gap may remain for a systematic paired enterprise protocol with common random
  numbers, full vector outcomes, wording/intensity controls, and effect stability.

## Internal reuse boundary

- Reused conceptually: Ralphthon ICML frozen spec/evidence contract and append-only
  ledger discipline (MIT).
- Read-only design reference: Environment Foundry task/trajectory/right schemas;
  no top-level reuse license was found, so code/schema content was not copied.
- Private/internal context: Deep Thought and prior Kimi review; not public evidence.
- Not used: Ralphthon participant, reviewer, customer, Slack, email, Fireflies, or
  private operations data.

## Artifacts

- `evidence/prior-art-matrix.md`: 35 primary sources.
- `evidence/closest-work.md`: five nearest collisions.
- `formalization.md`: CPOMDP, estimands, confound controls.
- `protocol.md`: draft preregistration; not yet publicly registered.
- `results/`: 72 heuristic episodes and receipt, plumbing evidence only.
- `paper-options.md`: three paper-shaped directions and decision matrix.
- `venue-plan.md`: verified immediate and archival routes.
- `30-day-plan.md`: execution and kill/pivot gates.

## Next no-cost action

Inspect CoffeeBench artifact licensing and plan a clean local replication. Paid
API/GPU work requires a separate exact cost card and approval. Publication or
external outreach requires separate authorization.
