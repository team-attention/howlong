# Draft preregistration protocol V0

Status: not registered; design-freeze candidate; no frontier-model run has begun.

## Confirmatory scope

- One question, one primary closed-loop endpoint (OCAD), one direct shared-state
  diagnostic, H1 and H2 confirmatory, H3 exploratory.
- Environments: one rights-clear synthetic B2B SaaS and a clean CoffeeBench
  replication if its artifact license and compute budget pass review.
- Objective conditions: revenue, users/growth, compliance/trust. Cash/runway is a
  planned extension, not added after results without exploratory labeling.
- Families: at least one frontier API family and one open-weight family; exact
  versions and harnesses frozen before execution.
- Seeds: 12 common environment seeds; 3 model-sampling repeats per cell.

## Randomization and blinding

Condition order is randomized within seed. Objective labels are removed from
grader packets. Programmatic state outcomes are computed before any LLM judgment.
Two independent graders label process violations and divergence mechanisms; they
do not see scalar reward or model identity. Disagreement is adjudicated on a
separate pass with the original labels preserved.

## Leakage and confounds

- Public test prompts, gold actions, and verifier logic are not training data.
- One prompt template with a fixed objective JSON slot. The randomized treatment
  is the complete objective-message package: identifier, weights, target
  intensity, and paraphrase. Pure weight sensitivity is claimed only in cells
  where all other package fields are held fixed.
- Crossed paraphrase families and target intensity prevent wording/impossibility
  from masquerading as objective effects.
- Same state, tools, descriptions, budgets, temperature, stop criteria, counterpart
  policies, shock stream, and vector evaluator in matched cells.
- Model and harness are versioned as a joint unit; no “model-only” causal claim.
- Exploratory prompt or grader changes create a new protocol version.

## Analysis

The primary closed-loop estimator gives each objective pair equal weight within a
matched model/harness/scenario/seed cluster. Its baseline is a within-objective
U-statistic over independent sampling repeats and semantic paraphrases. Incomplete
or invalid trajectories receive a prespecified terminal category and remain in
the analysis. Uncertainty is clustered by scenario/seed. Model and environment
families are fixed case studies until there are enough independent levels for
random-effects inference.

The direct diagnostic compares first decisions and one-step action distributions
on an identical frozen reference-state bank, before state mediation. H2 uses
paired risk differences and stakeholder regret relative to feasible KPI-matched
benign policies or a calibration-set Pareto frontier. Control false discovery
across secondary endpoints. Report vector outcomes in raw units and in units
standardized from a frozen, disjoint calibration set.

With 12 seeds x 3 repeats, the pilot is designed to debug estimators and detect
only large effects, not to certify small effects. Before registration, freeze
alpha, target power, multiplicity family, assumed intra-cluster correlation,
baseline rare-violation prevalence, attrition rate, and minimum interesting
effects. Estimate nuisance quantities on disjoint calibration scenarios and use
cluster-level simulation to select the confirmatory sample size. Candidate
minimum effects are OCAD +0.15 over both repeat and paraphrase baselines or a
10-percentage-point excess constraint risk at matched KPI attainment.

## Grader reliability

Require Krippendorff's alpha or an appropriate categorical agreement statistic
with a clustered uncertainty interval. Alpha below 0.67 blocks headline process
claims; 0.67–0.8
requires caveated/dual reporting; above 0.8 passes the planned reliability gate.
Programmatic outcomes must reproduce exactly from saved terminal states.

## Rights, privacy, and cost

Newly authored synthetic/public artifacts only. Each source gets an access, modification,
redistribution, commercial-use, derivative, retention, and deletion receipt.
No Ralphthon participant/company record is authorized. API prompts and outputs
are reviewed for provider retention terms. Before paid execution, freeze episode
count, turns, token ceilings, provider prices, 20% retry ceiling, and obtain user
approval. No paid call is authorized by this protocol.

## Failure and reporting rules

All failed/invalid episodes remain in the ledger. Exclusions are mechanical and
prespecified in this draft. No best-seed reporting. Planned, simulated,
exploratory, and
confirmatory results are visibly separated. Null findings are publishable and do
not trigger objective/metric replacement.
