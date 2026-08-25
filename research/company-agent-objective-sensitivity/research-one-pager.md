# Research one-pager

## Question

In a fixed enterprise decision environment, how much does changing only the
declared KPI vector change an agent's action trajectory and downstream stakeholder
outcomes?

## Primary endpoint

**Closed-loop objective-message action divergence (OCAD):** for each matched
model/harness/seed, compute the mean pairwise normalized Hamming distance between
action-category trajectories under the prespecified objective conditions. This is
a descriptive total trajectory contrast after state mediation, not a direct
same-state causal effect or a quality score. First-decision and frozen
shared-observation probes estimate direct policy sensitivity separately.

## Hypotheses

1. Between-objective OCAD exceeds both within-objective repeat divergence and
   semantic-paraphrase divergence, with reproducible vector-outcome changes.
2. Growth-weighted objectives increase violations or stakeholder regret relative
   to feasible KPI-matched benign policies or the estimated Pareto frontier.
3. Existing benchmark performance weakly predicts objective robustness. This is
   exploratory until at least 20 independently scored model/harness cells exist.

## Contribution and nearest collision

The abstract mathematical operation is standard MORL/CMDP. Reward hacking,
corporate goal conflict, enterprise simulation, and trajectory compliance also
have strong precedents. CoffeeBench is the nearest collision: its authors already
changed net-profit KPI to revenue under aggressive targets in the same 90-day
economy. The candidate contribution to test is a systematic paired objective audit:
common random numbers, a full vector outcome ledger under every objective,
semantic-paraphrase and target-intensity controls, divergence-onset labels,
delayed externalities, and cross-model effect-sign/rank stability.

## Design

- Environment: synthetic resettable B2B SaaS first; CoffeeBench replication next.
- Objectives: revenue, users, cash/runway, trust/relationship, compliance.
- Fixed: initial state, dynamics, shocks, counterpart policies, tools, prompt
  template, action budget, sampling budget, evaluator vector, and termination.
- Varied: machine-readable objective weights. Paraphrase and intensity are
  separately randomized factors, never silently bundled.
- Minimum confirmatory study: 3 objective conditions, at least 2 model families,
  12 common-random-number seeds, 3 repeats per cell, blinded trajectory graders,
  programmatic outcome graders, and held-out scenarios.
- Analysis: seed/scenario-clustered paired contrasts, prespecified uncertainty
  intervals, multiplicity-controlled secondary endpoints, effect sizes, and
  seed-level plots. Model/environment effects remain fixed case studies until
  enough levels exist for defensible random-effects inference.

## Go/no-go

Proceed if objective effects replicate across paraphrases and at least two
environments, grader agreement is acceptable, and hidden outcomes resist trivial
gaming. Pivot to an evaluator-validity paper if effects disappear under wording
controls or are mostly grader artifacts. Kill the benchmark claim if CoffeeBench
plus one additional public environment already supports the complete paired
protocol before submission.
