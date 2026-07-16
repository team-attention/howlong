PRAGMA journal_mode=WAL;
PRAGMA synchronous=FULL;

CREATE TABLE message (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  time_created INTEGER NOT NULL,
  time_updated INTEGER NOT NULL,
  data TEXT NOT NULL
);

CREATE TABLE part (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  time_created INTEGER NOT NULL,
  time_updated INTEGER NOT NULL,
  data TEXT NOT NULL
);

CREATE TABLE session_message (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  seq INTEGER NOT NULL,
  time_created INTEGER NOT NULL,
  time_updated INTEGER NOT NULL,
  data TEXT NOT NULL
);

INSERT INTO message VALUES (
  'msg_legacy_user_1',
  'ses_legacy',
  1775088000000,
  1775088000000,
  '{"role":"user","time":{"created":1775088000000},"model":{"providerID":"openai","modelID":"gpt-5.4"},"agent":"build"}'
);
INSERT INTO part VALUES (
  'prt_legacy_private',
  'msg_legacy_user_1',
  'ses_legacy',
  1775088000000,
  1775088000000,
  '{"type":"text","text":"TURNSPAN_PRIVATE_CANARY_7f3b prompt and tool output"}'
);
INSERT INTO message VALUES (
  'msg_legacy_assistant_1',
  'ses_legacy',
  1775088010000,
  1775088050000,
  '{"role":"assistant","parentID":"msg_legacy_user_1","time":{"created":1775088010000,"completed":1775088050000},"modelID":"gpt-5.4","providerID":"openai","finish":"tool-calls","tokens":{"total":1000,"input":800,"output":120,"reasoning":30,"cache":{"read":40,"write":10}}}'
);
INSERT INTO message VALUES (
  'msg_legacy_assistant_2',
  'ses_legacy',
  1775088051000,
  1775088120000,
  '{"role":"assistant","parentID":"msg_legacy_user_1","time":{"created":1775088051000,"completed":1775088120000},"modelID":"gpt-5.4","providerID":"openai","finish":"stop","tokens":{"total":500,"input":350,"output":90,"reasoning":20,"cache":{"read":30,"write":10}}}'
);
INSERT INTO message VALUES (
  'msg_legacy_user_2',
  'ses_legacy',
  1775088300000,
  1775088300000,
  '{"role":"user","time":{"created":1775088300000},"model":{"providerID":"openai","modelID":"gpt-5.4"},"agent":"build"}'
);
INSERT INTO message VALUES (
  'msg_legacy_assistant_abort',
  'ses_legacy',
  1775088310000,
  1775088330000,
  '{"role":"assistant","parentID":"msg_legacy_user_2","time":{"created":1775088310000,"completed":1775088330000},"modelID":"gpt-5.4","providerID":"openai","finish":"error","error":{"name":"MessageAbortedError","message":"TURNSPAN_PRIVATE_CANARY_7f3b"},"tokens":{"total":100,"input":80,"output":10,"reasoning":5,"cache":{"read":5,"write":0}}}'
);

INSERT INTO session_message VALUES (
  'msg_v2_user_1',
  'ses_v2',
  'user',
  1,
  1775174400000,
  1775174400000,
  '{"time":{"created":1775174400000},"text":"TURNSPAN_PRIVATE_CANARY_7f3b v2 prompt","files":[],"agents":[]}'
);
INSERT INTO session_message VALUES (
  'msg_v2_assistant_1',
  'ses_v2',
  'assistant',
  2,
  1775174410000,
  1775174480000,
  '{"time":{"created":1775174410000,"completed":1775174480000},"agent":"build","model":{"id":"claude-opus-4-1","providerID":"anthropic"},"content":[{"type":"text","id":"txt_1","text":"TURNSPAN_PRIVATE_CANARY_7f3b response"},{"type":"tool","id":"tool_1","name":"shell","state":{"status":"completed","input":{},"structured":{},"content":[],"result":"TURNSPAN_PRIVATE_CANARY_7f3b tool output"}}],"finish":"tool-calls","tokens":{"input":100,"output":40,"reasoning":10,"cache":{"read":20,"write":5}}}'
);
INSERT INTO session_message VALUES (
  'msg_v2_assistant_2',
  'ses_v2',
  'assistant',
  3,
  1775174481000,
  1775174580000,
  '{"time":{"created":1775174481000,"completed":1775174580000},"agent":"build","model":{"id":"claude-opus-4-1","providerID":"anthropic"},"content":[{"type":"text","id":"txt_2","text":"TURNSPAN_PRIVATE_CANARY_7f3b final response"}],"finish":"stop","tokens":{"input":60,"output":30,"reasoning":5,"cache":{"read":10,"write":0}}}'
);

PRAGMA wal_checkpoint(TRUNCATE);
