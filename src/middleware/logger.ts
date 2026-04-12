import type http from "node:http";
import {
  colorize,
  ColorBrightRed,
  ColorBrightYellow,
  ColorBrightGreen,
  ColorBrightCyan,
  ColorBrightBlue,
  ColorBrightMagenta,
  ColorBrightWhite,
} from "../internal/term.js";
import { wrapResponse } from "./wrapwriter.js";
import { getRequestId } from "./requestid.js";
import { writeOutput, now } from "../core/platform.js";

function statusColor(status: number): string {
  if (status < 200) return ColorBrightBlue;
  if (status < 300) return ColorBrightGreen;
  if (status < 400) return ColorBrightCyan;
  if (status < 500) return ColorBrightYellow;
  return ColorBrightRed;
}

function methodColor(method: string): string {
  switch (method) {
    case "GET":
      return ColorBrightGreen;
    case "POST":
      return ColorBrightCyan;
    case "PUT":
      return ColorBrightYellow;
    case "DELETE":
      return ColorBrightRed;
    case "PATCH":
      return ColorBrightMagenta;
    default:
      return ColorBrightWhite;
  }
}

/**
 * HTTP request logging middleware.
 * Logs method, path, status, duration, and bytes written.
 */
export function loggerMiddleware(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: () => void,
): void {
  const start = now();
  const wrapper = wrapResponse(res);

  const onFinish = () => {
    res.removeListener("finish", onFinish);
    res.removeListener("close", onFinish);

    const durationMs = Math.round(now() - start);

    const method = req.method || "GET";
    const url = req.url || "/";
    const status = wrapper.statusCode;
    const bytes = wrapper.bytesWritten;
    const reqId = getRequestId(req) || "-";

    const statusStr = colorize(statusColor(status), String(status));
    const methodStr = colorize(methodColor(method), method);
    const durationStr = colorize(ColorBrightMagenta, `${durationMs}ms`);
    const bytesStr = colorize(ColorBrightWhite, `${bytes}B`);
    const idStr = colorize(ColorBrightCyan, reqId);

    writeOutput(
      "stdout",
      `${methodStr} ${url} ${statusStr} ${durationStr} ${bytesStr} ${idStr}\n`,
    );
  };

  res.on("finish", onFinish);
  res.on("close", onFinish);

  next();
}
