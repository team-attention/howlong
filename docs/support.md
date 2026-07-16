# Support matrix and limitations

Turnspan reports the strongest metadata present in each source. It never fills
missing values with guesses or zero.

## Normalized status

| Status | Meaning | Eligible for “longest clean run” |
| --- | --- | --- |
| `completed` | A provider-specific terminal signal exists and no interruption/error evidence was found | Yes, when end and duration are known |
| `interrupted` | An explicit abort/interruption marker exists | No |
| `incomplete` | The terminal event is missing, errored, still has background work, or cannot be proven clean | No |

Ties in duration are resolved deterministically by start timestamp and run ID.

## Codex JSONL

Supported:

- `task_started` and `turn_started`
- `task_complete`, `turn_complete`, and `turn_aborted`
- `turn_context.model`
- `thread_settings_applied.thread_settings.model` fallback
- cumulative `total_token_usage`
- input, output, cached input, cache write, reasoning output, and total tokens

Timing:

- Start: provider `started_at`, falling back to record timestamp.
- End: provider `completed_at`, falling back to terminal record timestamp.
- Duration: provider `duration_ms`, falling back to end minus start.

Token calculation:

- Turn baseline = nearest cumulative token snapshot before start.
- Turn total = final cumulative snapshot minus baseline.
- If the counter resets, the current snapshot is used conservatively.
- If no fresh cumulative snapshot appears during a turn, usage remains
  unavailable rather than being reported as zero.

Limits:

- Token records do not always carry a `turn_id`; concurrently interleaved or
  replayed histories can only be assigned to the most recent active turn.
- Stable Codex 0.144.5 does not persist every unexpected completion error.
- Forked/imported rollouts can contain repeated history; Turnspan does not
  infer private lineage beyond explicit events.

## Claude Code JSONL

Supported:

- Main project transcripts and sidechain-only subagent transcripts.
- Human user boundaries.
- Tool-result user records inside a turn.
- Repeated assistant-update deduplication by `(message.id, requestId)`.
- Input, output, cache creation/write, and cache read tokens.
- `system/turn_duration`.
- `interruptedMessageId`, assistant error, and `isApiErrorMessage`.
- `pendingBackgroundAgentCount` and `pendingWorkflowCount`.
- Clean assistant stops are `end_turn` and `stop_sequence`.

Timing:

- Start: human user record timestamp.
- End: `turn_duration` timestamp or final assistant timestamp.
- Duration: `turn_duration.durationMs` when present; otherwise end minus start.

Limits:

- Claude's recorded duration can represent active processing rather than every
  wall-clock pause, so it is not perfectly equivalent to Codex/OpenCode time.
- The full session writer source is not public. Support is verified against
  official documentation, shipped binaries, and current installed fixtures.
- Embedded sidechain replays in a parent file can be difficult to distinguish
  from a coherent uploaded sidechain file; usage deduplication reduces but
  cannot eliminate every possible replay ambiguity.
- A recorded duration after `max_tokens`, `tool_use`, or another non-clean
  final stop remains `incomplete` and cannot win the longest-run comparison.

## OpenCode SQLite

Supported:

- SQLite database magic-byte detection.
- Legacy `message` table.
- Current `session_message` table with `seq`.
- Transitional `session_message` tables without `seq`, ordered by the
  provider's historical `time_created, id` convention.
- Mixed databases: exact `(session_id, user-message ID)` duplicates prefer the
  current table while legacy-only turns in the same session remain included.
- Multi-step assistant/tool loops grouped into one user execution.
- `providerID/modelID`, time, finish, error, and token metadata.
- WAL-header main images after in-memory header normalization and integrity
  verification.

Timing:

- Start: user message creation time.
- End: latest assistant completion time in the grouped execution.
- Duration: end minus start, including tool-loop elapsed time.

Limits:

- A main database file cannot contain uncheckpointed frames from its companion
  `-wal` file. WAL-header sources are therefore marked as potentially stale.
- Turnspan does not accept a separate `-wal`/`-shm` set. Make a SQLite backup
  first when freshness matters.
- Corrupt databases or unsupported schemas fail closed.
- Raw `part` records and raw message JSON are never selected, so future metadata
  stored only inside content fields is intentionally ignored.
- Only `stop`, historical `end_turn`, and `stop_sequence` are treated as clean
  terminal finishes. `length`, `content-filter`, `error`, and unknown future
  terminal strings remain ineligible.

## Cross-provider comparison

“Run” means the closest provider-native user execution:

- Codex: task/turn protocol interval.
- Claude Code: user turn through its duration/terminal record.
- OpenCode: user message plus its assistant model-step sequence.

These are useful comparable wall-time estimates, not identical instrumentation.
Duration and token fields should be interpreted with their provider semantics.

## Browser limits

- Up to 100 selected sources.
- Up to 512 MiB per source.
- Up to 1 GiB combined selection.
- Format detection inspects at most the first 80 nonblank JSONL records and
  applies the 8 MiB record guard before `JSON.parse`.
- JSONL is parsed in a Worker but currently decoded as one file string; actual
  peak memory can be several times source size. Lines are iterated without
  building a second whole-file line array.
- SQLite is deserialized into browser memory.
- Modern Chromium is the fully tested browser. The static standards-based UI
  should work in current Firefox and Safari, but those engines are not part of
  the committed screenshot suite.

## Export schema

The JSON export contains only:

- normalized summary counts;
- source ordinal, provider, run count, skipped-record count, warning codes;
- run ID, provider, source/turn ordinal;
- start, end, duration;
- completion status and evidence;
- input, output, cache read/write, reasoning, and total tokens;
- model;
- warning codes.

Unavailable optional fields are serialized as `null`. Filenames, paths, session
IDs, message IDs, project names, prompts, responses, reasoning text, and tool
data are never exported.
