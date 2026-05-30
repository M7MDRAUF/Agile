/**
 * OPS-003 structured logger. Minimal Pino-compatible JSON output without the
 * dependency, so swapping in Pino later is one import change. All entries are
 * single-line JSON for log aggregators.
 */
import { randomUUID } from "node:crypto";

type Level = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

function emit(level: Level, msg: string, fields?: LogFields): void {
  const entry = {
    level,
    time: new Date().toISOString(),
    msg,
    ...(fields ?? {}),
  };
  const line = JSON.stringify(entry, (_k, v) =>
    v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v,
  );
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, fields?: LogFields) => emit("debug", msg, fields),
  info: (msg: string, fields?: LogFields) => emit("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => emit("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => emit("error", msg, fields),
};

/**
 * BUG-L02: log a server-side error with a fresh correlation ID and return that
 * ID so the caller can surface it to the client WITHOUT leaking the raw error
 * message/stack. The full error stays in the server logs; the user only ever
 * sees an opaque reference they can quote to support.
 */
export function logErrorWithId(msg: string, error: unknown, fields?: LogFields): string {
  const correlationId = randomUUID();
  emit("error", msg, {
    correlationId,
    err: error instanceof Error ? error : new Error(String(error)),
    ...(fields ?? {}),
  });
  return correlationId;
}
