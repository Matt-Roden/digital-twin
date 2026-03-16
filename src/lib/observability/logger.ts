type LogLevel = "info" | "warn" | "error" | "debug";

interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  service: string;
  traceId?: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, service: string, message: string, meta?: Record<string, unknown>) {
  const entry: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    ...(meta && { metadata: meta }),
  };

  const line = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      console.debug(line);
      break;
    default:
      console.log(line);
  }
}

export function createLogger(service: string) {
  return {
    debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", service, msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => emit("info", service, msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", service, msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => emit("error", service, msg, meta),
    child: (childService: string) => createLogger(`${service}.${childService}`),
  };
}

/**
 * Compatibility wrapper for simple structured logging.
 */
export function log(
  node: string,
  data: Record<string, unknown> = {},
  level: LogLevel = "info"
): void {
  emit(level, node, JSON.stringify(data), data);
}

export async function withTrace<T>(
  name: string,
  traceId: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  emit("info", name, "start", { traceId });

  try {
    const result = await fn();
    emit("info", name, "end", { traceId, durationMs: Date.now() - start });
    return result;
  } catch (error) {
    emit("error", name, "error", {
      traceId,
      error: String(error),
      durationMs: Date.now() - start,
    });
    throw error;
  }
}
