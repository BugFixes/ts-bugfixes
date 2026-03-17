import type http from "node:http";
import {
  parseStack,
  formatPrettyStack,
} from "../logs/pretty.js";
import {
  type Config,
  getDefaultConfig,
  bugEndpoint,
  makeRequest,
} from "../config.js";
import { getRequestId } from "./requestid.js";
import { writeOutput } from "../core/platform.js";

export interface BugFixesSend {
  file: string;
  line: number;
  raw: string;
  bug: string;
  message: string;
  requestId: string;
  timestamp: string;
}

/**
 * Panic/error recovery middleware.
 *
 * Wraps the handler in a try/catch, catches thrown errors, logs them
 * with stack traces, and optionally sends them to the Bugfixes API.
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
 * Create a recoverer middleware with custom API credentials.
 * Use this when you need per-middleware credential overrides.
 */
export function createRecovererMiddleware(
  agentKey?: string,
  agentSecret?: string,
): (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: () => void,
) => void {
  return (req, res, next) => {
    try {
      next();
    } catch (err: unknown) {
      handleError(err, req, res, agentKey, agentSecret);
    }
  };
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
  agentKey?: string,
  agentSecret?: string,
): void {
  const message =
    err instanceof Error ? err.message : String(err);
  const stack =
    err instanceof Error ? err.stack || "" : new Error(String(err)).stack || "";

  const frames = parseStack(stack);
  const pretty = formatPrettyStack(frames, message);

  // Log to stderr
  writeOutput("stderr", pretty + "\n");

  // Attempt to send to Bugfixes API
  const cfg = getDefaultConfig();
  const reqId = getRequestId(req) || "-";
  const topFrame = frames[0];

  const key = agentKey || cfg.agentKey;
  const secret = agentSecret || cfg.agentSecret;

  if (!cfg.localOnly && key && secret) {
    const data: BugFixesSend = {
      file: topFrame?.file || "unknown",
      line: topFrame?.line || 0,
      raw: stack,
      bug: pretty,
      message,
      requestId: reqId,
      timestamp: new Date().toISOString(),
    };

    const sendCfg: Config = { ...cfg, agentKey: key, agentSecret: secret };
    makeRequest(sendCfg, bugEndpoint(sendCfg), JSON.stringify(data)).catch(
      (sendErr) => {
        writeOutput("stderr",
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
