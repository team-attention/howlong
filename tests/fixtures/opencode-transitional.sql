PRAGMA journal_mode=WAL;
PRAGMA synchronous=FULL;

CREATE TABLE message (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  time_created INTEGER NOT NULL,
  time_updated INTEGER NOT NULL,
  data TEXT NOT NULL
);

CREATE TABLE session_message (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  time_created INTEGER NOT NULL,
  time_updated INTEGER NOT NULL,
  data TEXT NOT NULL
);

-- A legacy-only turn in a session that also has V2 records. Session-wide
-- exclusion would incorrectly drop this turn.
INSERT INTO message VALUES (
  'msg_legacy_only_user',
  'ses_mixed',
  1775260800000,
  1775260800000,
  '{"role":"user","time":{"created":1775260800000},"text":"TURNSPAN_PRIVATE_CANARY_7f3b legacy-only prompt"}'
);
INSERT INTO message VALUES (
  'msg_legacy_only_assistant',
  'ses_mixed',
  1775260810000,
  1775260860000,
  '{"role":"assistant","parentID":"msg_legacy_only_user","time":{"created":1775260810000,"completed":1775260860000},"modelID":"gpt-5.4","providerID":"openai","finish":"stop","tokens":{"total":120,"input":90,"output":30}}'
);

-- This turn exists in both tables under the same user message ID. V2 must win
-- without duplicating the execution.
INSERT INTO message VALUES (
  'msg_shared_user',
  'ses_mixed',
  1775260920000,
  1775260920000,
  '{"role":"user","time":{"created":1775260920000},"text":"TURNSPAN_PRIVATE_CANARY_7f3b shared legacy prompt"}'
);
INSERT INTO message VALUES (
  'msg_shared_legacy_assistant',
  'ses_mixed',
  1775260930000,
  1775260970000,
  '{"role":"assistant","parentID":"msg_shared_user","time":{"created":1775260930000,"completed":1775260970000},"modelID":"legacy-model","providerID":"legacy-provider","finish":"stop","tokens":{"total":999,"input":900,"output":99}}'
);
INSERT INTO session_message VALUES (
  'msg_shared_user',
  'ses_mixed',
  'user',
  1775260920000,
  1775260920000,
  '{"time":{"created":1775260920000},"text":"TURNSPAN_PRIVATE_CANARY_7f3b shared V2 prompt","files":[],"agents":[]}'
);
INSERT INTO session_message VALUES (
  'msg_shared_v2_assistant',
  'ses_mixed',
  'assistant',
  1775260930000,
  1775260980000,
  '{"time":{"created":1775260930000,"completed":1775260980000},"agent":"build","model":{"id":"claude-opus-4-1","providerID":"anthropic"},"content":[{"type":"text","id":"txt_shared","text":"TURNSPAN_PRIVATE_CANARY_7f3b shared response"}],"finish":"stop","tokens":{"input":140,"output":50,"reasoning":10,"cache":{"read":20,"write":5}}}'
);

-- A token-limit finish has an end time but is not a clean completion.
INSERT INTO session_message VALUES (
  'msg_v2_length_user',
  'ses_mixed',
  'user',
  1775261040000,
  1775261040000,
  '{"time":{"created":1775261040000},"text":"TURNSPAN_PRIVATE_CANARY_7f3b truncated prompt","files":[],"agents":[]}'
);
INSERT INTO session_message VALUES (
  'msg_v2_length_assistant',
  'ses_mixed',
  'assistant',
  1775261050000,
  1775261220000,
  '{"time":{"created":1775261050000,"completed":1775261220000},"agent":"build","model":{"id":"gpt-5.4","providerID":"openai"},"content":[{"type":"text","id":"txt_length","text":"TURNSPAN_PRIVATE_CANARY_7f3b truncated response"}],"finish":"length","tokens":{"input":300,"output":200,"reasoning":40,"cache":{"read":10,"write":0}}}'
);

PRAGMA wal_checkpoint(TRUNCATE);
