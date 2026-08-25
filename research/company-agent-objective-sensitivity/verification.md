# Verification and gate report

Date: 2026-07-23

## Fresh verification

- `uv run pytest -q` → 16 passed.
- A clean temporary pilot run produced byte-identical JSONL and JSON receipts.
- `results/sample-episodes.jsonl` → 72 episodes.
- Receipt OCAD mean → 0.9722222222222223, explicitly marked deterministic
  checksum; inferential interval is null.
- Event audit → 12 affected episodes, 72 deceptive actions, 60 repeated
  compliance-state flags, 132 event-period records.
- JSON and JSONL parse checks → pass.
- Claim CSV → 17 rows, all in the three allowed evidence classes.
- Evidence/license join → 35 primary source IDs, no missing S01–S35 manifest row.
- Secret-pattern scan → pass.
- Private-data locator scan → one intentional internal Kimi-review locator,
  retained because the protocol requires the original locator; no private record
  contents are included.
- Untracked text equivalent of `git diff --check` → pass. Binary PDF/PNG files
  were excluded from whitespace checking.
- PDF → five Letter pages, unencrypted, no JavaScript; text extraction succeeded;
  all five rendered pages were visually inspected with no clipping or overlap.

## G0–G10

| Gate | Status | Evidence |
|---|---|---|
| G0 | PASS | Codex goal created; scope recorded in design and plan. |
| G1 | PASS with caveat | 35-source non-exhaustive primary-source scoping matrix; five closest works compared. Priority claims remain provisional. |
| G2 | PASS by specified fallback | New cmux/Hermes review unavailable and recorded as missing; prior Kimi locator and bounded response preserved. |
| G3 | PASS | Three-sentence MORL/CMDP/specification-gaming distinction in `evidence/closest-work.md`. |
| G4 | PASS | One question, one primary closed-loop endpoint, two confirmatory hypotheses, one exploratory hypothesis. |
| G5 | PASS | Schemas, deterministic variants, validator, 16 tests, and reproducible receipt. |
| G6 | DESIGN PASS / EXECUTION HOLD | Protocol covers required threats; operational controls still listed as unimplemented in `evidence/protocol-to-code-manifest.md`. |
| G7 | PASS for V0 central claims | Claim ledger classes every central claim; no fabricated frontier result. Comparative absence claims are explicitly provisional. |
| G8 | PASS | Independent novelty and validity red teams plus author rebuttal. |
| G9 | PASS for V0 package | Tests, text whitespace check, secret scan, source/license manifest, JSON/CSV checks, and PDF inspection pass. |
| G10 | PASS | Three design abstracts, decision matrix, primary A and fallback B. |

## Tooling and evidence limits

The requested `research-duplex` skill was not installed or discoverable, so no
claim is made that its protocol was applied. The agent-native RL research-cycle
skill and Ralphthon ICML evidence-contract patterns were applied instead. `cmux`
was absent, so no current Hermes/Kimi surface was contacted. These are missing
reviews/tools, not blockers to this design V0.

## Overall decision

The design package is complete, but the empirical benchmark claim remains on
novelty and execution hold. The next kill gate is a rights-cleared second
environment plus registered paraphrase-controlled shared-state and closed-loop
model experiment. No paid API/GPU run has been authorized or performed.
