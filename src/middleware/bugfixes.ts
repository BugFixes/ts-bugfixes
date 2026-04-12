import type http from "node:http";
import {
  type Config,
  getDefaultConfig,
  bugEndpoint,
  makeRequest,
} from "../config.js";
import { buildUsefulTrace, formatPrettyStack } from "../logs/pretty.js";
import { getRequestId } from "./requestid.js";
import type { BugFixesSend } from "./recoverer.js";

/**
 * Create a bugfixes reporting middleware.
 * This middleware catches errors and sends them to the Bugfixes API.
 * It's similar to recoverer but specifically designed as a
 * configurable middleware factory.
 */
export function createBugfixesMiddleware(
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
      const cfg = getDefaultConfig();

      const key = agentKey || cfg.agentKey;
      const secret = agentSecret || cfg.agentSecret;

      const message = err instanceof Error ? err.message : String(err);
      const stack =
        err instanceof Error
          ? err.stack || ""
          : new Error(String(err)).stack || "";

      const trace = buildUsefulTrace(stack);
      const pretty = formatPrettyStack(trace.frames, message);
      const topFrame = trace.topFrame;
      const reqId = getRequestId(req) || "-";

      process.stderr.write(pretty + "\n");

      if (!cfg.localOnly && key && secret) {
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

        const sendCfg: Config = { ...cfg, agentKey: key, agentSecret: secret };
        makeRequest(sendCfg, bugEndpoint(sendCfg), JSON.stringify(data)).catch(
          (sendErr) => {
            process.stderr.write(
              `bugfixes: failed to send bug report: ${sendErr.message}\n`,
            );
          },
        );
      }

      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      }
    }
  };
}
