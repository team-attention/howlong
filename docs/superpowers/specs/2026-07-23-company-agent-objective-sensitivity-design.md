# Company-Agent Objective Sensitivity Benchmark Design

Date: 2026-07-23

## Decision

Build a synthetic, rights-clear benchmark paper prototype, not a method paper. The
benchmark holds the company state, transition code, observation template, tools,
action schema, random shocks, horizon, and vector evaluator fixed. The sole
experimental intervention is the declared objective vector. The first pilot uses
deterministic heuristic agent families to validate the causal plumbing; it is not
evidence about frontier models.

## Research core

- Research question: In a fixed enterprise decision environment, how much does
  changing only the declared KPI vector change an agent's action trajectory and
  downstream stakeholder outcomes?
- Primary endpoint: objective-conditioned action divergence (OCAD), the mean
  pairwise normalized Hamming distance between action-category trajectories for
  matched model family and seed.
- Confirmatory hypotheses:
  1. Between-objective OCAD exceeds within-objective repeat divergence.
  2. Growth-weighted objectives increase revenue/user outcomes but also increase
     constraint violations or stakeholder regret relative to compliance-first.
  3. Existing agent benchmark scores have weak predictive value for objective
     robustness; this remains exploratory until at least 20 independently scored
     model/harness configurations exist.

## Formal model

Use a finite-horizon constrained multi-objective POMDP. The environment emits a
vector outcome for revenue, users, cash, trust, and compliance, plus separately
typed hard-constraint costs. Objective weights scalarize the vector only after the
full vector is recorded. Prompt wording is generated from one template with only
the machine-readable weight vector changed.

## Components

1. Evidence layer: primary-source matrix, closest-work comparison, venue audit,
   source/license manifest, and claim ledger.
2. Environment layer: typed company state, fixed action enum, seeded exogenous
   shocks, delayed effects, vector reward, and constraint validator.
3. Evaluation layer: trajectory divergence, KPI outcomes, violations, stakeholder
   regret, Pareto dominance, and uncertainty intervals.
4. Research layer: preregistration-style protocol, three paper options, mock paper,
   red-team reviews, rebuttal, and 30-day execution plan.

## Pilot boundaries

- Synthetic B2B SaaS only; no participant, partner, customer, or private company
  data.
- Three objective vectors: revenue growth, user growth, and compliance/trust.
- Two heuristic agent families and 12 matched seeds.
- All results are labeled plumbing/simulation evidence.
- No paid API, GPU, W&B sync, or external state mutation.

## Testing and integrity

Tests must prove deterministic replay, identical shocks across objective
conditions, objective-only configuration diffs, delayed effects, hard-constraint
detection, metric bounds, and artifact schema validity. The final gate runs tests,
`git diff --check`, a secret-pattern scan, source/license checks, a claim-ledger
classification check, PDF text extraction, and rendered-page inspection.

## Rejected approaches

- Method-first reward ensemble: premature without a benchmark that demonstrates
  the failure.
- Real Ralphthon/company episodes: rights and counterfactual validity are not
  established.
- Single composite "responsible company score": it would hide the trade-offs the
  benchmark is intended to expose.
