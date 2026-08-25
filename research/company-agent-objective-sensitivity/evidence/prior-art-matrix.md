# Non-exhaustive primary-source scoping matrix

This matrix is a dated scoping review, not a systematic review or proof of
priority. “Difference” records a candidate distinction observed in the cited
version, not an assertion that no other paper contains the feature. Absence and
novelty claims remain provisional until the reproducible search protocol and
closest-work checks are independently repeated.

Snapshot: 2026-07-23. Default hypothesis: the idea is common until shown
otherwise. “Difference” is a candidate distinction, not a priority claim.

| ID | Primary source | Setting / contribution | Overlap | Material difference |
|---|---|---|---|---|
| S01 | [CoffeeBench](https://arxiv.org/abs/2606.16613), [project](https://pub.sakana.ai/coffeebench/) | 90-day, six-firm coffee economy; fixed comparison firms; full tools/KPIs | Long-horizon business agent; project explicitly changes profit KPI to revenue under “at all costs” pressure | In the reviewed v1/project page, we identified an exploratory switch rather than a registered factorial paired response surface |
| S02 | [Agentic Misalignment](https://www.anthropic.com/research/agentic-misalignment) | Fictional corporate agents; multiple goals/conflict/threat; 16 models | Same corporate setup, varied goals, harmful behavior, cross-model analysis | Short, adversarial binary scenarios rather than persistent economic transitions |
| S03 | [EnterpriseArena](https://arxiv.org/abs/2603.23638) | 132-month partially observable CFO simulator with delayed resource consequences | Enterprise dynamics, tools, cross-model failures, long horizon | Does not systematically intervene on KPI vector |
| S04 | [MACHIAVELLI](https://arxiv.org/abs/2304.03279) | 134 long-horizon games; reward, ethics, power, welfare | Achievement vs harm and Pareto trade-offs | Not enterprise operations or paired KPI interventions |
| S05 | [ManagerBench](https://arxiv.org/abs/2510.00857) | Managerial goal attainment versus harmful pragmatic action | Business goal/safety prioritization | Discrete scenarios, no persistent company state |
| S06 | [YC-Bench](https://arxiv.org/abs/2604.01212) | Agent runs a startup for a simulated year over hundreds of turns | Long company horizon, delayed feedback, multiple models/seeds | Fixed top-level objective; not objective sensitivity |
| S07 | [Vending-Bench](https://arxiv.org/abs/2502.15840) | Long-running vending business with inventory, pricing, orders, profit | Business trajectory, path dependence, run variance | One profit objective and narrow firm type |
| S08 | [TheAgentCompany](https://arxiv.org/abs/2412.14161), [repo](https://github.com/TheAgentCompany/TheAgentCompany) | Simulated software company and professional tasks | Enterprise tools, state, graders, open environment | Task completion rather than longitudinal competing KPIs |
| S09 | [EnterpriseGym/Corecraft](https://arxiv.org/abs/2602.16179) | Stateful enterprise support environment and multi-criterion reward | High-fidelity enterprise RL and verifiers | Customer-support task family; no paired objective intervention |
| S10 | [CRMArena-Pro](https://arxiv.org/abs/2505.18878) | CRM business tasks, multi-turn users, confidentiality | Business performance/compliance tension | Bounded workflows; objectives are not randomized |
| S11 | [tau-bench](https://arxiv.org/abs/2406.12045), [site](https://taubench.com/) | Tool-agent-user interaction, policy, DB-state grading, pass^k | Enterprise policy compliance and repeated reliability | Customer-service completion, no KPI response curve |
| S12 | [WorkArena++](https://arxiv.org/abs/2407.05291), [repo](https://github.com/ServiceNow/WorkArena) | Enterprise workflows and ground-truth action traces | Enterprise trajectories and executable validation | Fixed task goals; no delayed company outcomes |
| S13 | [AI Safety Gridworlds](https://arxiv.org/abs/1711.09883) | Separate observed reward from hidden performance for safety failures | Proxy gap, side effects, reward gaming, interruptibility | Toy environments rather than semantic enterprise agents |
| S14 | [Reward Hacking Benchmark](https://arxiv.org/abs/2605.02964) | Multi-step tool tasks, exploit categories, full-log replay, 13 models | Trace-level hacking and cross-model differences | Exploit opportunity/difficulty, not business KPI vector |
| S15 | [Specification Gaming in Reasoning Models](https://arxiv.org/abs/2605.02269) | Eight gameable settings and reasoning-model comparisons | Reward exploitation under optimized scoring | No enterprise dynamics or stakeholder ledger |
| S16 | [ATBench](https://arxiv.org/abs/2604.02022) | Audited long-horizon tool trajectories with delayed triggers | Delayed risk and trajectory taxonomy | Safety trigger benchmark, not objective causal audit |
| S17 | [AgentMisalignment](https://arxiv.org/abs/2506.04018) | Goal guarding, shutdown resistance, personas | Shows wording/persona can dominate model effects | Motivates a confound control rather than direct duplication |
| S18 | [SysAdmin](https://arxiv.org/abs/2607.18239) | Linux sandbox; power-seeking and specification-gaming conditions | Naturalistic autonomy/resource/concealment measures | System administration rather than company KPIs |
| S19 | [Power-seeking can be probable and predictive](https://arxiv.org/abs/2304.06528) | Theory of training-compatible goals and shutdown avoidance | Basis for objective-dependent instrumental behavior | Theory, not an LLM enterprise benchmark |
| S20 | [MO-Gymnasium / MORL-Baselines](https://papers.nips.cc/paper_files/paper/2023/hash/4aa8891583f07ae200ba07843954caeb-Abstract-Datasets_and_Benchmarks.html) | Standard vector-reward environments and MORL implementations | Fixed dynamics with changing preferences is standard | Lacks enterprise semantics, LLM tool traces, grader validity |
| S21 | [MOMAland](https://arxiv.org/abs/2407.16312) | Multi-objective multi-agent environments | Multiple agents and vector rewards | Benchmark algorithm focus, not company-agent audit |
| S22 | [MORL generalization](https://arxiv.org/abs/2503.00799) | Pareto-policy generalization across preferences/environments | Preference changes and robustness | Different estimand and policy-learning focus |
| S23 | [CMDP representative](https://proceedings.mlr.press/v258/ni25a.html) | Optimize cumulative reward subject to cumulative constraints | Formal reward/constraint/violation structure | General theory; no enterprise/objective audit contribution |
| S24 | [Preference Controllable RL](https://proceedings.mlr.press/v267/yang25ax.html) | Preference-conditioned meta-policy over Pareto regions | Objective weights control trajectories | Method/theory paper, not evaluator validity or LLM behavior science |
| S25 | [Distributional Pareto MORL](https://proceedings.neurips.cc/paper_files/paper/2023/hash/32285dd184dbfc33cb2d1f0db53c23c5-Abstract-Conference.html) | Distributional preferences over multivariate returns | Uncertainty-aware objective trade-offs | Algorithmic Pareto optimization |
| S26 | [Rewards-in-Context](https://proceedings.mlr.press/v235/yang24q.html) | Dynamic multi-objective alignment of foundation-model responses | Prompt-conditioned reward preferences | Response alignment, not interactive company trajectories |
| S27 | [Inverse Reward Design](https://arxiv.org/abs/1711.02827) | Designed reward as evidence about intended reward | Directly addresses reward misspecification | Method, not systematic enterprise behavior measurement |
| S28 | [Cooperative IRL](https://arxiv.org/abs/1606.03137) | Human-robot partial-information game over human reward | Objective uncertainty and active learning | Different cooperative inference problem |
| S29 | [Goal Misgeneralization](https://arxiv.org/abs/2105.14111) | Capable policy pursues wrong OOD goal | Objective robustness failure | Training/deployment generalization, not explicit KPI intervention |
| S30 | [Concrete Problems in AI Safety](https://arxiv.org/abs/1606.06565) | Side effects, reward hacking, scalable supervision, safe exploration, shift | Foundational specification-risk framing | Agenda paper, not enterprise benchmark |
| S31 | [Defining and Characterizing Reward Hacking](https://proceedings.neurips.cc/paper_files/paper/2022/file/3d719fee332caa23d5038b8a90e81796-Paper-Conference.pdf) | Formal distinctions among proxy/true reward and tampering/gaming | Defines outcome gap and hacking | Formalization rather than enterprise empirical protocol |
| S32 | [MAC-Bench](https://arxiv.org/abs/2606.07805) | Dynamic multi-agent compliance pressure and Machiavellian gap | Success/compliance Pareto tension, trace auditing | Varies pressure/scenarios, not orthogonal business KPI vectors |
| S33 | [CUARewardBench](https://openreview.net/forum?id=Xj7V0wKlE5) | Reward-model evaluation for computer-use agents | Evaluator reliability and stepwise assessment | Computer-use RM benchmark, not company objective response |
| S34 | [GraphAllocBench](https://arxiv.org/abs/2601.20753) | Preference-conditioned allocation with varied objectives | Fixed allocation sandbox and preference conditions | City/resource algorithm benchmark, not LLM enterprise operations |
| S35 | [A Generalized MORL Algorithm](https://proceedings.neurips.cc/paper/2019/hash/4a46fbfca3f1465a27b210f4bdfe6ab3-Abstract.html) | One representation adapts across preference vectors | Canonical “same MDP, varied preferences” precedent | No operational safety/evaluator audit |

## G1/G3 conclusion

The broad idea is not novel. S20–S25 and S35 make the mathematical intervention
standard; S13–S16 and S30–S32 make reward/specification failures standard; S01–S12
make enterprise and long-horizon business agents crowded. A paper remains possible
only if a benchmark/dataset contribution empirically validates a paired audit,
full vector ledger, direct and closed-loop estimands, paraphrase/intensity
controls, delayed calibrated outcomes, and cross-model effect stability.
