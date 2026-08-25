# Independent red-team: novelty

Date: 2026-07-23
Role: NeurIPS-style novelty reviewer
Independence: read-only review; no project files were modified by the reviewer.

## Verdict

**Current submission score: 2/10 (strong reject). Candidate novelty after major
repair: approximately 4/10.**

The broad claim is already occupied by MORL/CMDP, specification gaming,
CoffeeBench, Agentic Misalignment, EnterpriseArena, MACHIAVELLI, and
ManagerBench. Changing a business KPI and observing changed or harmful behavior
is not new. A six-period designer-authored SaaS simulator and a trajectory
distance metric do not by themselves create a benchmark contribution.

## Fatal issues

1. H1 is close to tautological when heuristic policies branch on objective ID.
2. H2 depends on designer-authored harm transitions and lacks KPI-matched benign
   alternatives.
3. OCAD over closed-loop trajectories confounds direct policy sensitivity with
   post-treatment state divergence.
4. The evidence matrix was a broad scoping pass, not a systematic priority search.
5. “Preregistered” was used before a public time-stamped registration existed.
6. The claim ledger did not yet classify comparative absence or priority claims.

## Conditions for a defensible paper

- Register the protocol before frontier-model data.
- Use at least two model families and two environments.
- Include feasible harmful and benign paths with comparable KPI attainment.
- Separate first-decision/shared-state direct effects from total trajectory effects.
- Demonstrate incremental validity beyond simpler business and safety benchmarks.
- Repeat the literature search independently and publish the search protocol.

## Stronger formulation

Test a controlled paired objective-sensitivity audit that holds initial state,
dynamics, tools, counterpart policies, budgets, and exogenous shocks fixed;
randomizes a complete objective-message package; estimates direct shared-state and
closed-loop trajectory effects separately; and measures KPI elasticity,
constraint violations, proxy gaps, and delayed stakeholder externalities.
