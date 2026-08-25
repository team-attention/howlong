# Three paper options

## 초록이란?

초록은 논문의 예고편이다. 무엇이 문제인지, 무엇을 만들거나 실험했는지, 어떤
결과를 얻었는지, 왜 중요한지를 짧게 말한다. 아직 실험하지 않은 결과를 초록에
사실처럼 쓰면 안 된다. 아래 초록은 모두 **설계 초록**이며 결과 문장은 가설 또는
계획으로만 표현했다.

## A — Primary: benchmark paper

**Title:** Objective Sensitivity in Enterprise Agents: Paired
Audits of KPI-Induced Behavior

**One-sentence claim:** A paired audit can estimate direct shared-state and
closed-loop differences attributable to randomized objective messages under
explicit invariance assumptions.

**Design abstract:** Tool-using language agents are increasingly evaluated on
enterprise tasks, but a single task-success score does not reveal how their
behavior changes when the operating objective changes. We propose a paired
objective-sensitivity audit that holds initial state, dynamics, tools, counterpart
policies, random shocks, and vector grading fixed while randomizing a structured
objective-message package. The benchmark records complete trajectories,
closed-loop action divergence, direct shared-state probes, KPI elasticity,
constraint violations, proxy gaps, and delayed stakeholder outcomes. A
confirmatory study will cross at
least three objectives, two model families, common-random-number seeds, semantic
paraphrases, and target intensities. We will test whether objective effects exceed
within-condition stochastic variation and whether existing benchmark rankings
predict objective robustness. This is a planned benchmark study; no frontier-model
result is claimed in V0.

- Novelty: candidate paired measurement package, not KPI switching or new theory.
- Minimum experiment: CoffeeBench replication plus one synthetic CPOMDP,
  3 objectives x 2+ families x 12 seeds x 3 repeats.
- Data: public/synthetic environments, full traces, blind process labels.
- Likely reject: CoffeeBench/MORL seen as sufficient prior art; synthetic
  externalities unvalidated.
- Save condition: estimand registered before model data, paraphrase controls,
  expert calibration,
  two-environment replication, public harness.

## B — Fallback: empirical science paper

**Title:** Do Agent Leaderboards Predict Objective Robustness?

**One-sentence claim:** Standard task-success rankings may fail to predict how
consistently agent behavior responds to objective changes without violating fixed
constraints.

**Design abstract:** Existing agent leaderboards primarily rank task completion,
while deployment requires agents to remain predictable under changing business
objectives. We define objective-response signatures from matched enterprise
trajectories and plan to compare their stability across model and harness families.
The study will estimate whether standard benchmark scores predict action
divergence, constraint-risk elasticity, and delayed-outcome robustness after
controlling for model version and harness. Correlations will be treated as
exploratory until at least 20 independent configurations are available and will
not combine incompatible leaderboards. The central falsification is that ordinary
benchmark performance explains most variation in objective robustness. This is a
planned empirical study; V0 contains no such correlation result.

- Novelty: new construct-validity question.
- Minimum experiment: 20+ model/harness cells with matched external scores.
- Data: benchmark receipts with exact versions and our paired trajectories.
- Likely reject: underpowered correlations and benchmark-setting mismatch.
- Save condition: larger multi-lab evaluation or hierarchical meta-analysis.

## C — Method paper

**Title:** Uncertainty-Aware Stakeholder Verification for Enterprise Agents

**One-sentence claim:** A vector evaluator with uncertainty-triggered human review
may reduce proxy gaming compared with a single KPI reward.

**Design abstract:** Scalar enterprise KPIs can reward actions that harm unmeasured
stakeholders or exploit evaluator blind spots. We propose an evaluator that
maintains separate outcome, constraint, stakeholder, and temporal components,
abstains when components are poorly identified, and routes high-disagreement
episodes to independent review. The method would be compared with single-KPI,
fixed-weight vector, and hard-constraint baselines on held-out exploitation
scenarios. The main endpoint would be exploit success at matched legitimate task
performance. This direction remains conditional on the benchmark first
demonstrating a stable specification failure; no method claim is made in V0.

- Novelty: possible method, currently speculative.
- Minimum experiment: adversarial exploitation suite and calibrated uncertainty.
- Data: adjudicated trajectory pairs and held-out exploit mechanisms.
- Likely reject: evaluator merely encodes designer preferences and is itself
  gameable.
- Save condition: benchmark-first failure, ablations, adversarial holdout, human
  agreement study.

## Decision matrix (1 low, 5 high)

| Option | Novelty | Feasibility | Business synergy | Aug-2026 workshop | Total |
|---|---:|---:|---:|---:|---:|
| A benchmark | 2 | 4 | 5 | 5 | 16 |
| B empirical | 4 | 2 | 4 | 2 | 12 |
| C method | 3 | 1 | 5 | 1 | 10 |

Recommendation: A is the primary design, but empirical submission remains on
hold until its save conditions pass. B is the fallback. C is a post-benchmark
program, not the current submission.
