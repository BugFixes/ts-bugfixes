import type http from "node:http";
import {
  buildUsefulTrace,
  formatPrettyStack,
} from "../logs/pretty.js";
import type { UsefulTrace } from "../logs/pretty.js";
import {
  type Config,
  getDefaultConfig,
  bugEndpoint,
  makeRequest,
} from "../config.js";
import { getRequestId } from "./requestid.js";

export interface BugFixesSend {
  file: string;
  line: number;
  column: number;
  raw: string;
  bug: string;
  message: string;
  errorName: string;
  fingerprint: string;
  trace: UsefulTrace;
  requestId: string;
  timestamp: string;
}

/**
 * Panic/error recovery middleware.
 *
 * Wraps the handler in a try/catch (via domain or async), catches
 * uncaught errors, logs them with stack traces, and optionally
 * sends them to the Bugfixes API.
 *
 * Note: Node.js doesn't have Go-style panics, so this catches thrown
 * errors and unhandled promise rejections within the request scope.
 */
export function recovererMiddleware(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: () => void,
): void {
  try {
    next();
  } catch (err: unknown) {
    handleError(err, req, res);
  }
}

/**
 * Create a recoverer middleware that wraps async handlers.
 * Use this when your handler is async or returns a promise.
 */
export function asyncRecoverer(
  handler: (
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ) => Promise<void>,
): (req: http.IncomingMessage, res: http.ServerResponse) => void {
  return (req, res) => {
    handler(req, res).catch((err) => {
      handleError(err, req, res);
    });
  };
}

function handleError(
  err: unknown,
  req: http.IncomingMessage,
  res: http.ServerResponse,
): void {
  const message =
    err instanceof Error ? err.message : String(err);
  const stack =
    err instanceof Error ? err.stack || "" : new Error(String(err)).stack || "";

  const trace = buildUsefulTrace(stack);
  const pretty = formatPrettyStack(trace.frames, message);

  // Log to stderr
  process.stderr.write(pretty + "\n");

  // Attempt to send to Bugfixes API
  const cfg = getDefaultConfig();
  const reqId = getRequestId(req) || "-";
  const topFrame = trace.topFrame;

  if (!cfg.localOnly && cfg.agentKey && cfg.agentSecret) {
    const data: BugFixesSend = {
      file: topFrame?.file || "unknown",
      line: topFrame?.line || 0,
      column: topFrame?.column || 0,
      raw: stack,
      bug: pretty,
      message,
      errorName: trace.errorName,
      fingerprint: trace.fingerprint,
      trace,
      requestId: reqId,
      timestamp: new Date().toISOString(),
    };

    makeRequest(cfg, bugEndpoint(cfg), JSON.stringify(data)).catch(
      (sendErr) => {
        process.stderr.write(
          `bugfixes: failed to send bug report: ${sendErr.message}\n`,
        );
      },
    );
  }

  // Send 500 response if headers haven't been sent
  if (!res.headersSent) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
}
