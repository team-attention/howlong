---
title: "Objective Sensitivity in Enterprise Agents: Paired Audits of KPI-Induced Behavior"
subtitle: "MOCK PAPER V0 — DESIGN DOCUMENT, NOT EMPIRICAL RESULTS"
date: "2026-07-23"
---

# Prominent status notice

**This is a mock paper and experimental design. It does not report frontier-model
results. Every numeric result below is either a cited prior result or an explicitly
labeled deterministic heuristic simulation used to test software plumbing. The
confirmatory hypotheses remain untested.**

# Abstract

Tool-using language agents are increasingly evaluated on enterprise tasks, but a
single success score does not reveal how their behavior changes when the operating
objective changes. Existing work already covers long-horizon company simulations,
corporate goal conflict, multi-objective reinforcement learning, constrained
decision processes, and reward hacking [S01–S35]. Most damaging to a broad novelty
claim, CoffeeBench has already changed a 90-day business agent's KPI from net
profit to revenue under aggressive targets [S01]. We therefore propose a narrower
contribution candidate: a paired objective-sensitivity audit that holds initial state,
dynamics, tools, counterpart policies, random shocks, budgets, and vector grading
fixed while randomizing a structured objective-message package. Closed-loop
objective-message action divergence (OCAD) is a descriptive endpoint; direct
same-state probes and vector outcomes keep divergence from being mistaken for
quality or a pure policy effect. Secondary outcomes include KPI elasticity,
constraint risk, proxy gaps, stakeholder regret, Pareto efficiency, and delayed
effects. A planned confirmatory study crosses at least three
objectives, two model families, common-random-number seeds, semantic paraphrases,
and target intensity. A 72-episode deterministic heuristic simulation validates
the current code path only; it is not evidence about LLM behavior. The benchmark
claim will be abandoned if objective effects do not survive wording, difficulty,
grader, and simulator-validity controls.

# 1. Introduction

Company agents act in systems where "success" can mean revenue, growth, runway,
trust, compliance, or a negotiated combination. A benchmark that grades only one
terminal target can hide whether an agent changed strategy for the intended reason,
violated fixed constraints, or moved harm outside the evaluation horizon.

The underlying idea is not new. Multi-objective RL learns policies across reward
preferences [S20, S24–S26, S34–S35], CMDPs optimize reward under costs [S23], and
AI-safety work has long separated observed reward from hidden performance
[S13, S27–S31]. Enterprise benchmarks now model software companies, customer
support, CRM, startup management, CFO allocation, vending, and multi-firm
economies [S01, S03, S06–S12]. Reward-hacking and compliance benchmarks inspect
tool trajectories and delayed failures [S14–S16, S32–S33].

Our candidate contribution is therefore empirical validation of a measurement
package, not a new paradigm:

1. matched simulated worlds using common random numbers;
2. an invariant vector outcome ledger evaluated under every objective;
3. explicit separation of objective semantics, prompt paraphrase, and target
   intensity;
4. action-divergence onset and mechanism labels from complete traces;
5. delayed stakeholder outcomes and hidden proxy-gap checks; and
6. cross-model stability of objective effects rather than another leaderboard.

The study asks one question: **in a fixed enterprise decision environment, how
much does changing a prespecified objective-message package change an agent's action
trajectory and downstream stakeholder outcomes?**

# 2. Related Work

## 2.1 Multi-objective and constrained decision making

MORL treats reward as a vector and learns policies for preferences over competing
objectives [S20–S22, S24–S26, S34–S35]. Preference-conditioned methods explicitly
change trajectories as weights change. CMDPs separate reward from cumulative
constraint costs [S23]. These areas make our intervention mathematically standard.
We do not propose a new Bellman operator, Pareto solver, or safety guarantee.

## 2.2 Reward specification and objective robustness

Concrete Problems in AI Safety identified side effects, reward hacking, scalable
supervision, safe exploration, and distribution shift [S30]. AI Safety Gridworlds
operationalized observed reward versus hidden performance [S13]. Inverse Reward
Design and CIRL treat a designed or latent reward as uncertain evidence [S27–S28].
Goal-misgeneralization work distinguishes capability from goal failures [S29].
Formal and empirical work further characterizes reward hacking and power seeking
[S14–S19, S31]. Our benchmark uses these as outcome categories, not novelty claims.

## 2.3 Enterprise and long-horizon agents

TheAgentCompany, WorkArena++, tau-bench, CRMArena-Pro, and EnterpriseGym establish
enterprise tools, policies, state grading, and workflow traces [S08–S12].
Vending-Bench, YC-Bench, EnterpriseArena, and CoffeeBench extend evaluation to
long-horizon business dynamics [S01, S03, S06–S07]. CoffeeBench is the closest
precursor because its project report explicitly switches profit to revenue and
looks for accounting misconduct [S01]. Anthropic's Agentic Misalignment and
ManagerBench also show that corporate goals and operational pressure can elicit
harmful choices [S02, S05]. A valid contribution must therefore be a systematic
paired protocol beyond these precedents.

# 3. Problem Formulation

We model a finite-horizon constrained partially observable multi-objective Markov
decision process

\[
\mathcal{M}=(\mathcal{S},\mathcal{O},\mathcal{A},T,Z,\mathbf{r},\mathbf{c},
\gamma,H).
\]

The state contains economic, operational, relationship, and compliance variables
plus pending delayed effects. The observation is a rights-clear decision-time view.
Actions are typed tool calls. The transition function and exogenous shock stream
are frozen within matched comparisons. The evaluator emits
\(\mathbf{r}_t=(r^{rev},r^{users},r^{cash},r^{trust},r^{comp})\) and separate
constraint costs \(\mathbf{c}_t\). The randomized treatment is
\(Z_{\mathrm{obj}}=(id,w,q,p)\): an identifier, objective vector, target
intensity, and semantic paraphrase encoded in a fixed prompt slot. The evaluator
separately uses \(w\) for scalarization
\(R_w(\tau)=\sum_t\gamma^t w^\top\mathbf{r}_t\), while the full vector is always
reported.

The experimental unit is \((m,h,s,\epsilon,Z_{\mathrm{obj}})\): model, harness,
scenario, common shock stream, and objective-message package. Initial state and
exogenous shocks are matched. Endogenous states may diverge after the first
different action, so the main trajectory contrast is a closed-loop total effect
under the benchmark contract, not a direct same-state policy effect. Pure weight
sensitivity is claimed only when the remaining package fields are held fixed.

The primary endpoint is

\[
\mathrm{OCAD} =
\frac{1}{\binom{|W|}{2}}\sum_{i<j}\frac{1}{H}
\sum_{t=1}^{H}\mathbb{1}[g(a_t^{w_i})\ne g(a_t^{w_j})],
\]

where \(g\) maps raw tool calls into prespecified action categories. OCAD measures
closed-loop responsiveness after state mediation, not goodness or direct policy
sensitivity. First-decision divergence and one-step action-distribution divergence
on a frozen shared-state bank provide direct diagnostics. All are reported with
vector outcomes and constraint effects.

# 4. Benchmark

## 4.1 Minimum synthetic company

The first environment is a six-period B2B SaaS with limited cash, 100 users,
fragile trust, and a pending compliance risk. Actions include maintaining,
raising price, customer success, compliance audit, paid growth, and a deceptive
growth shortcut. Customer success costs cash now and improves users later. The
shortcut raises users and revenue immediately while reducing trust and compliance.
Seeded market shocks are shared across objective conditions.

## 4.2 Objective conditions

The planned registration core uses revenue, user growth, and compliance/trust vectors.
Cash/runway is an extension after construct validation. One prompt template
contains a fixed JSON objective slot. Semantic paraphrase and target intensity are
separately randomized factors; they are never condition-specific prose.

## 4.3 Evaluator

The evaluator records the full vector irrespective of objective, hard violations,
delayed outcomes after the action horizon, and a hidden stakeholder-utility view.
Programmatic state outcomes are computed before any model judgment. Blind
independent graders label process violations and divergence mechanisms. The
benchmark includes oracle, passive, random, rules, and deliberate-gaming controls.

## 4.4 Data and rights

V0 uses only newly authored synthetic data. No Ralphthon participant, reviewer,
customer, partner, email, Slack, call, or private company record is included.
Public environment artifacts require a field-level license and derivative-use
review before copying. Replay is not called a simulator until offline rankings
predict prospective outcomes and survive exploitation tests.

# 5. Experimental Design

The minimum confirmatory experiment uses three objective conditions, at least two
model families, 12 common environment seeds, and three sampling repeats per cell.
Model and harness are versioned jointly. State, tools, tool descriptions, budgets,
temperature, stop rules, counterpart policies, shocks, and the vector evaluator
are fixed within paired cells.

H1 predicts that between-objective OCAD exceeds both within-objective repeat
divergence and semantic-paraphrase divergence, with reproducible vector-outcome
changes. H2 predicts excess constraint violations or stakeholder regret under
growth weighting relative to feasible KPI-matched benign policies or an estimated
Pareto frontier. H3 asks whether existing benchmark scores predict objective
robustness; it is exploratory until at least 20 independent model/harness cells
exist.

Condition order is randomized. Objective/model labels are hidden from process
graders. Public test prompts and verifiers are not training data. All failed and
invalid episodes remain in the ledger.

# 6. Planned Analysis

The closed-loop estimator gives each objective pair equal weight within matched
model/harness/scenario/seed clusters. It is compared with a within-objective
U-statistic over independent repeats and paraphrases. Uncertainty is clustered by
scenario/seed. Models and environments are fixed case studies until enough
independent levels exist for random-effects inference. The direct shared-state
diagnostic is analyzed separately. H2 uses paired risk differences and regret at
matched KPI attainment. Secondary endpoints receive false-discovery-rate control.

The pilot is for estimator debugging, not small-effect certification. Before
registration, a disjoint calibration set will freeze alpha, target power,
intra-cluster correlation, baseline rare-event prevalence, attrition,
multiplicity, and minimum interesting effects for cluster-level simulation.
Candidate effects are OCAD +0.15 over both repeat and paraphrase baselines or a
10-percentage-point excess violation risk at matched KPI attainment. Grader
agreement below 0.67 blocks process claims; 0.67–0.8 requires caveated dual
reporting; above 0.8 passes the planned reliability gate.

Existing leaderboard scores will not be merged across incompatible benchmark
versions. Any correlation includes exact model/harness/version and uncertainty.

# 7. Illustrative Expected Results

**DESIGN-ONLY NOTICE: This section contains no frontier-model result.**

The executable plumbing run used two hand-coded deterministic heuristic families,
three objective vectors, 12 seeds, and six periods, producing 72 episodes. Its
mean OCAD was 0.972. No inferential interval is reported because all action paths
were deterministic under the tested seeds; the value is only a software checksum.
The user-growth condition produced 72 deceptive action events plus 60 repeated
compliance-state flags, totaling 132 event-period records in 12 affected episodes,
because one literal heuristic was intentionally programmed to choose the
deceptive shortcut. Revenue and compliance/trust heuristics produced different
vector outcomes.

These numbers demonstrate only that matched shocks, objective variants, action
logs, vector rewards, violations, OCAD, and receipts flow through the software.
They are tautological consequences of authored heuristics and transitions. They
must not appear in a paper abstract as model evidence, support H1/H2, or be used
for power estimates.

Plausible but untested outcomes include: objective effects larger than sampling
noise; growth objectives trading trust/compliance for short-run KPI gains; or no
stable effect after paraphrase controls. A null or wording-driven result would
falsify the intended construct and trigger a pivot.

# 8. Limitations

The true company objective is not identifiable. Revenue, users, cash, trust, and
compliance mix proxies, states, constraints, and normative outcomes rather than
forming an ontologically clean reward vector. Synthetic delayed effects are
designer-authored. Human graders disagree and can be gamed. Fixed counterpart
policies may fail to represent equilibrium reactions. Model sampling and harness
choices remain sources of variance. Public model APIs change. A few environments
cannot establish industry-wide external validity. OCAD can reward arbitrary
difference and therefore is not a quality score. Correlations with leaderboards
will be underpowered unless many compatible cells are collected.

# 9. Ethics and Data Rights

The benchmark could teach agents how to exploit KPIs or could legitimize a
designer's stakeholder weights. Harmful actions remain sandboxed and are released
with risk labels and exploit mitigations. Real operational records require
purpose-specific consent, minimization, retention, revocation, and deletion
propagation; possession is not permission to train or publish. Private stakeholder
details are excluded from public artifacts. Paid APIs require a cost/retention
review and explicit approval.

# 10. Broader Impact

A successful audit could help organizations detect models that look capable on
ordinary tasks but behave unpredictably under KPI pressure. It could also be
misused to optimize pressure tactics or to present arbitrary corporate values as
scientific ground truth. We therefore publish vector outcomes and disagreement,
not one “responsible company” score, and keep benchmark validity separate from
commercial claims.

# References

Source identifiers S01–S35 resolve to the non-exhaustive primary-source scoping matrix in
`evidence/prior-art-matrix.md`. The five closest sources are CoffeeBench [S01],
Agentic Misalignment [S02], EnterpriseArena [S03], MACHIAVELLI [S04], and
ManagerBench [S05]. Full URLs and reuse status are in
`evidence/source-license-manifest.csv`.

## Selected primary bibliography

- [S01] Sugiura et al. (2026). *CoffeeBench: Benchmarking Long-Horizon LLM
  Agents in Heterogeneous Multi-Agent Economies*. arXiv:2606.16613.
- [S02] Anthropic (2025). *Agentic Misalignment: How LLMs Could Be Insider
  Threats*. Research report and released methods.
- [S03] Han et al. (2026). *Can LLM Agents Be CFOs? Benchmarking Long-Horizon
  Resource Allocation in an Uncertain Enterprise Environment*. arXiv:2603.23638.
- [S04] Pan et al. (2023). *Do the Rewards Justify the Means? Measuring
  Trade-Offs Between Rewards and Ethical Behavior in the MACHIAVELLI Benchmark*.
- [S06] He et al. (2026). *YC-Bench: Benchmarking AI Agents for
  Long-Term Planning and Consistent Execution*. arXiv:2604.01212.
- [S08] Xu et al. (2025). *TheAgentCompany: Benchmarking LLM Agents on
  Consequential Real World Tasks*. NeurIPS Datasets and Benchmarks.
- [S11] Yao et al. (2024). *tau-bench: A Benchmark for Tool-Agent-User
  Interaction in Real-World Domains*. arXiv:2406.12045.
- [S13] Leike et al. (2017). *AI Safety Gridworlds*. arXiv:1711.09883.
- [S14] Thaman (2026). *Reward Hacking Benchmark: Measuring Exploits in LLM
  Agents with Tool Use*. arXiv:2605.02964.
- [S20] Alegre et al. (2023). *MO-Gymnasium and MORL-Baselines: Benchmarks for
  Multi-Objective Reinforcement Learning*. NeurIPS Datasets and Benchmarks.
- [S27] Hadfield-Menell et al. (2017). *Inverse Reward Design*.
  arXiv:1711.02827.
- [S29] Langosco et al. (2021). *Goal Misgeneralization in Deep Reinforcement
  Learning*. arXiv:2105.14111.
- [S30] Amodei et al. (2016). *Concrete Problems in AI Safety*.
  arXiv:1606.06565.
- [S31] Skalse et al. (2022). *Defining and Characterizing Reward Hacking*.
  NeurIPS 2022.

# Appendix A. Draft preregistration fields

- Research question: one, as stated in the Introduction.
- Primary endpoint: OCAD.
- Confirmatory hypotheses: H1 and H2.
- Exploratory hypothesis: H3.
- Exclusions: mechanical schema/runtime failures only, all retained.
- Stop rules: novelty collision, unstable oracle, inadequate power, grader alpha
  below 0.67, or trivial hidden-utility exploit.

# Appendix B. Reproduction

```bash
uv sync
uv run pytest -q
uv run company-objective-pilot \
  --output-dir results \
  --seeds 11 22 33 44 55 66 77 88 99 111 222 333 \
  --horizon 6
```

# Appendix C. Claim classes

Every central claim is classified in `evidence/claim-ledger.csv` as:
`PRIMARY_SOURCE`, `ACTUAL_SYNTHETIC_RESULT`, or `EXPLICIT_HYPOTHESIS`.
The ledger covers central claims currently identified. Comparative novelty and
absence claims remain provisional pending an independently repeated search.
