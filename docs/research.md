# Research sources and implementation decisions

Research date: **2026-07-16 KST**

The investigation prioritized current official repositories, shipped provider
artifacts, and real schema-only observations. Secondary OSS tools were used to
cross-check edge cases and ergonomics. Turnspan was then implemented clean-room
in TypeScript.

## Provider primary sources

### Codex

Current package checked: `@openai/codex` `0.144.5`.

Primary sources:

- [Codex state and session locations](https://developers.openai.com/codex/config-advanced#config-and-state-locations)
- [Codex transcript stability warning](https://developers.openai.com/codex/hooks)
- [Codex protocol events at the 0.144.5 commit](https://github.com/openai/codex/blob/87db9bc18ba5bc82c1cb4e4381b44f693ee35623/codex-rs/protocol/src/protocol.rs#L1320-L1336)
- [Codex `RolloutItem` and `RolloutLine` protocol definitions](https://github.com/openai/codex/blob/cbc83d961e8132bfff4d340ab8342d181b79e95e/codex-rs/protocol/src/protocol.rs#L3040-L3184)
- [Codex repository](https://github.com/openai/codex)

Validated behavior:

- Recognize both `task_started` / `task_complete` and forward aliases
  `turn_started` / `turn_complete`.
- Join events by `turn_id`.
- Prefer explicit provider `started_at`, `completed_at`, and `duration_ms`.
- Compute per-turn tokens by subtracting cumulative
  `total_token_usage` snapshots around the turn.
- Read the model from `turn_context.model`, with thread-settings fallback.
- Treat a forward-schema completion carrying `error` as ineligible.

Known limitation: stable 0.144.5 completion records do not persist every
unexpected terminal error. A null or absent error therefore cannot prove that
all historical stable turns were semantically successful; Turnspan reports the
strongest evidence available in the file.

### Claude Code

Current package checked: `@anthropic-ai/claude-code` `2.1.211`.

Primary sources:

- [Claude Code transcript locations and format warning](https://code.claude.com/docs/en/sessions#where-transcripts-are-stored)
- [Claude Code plaintext storage warning](https://code.claude.com/docs/en/claude-directory#plaintext-storage)
- [Claude Code hooks documentation](https://code.claude.com/docs/en/hooks)
- [Claude Agent SDK message types](https://code.claude.com/docs/en/agent-sdk/typescript#message-types)

Claude Code's full session writer source is not public. The format was therefore
verified using official documentation, the current signed distribution binary,
and schema-only inspection of installed main and subagent JSONL files. No
prompt, response, or tool-output value was copied into this repository.

Validated behavior:

- A human turn begins at a `user` record that is not metadata and contains no
  `tool_result` block.
- Tool-result user records remain inside the active turn even when older
  top-level helper fields are absent.
- Repeated assistant updates are deduplicated by `message.id`; token fields are
  merged component-wise by maximum so a later partial update cannot erase
  earlier counters.
- `system` / `turn_duration` is the strongest completion evidence.
- `interruptedMessageId` and `isApiErrorMessage` prevent promotion.
- Sidechain-only subagent transcripts are valid sources and must not be
  blanket-excluded.
- A final `end_turn` or `stop_sequence` is used as a conservative fallback for
  subagent files that omit `turn_duration`.
- A known non-clean stop such as `max_tokens` remains incomplete even when a
  `turn_duration` record exists.
- An interruption marker is applied only when its `interruptedMessageId`
  matches an assistant message observed in the active turn.

### OpenCode

Current package checked: `opencode-ai` `1.18.2`.

Primary sources:

- [OpenCode `export --sanitize` and JSON import contract](https://opencode.ai/docs/cli/#export)
- [OpenCode database path command](https://opencode.ai/docs/cli/#db)
- [OpenCode export implementation at 1.18.2](https://github.com/anomalyco/opencode/blob/70b56a0a93d366889cae950379cc9d2537148fa2/packages/opencode/src/cli/cmd/export.ts#L222-L291)
- [OpenCode SQLite initialization and WAL mode](https://github.com/anomalyco/opencode/blob/70b56a0a93d366889cae950379cc9d2537148fa2/packages/core/src/database/database.ts#L22-L54)
- [OpenCode session tables](https://github.com/anomalyco/opencode/blob/70b56a0a93d366889cae950379cc9d2537148fa2/packages/core/src/session/sql.ts#L22-L138)
- [Transitional pre-`seq` session table](https://github.com/anomalyco/opencode/blob/6bcb9cb9bbeedd97cacc3998177eaab4b8010eaa/packages/opencode/src/session/session.sql.ts#L113-L130)
- [OpenCode finish-reason vocabulary](https://github.com/anomalyco/opencode/blob/70b56a0a93d366889cae950379cc9d2537148fa2/packages/llm/src/schema/ids.ts#L39-L40)
- [OpenCode repository and license](https://github.com/anomalyco/opencode)
- [SQLite Wasm cookbook](https://sqlite.org/wasm/doc/trunk/cookbook.md)
- [SQLite deserialize ownership contract](https://sqlite.org/c3ref/deserialize.html)

Validated behavior:

- Read the documented `{ info, messages: [{ info, parts }] }` export shape
  while ignoring `parts`, titles, paths, metadata, and error text.
- Read legacy `message`, current sequenced `session_message`, and transitional
  pre-sequence `session_message` tables.
- Group legacy assistant steps by `(session_id, parentID)`.
- Group sequenced records by `session_id` and `seq`; use the historical
  `time_created, id` order only when `seq` is absent.
- In mixed migrations, prefer V2 only for an exact matching user-message ID,
  rather than excluding every legacy turn in that session.
- Sum assistant-step token usage within the user execution.
- Preserve model as `providerID/modelID`.
- Only `stop`, historical `end_turn`, and `stop_sequence` are clean terminal
  reasons. `tool-calls` and `unknown` are non-terminal; `length`,
  `content-filter`, `error`, and unknown future terminal strings are
  ineligible.
- Query only allowlisted JSON paths with SQLite `json_extract()`. The `part`
  table and raw `session_message.data` content are never selected.

The JSON export is OpenCode's documented portable contract. Direct SQLite
support is pinned best-effort compatibility with OpenCode 1.18.2 internal
tables; those tables may change independently of the export command.

OpenCode sets SQLite file header bytes 18 and 19 to WAL mode (`2/2`).
`sqlite3_deserialize()` cannot directly query that file image. Turnspan clones
the uploaded bytes, changes only the clone's header to rollback mode (`1/1`),
copies it into SQLite-owned memory with 64 zero padding bytes, deserializes
read-only with `SQLITE_DESERIALIZE_FREEONCLOSE`, and requires
`PRAGMA integrity_check = ok`. SQLite owns and frees that allocation after the
deserialize call, including failure paths. This reads a checkpointed main image
but cannot recover uncheckpointed WAL frames, so the UI always warns for
WAL-header inputs.

## OSS comparison and licensing

| Project | License | Reused as | Decision |
| --- | --- | --- | --- |
| [ccusage/ccusage](https://github.com/ccusage/ccusage) | MIT, © ryoppippi | Conceptual cross-check for provider adapters, cumulative Codex tokens, Claude dedupe | Clean-room implementation; no copied code |
| [steipete/CodexBar](https://github.com/steipete/CodexBar) | MIT, © Peter Steinberger | Bounded parsing, malformed-record resilience, privacy UX | Swift source not copied |
| [junhoyeo/tokscale](https://github.com/junhoyeo/tokscale) | MIT, © Junho Yeo | OpenCode SQLite fields, multi-step timing, channel DB discovery | Schema ideas only; social/content features excluded |
| [phuryn/claude-usage](https://github.com/phuryn/claude-usage) | MIT | Claude repeated-record behavior | Conceptual check only |
| [gaboe/opencode-usage](https://github.com/gaboe/opencode-usage) | Package says MIT; no standalone LICENSE found | OpenCode query comparison | No copied code |
| [tobitege/codlogs](https://github.com/tobitege/codlogs) | Conflicting MIT LICENSE / `UNLICENSED` package metadata | Large-file comparison | No copied code |
| `chief-builder/claude-code-analytics` | Informal README claim; no complete license file found | Privacy counterexample | No copied code |

The internal Deep Thought `session-insights` workflow was also deliberately not
reused: it extracts prompt topics, tools, and files, which conflicts with
Turnspan's metadata-only boundary, and it has no standalone reusable license.

## Browser and privacy sources

- [W3C File API](https://www.w3.org/TR/FileAPI/)
- [MDN File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API)
- [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [SQLite Wasm](https://sqlite.org/wasm/doc/trunk/index.md)
- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [OWASP DOM XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Playwright network documentation](https://playwright.dev/docs/network)
- [Playwright file input documentation](https://playwright.dev/docs/api/class-locator)

Implementation consequences:

- Native multiple file input is the compatibility baseline.
- Raw records stay inside a prewarmed Worker.
- After SQLite WASM initialization, the Worker replaces fetch, WebSocket,
  EventSource, XMLHttpRequest, and dynamic script loading with fail-closed
  stubs before accepting files.
- No remote font, image, script, analytics, or storage dependency exists.
- Models are accepted only from known provider paths and constrained to a
  bounded safe label.
- React text rendering is used; no `innerHTML`, `eval`, or dynamic code exists.
- Export is JSON with a fixed allowlist and nulls for unavailable metadata.
- Production analysis is tested offline after Worker/WASM initialization.

## Product name and brand

Names were checked across GitHub, npm, PyPI, general web results, and public
trademark search.

- **Turnspan** was selected: it directly describes elapsed turn time and had no
  clear collision with a user-facing software product on the research date.
- `Turnproof` was rejected because of a 2026 software trademark filing.
- `Runspan` was rejected because of an existing running application.
- `TurnSift` / `Session Sift` were rejected because the “sift” namespace is
  crowded and already used by Claude archive tooling.

This is a naming screen, not a legal trademark opinion.

The visual system follows Team Attention's Ralphthon direction from the local
Deep Thought source of truth:

- ink `#161616`
- paper `#f7f5ef`
- white `#fffdf8`
- Ralphthon yellow `#ffc527`
- red `#e53b22`
- thin rules, system type, no remote assets, restrained card use

## License decision

- Turnspan source: MIT.
- Runtime SQLite wrapper: Apache-2.0.
- SQLite engine: public domain.
- Runtime React packages: MIT.
- Synthetic fixtures were written for Turnspan and do not copy upstream fixture
  text.
- Provider names are used only to describe compatible import formats.
- Turnspan is explicitly unaffiliated with OpenAI, Anthropic, and OpenCode.
