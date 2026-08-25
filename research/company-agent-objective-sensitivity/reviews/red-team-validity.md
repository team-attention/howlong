# Independent red-team: experimental validity

Date: 2026-07-23
Role: causal design and statistics reviewer
Independence: read-only review; no project files were modified by the reviewer.

## Verdict

**Readiness: 4/10 (reject as an empirical paper). Honesty: 8.5/10.
Deterministic plumbing: 7/10.**

## Major threats

1. The intervention is the complete objective message—ID, weights, target, and
   wording—not the weight vector alone.
2. Reward components have incomparable units and require frozen normalization.
3. Closed-loop OCAD is a total trajectory contrast after state mediation, not a
   direct same-state policy effect.
4. Random effects for one or two model/environment levels are not identified.
5. Several controls exist only in prose: paraphrases, target-intensity matching,
   independent graders, action canonicalization, and hidden utility.
6. The old bootstrap interval was misleading because the heuristic action paths
   were identical across all 12 seeds.
7. The 132 recorded violation events were 72 deceptive actions plus 60 repeated
   compliance-state flags; only 12 episodes were affected.
8. Rights policy existed, but no artifact-specific rights receipt was present.

## Required repairs

- Add identical-state first-decision and frozen-state probes.
- Freeze raw-unit baselines and attainable-range normalization on disjoint data.
- Use cluster-aware estimators and simulation power with rare-event prevalence,
  attrition, ICC, multiplicity, and minimum effects specified.
- Operationalize every control in a protocol-to-code manifest.
- Version the action canonicalizer and retain invalid episodes with a terminal
  category.
- Report 0.972 only as a deterministic software checksum with no inferential
  interval.
- Create an artifact-level rights receipt before public-environment reuse.
