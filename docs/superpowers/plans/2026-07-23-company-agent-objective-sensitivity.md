# Company-Agent Objective Sensitivity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a rights-clear, executable benchmark pilot and an evidence-backed mock paper package for objective sensitivity in company agents.

**Architecture:** A self-contained Python package models a finite-horizon synthetic B2B SaaS and records vector outcomes before objective scalarization. Markdown/CSV/JSON artifacts share stable identifiers so claims, sources, simulated runs, and reviews can be audited.

**Tech Stack:** Python 3.11+, `uv`, standard library, pytest, JSON/JSONL, Markdown, LaTeX or ReportLab, Poppler.

## Global Constraints

- Existing project and Ralphthon/Environment Foundry results remain untouched.
- Synthetic/public rights-clear inputs only.
- No paid compute or API calls.
- Planned, simulated, and observed evidence must never be conflated.
- The randomized treatment is the versioned objective-message package. Pure
  weight effects are claimed only in cells where ID, target, and wording are fixed.

---

### Task 1: Evidence and scope freeze

**Files:**
- Create: `research/company-agent-objective-sensitivity/evidence/prior-art-matrix.md`
- Create: `research/company-agent-objective-sensitivity/evidence/closest-work.md`
- Create: `research/company-agent-objective-sensitivity/evidence/source-license-manifest.csv`
- Create: `research/company-agent-objective-sensitivity/reviews/kimi-critique-response.md`

**Interfaces:**
- Consumes: primary-source URLs and read-only local provenance.
- Produces: source IDs `S01...`, novelty classification, and G1/G2/G3 decisions.

- [x] Record at least 25 primary sources with setting, method, contribution, overlap, difference, and license/access.
- [x] Compare the five closest works sentence by sentence.
- [x] Record the unavailable cmux review as missing, and preserve the prior Kimi locator.
- [x] Write the three-sentence MORL/CMDP/specification-gaming distinction.

### Task 2: Test-first environment core

**Files:**
- Create: `research/company-agent-objective-sensitivity/pyproject.toml`
- Create: `research/company-agent-objective-sensitivity/src/company_objective_bench/environment.py`
- Create: `research/company-agent-objective-sensitivity/src/company_objective_bench/policies.py`
- Create: `research/company-agent-objective-sensitivity/tests/test_environment.py`

**Interfaces:**
- Produces: `CompanyEnv.reset(seed)`, `CompanyEnv.step(action)`,
  `ObjectiveSpec`, `EpisodeRecord`, and `choose_action`.

- [x] Write failing tests for deterministic reset, fixed shocks, objective-only diffs, delayed effects, and invalid actions.
- [x] Run `uv run pytest tests/test_environment.py -q` and confirm failure.
- [x] Implement the minimum environment and policies.
- [x] Run the same test and confirm pass.

### Task 3: Metrics and executable pilot

**Files:**
- Create: `research/company-agent-objective-sensitivity/src/company_objective_bench/metrics.py`
- Create: `research/company-agent-objective-sensitivity/src/company_objective_bench/runner.py`
- Create: `research/company-agent-objective-sensitivity/tests/test_metrics.py`
- Create: `research/company-agent-objective-sensitivity/results/pilot-receipt.json`
- Create: `research/company-agent-objective-sensitivity/results/sample-episodes.jsonl`

**Interfaces:**
- Consumes: matched `EpisodeRecord` objects.
- Produces: OCAD, outcome summaries, and a labeled simulation receipt. The
  deterministic plumbing run receives no inferential interval.

- [x] Write failing metric-bound and paired-design tests.
- [x] Run focused tests and confirm failure.
- [x] Implement metrics and runner.
- [x] Run 2 families x 3 objectives x 12 seeds and save exact command/version receipt.
- [x] Recompute receipt from raw JSONL and compare.

### Task 4: Research package

**Files:**
- Create: `research/company-agent-objective-sensitivity/README.md`
- Create: `research/company-agent-objective-sensitivity/research-one-pager.md`
- Create: `research/company-agent-objective-sensitivity/formalization.md`
- Create: `research/company-agent-objective-sensitivity/paper-options.md`
- Create: `research/company-agent-objective-sensitivity/protocol.md`
- Create: `research/company-agent-objective-sensitivity/venue-plan.md`
- Create: `research/company-agent-objective-sensitivity/30-day-plan.md`

**Interfaces:**
- Consumes: source IDs, formal model, and pilot receipt.
- Produces: G4/G6/G10-readable decisions and kill/pivot gates.

- [x] Write the easy explanation first, then researcher one-pager.
- [x] Freeze one question, one endpoint, and no more than three hypotheses.
- [x] Specify leakage, confounds, seeds, grading independence, analysis, rights, and privacy.
- [x] Compare three paper candidates and choose primary/fallback.

### Task 5: Honest paper and review

**Files:**
- Create: `research/company-agent-objective-sensitivity/paper/mock-paper-v0.md`
- Create: `research/company-agent-objective-sensitivity/paper/mock-paper-v0.tex`
- Create: `research/company-agent-objective-sensitivity/output/pdf/mock-paper-v0.pdf`
- Create: `research/company-agent-objective-sensitivity/evidence/claim-ledger.csv`
- Create: `research/company-agent-objective-sensitivity/reviews/red-team-novelty.md`
- Create: `research/company-agent-objective-sensitivity/reviews/red-team-validity.md`
- Create: `research/company-agent-objective-sensitivity/reviews/rebuttal.md`

**Interfaces:**
- Produces: a paper-shaped design document where every claim is source-backed,
  simulated evidence, or explicit hypothesis.

- [x] Draft all required paper sections and mark illustrative results on every relevant page/section.
- [x] Classify every central claim in the ledger.
- [x] Run two independent red-team reviews and write a bounded rebuttal.
- [x] Render the PDF, extract text, render all pages to PNG, and visually inspect.

### Task 6: Final gates and handoff

**Files:**
- Create: `research/company-agent-objective-sensitivity/verification.md`
- Create: `research/company-agent-objective-sensitivity/deep-thought-handoff.md`

**Interfaces:**
- Produces: G0-G10 status with commands, outputs, caveats, and next decisions.

- [x] Run `uv run pytest -q`.
- [x] Run `git diff --check`.
- [x] Scan the new research directory for secret patterns and private-data locators.
- [x] Validate all source IDs, licenses, claim classes, JSON, and CSV.
- [x] Record failures honestly and complete only gates supported by fresh evidence.
