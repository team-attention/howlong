# Protocol-to-code manifest

## Implemented and tested in V0

- Deterministic reset with common seeded shocks.
- Three objective-message records and two hand-coded policy families.
- Fixed typed action catalog and six-period transition loop.
- Full vector outcomes, hard-event records, delayed one-period effects.
- Raw action-category OCAD and a deterministic run receipt.
- JSON-schema validation and 16 unit/integration tests.

## Designed but not implemented

- Partially observed decision-time view.
- Crossed paraphrase and target-intensity randomization.
- Frozen reward-unit normalization and attainable-frontier calibration.
- Versioned action canonicalizer beyond literal action names.
- First-decision and frozen shared-state probes.
- Hidden stakeholder utility and post-horizon rollout.
- KPI-matched benign policies plus oracle/random/gaming controls.
- Blind independent graders and adjudication.
- Frontier/open-weight model harnesses and cost receipt.
- Second licensed environment and cluster-level power simulation.

## Gate consequence

G5 (schema, variants, validator, tests) passes for software plumbing. G6 passes as
a protocol-design checklist but **execution readiness remains on hold** until the
designed controls above are operational and independently verified.
