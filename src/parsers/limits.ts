export const MAX_JSONL_LINE_BYTES = 8 * 1024 * 1024;

const utf8Encoder = new TextEncoder();

export function* iterateJsonlLines(text: string): Generator<string> {
  let start = 0;
  while (start <= text.length) {
    const newline = text.indexOf("\n", start);
    const end = newline === -1 ? text.length : newline;
    const carriageReturn = end > start && text.charCodeAt(end - 1) === 13;
    yield text.slice(start, carriageReturn ? end - 1 : end);
    if (newline === -1) {
      return;
    }
    start = newline + 1;
  }
}

export function isOversizedJsonlLine(line: string): boolean {
  if (line.length > MAX_JSONL_LINE_BYTES) {
    return true;
  }
  return utf8Encoder.encode(line).byteLength > MAX_JSONL_LINE_BYTES;
}
