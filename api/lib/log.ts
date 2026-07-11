export function reqId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function log(event: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }));
}
