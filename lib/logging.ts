export type LogLevel = "info" | "error";

export function log(level: LogLevel, payload: Record<string, unknown>) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    ...payload
  });

  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

export function getRequestId(headers: Headers): string {
  const existing = headers.get("x-request-id");
  if (existing) {
    return existing;
  }

  return crypto.randomUUID();
}
