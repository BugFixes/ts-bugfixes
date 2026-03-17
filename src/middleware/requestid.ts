import type http from "node:http";
import { randomBytes } from "node:crypto";
import os from "node:os";

export const REQUEST_ID_HEADER = "x-request-id";

let counter = 0;

function nextRequestId(): string {
  counter++;
  const hostname = os.hostname();
  const rand = randomBytes(8).toString("base64url");
  const seq = String(counter).padStart(6, "0");
  return `${hostname}/${rand}-${seq}`;
}

/**
 * Store and retrieve request IDs from a WeakMap keyed on the request object.
 */
const requestIdMap = new WeakMap<http.IncomingMessage, string>();

export function getRequestId(req: http.IncomingMessage): string | undefined {
  return requestIdMap.get(req);
}

export type Middleware = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: () => void,
) => void;

/**
 * Middleware that assigns or reads a request ID.
 */
export function requestIdMiddleware(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: () => void,
): void {
  let id = req.headers[REQUEST_ID_HEADER] as string | undefined;
  if (!id) {
    id = nextRequestId();
  }

  requestIdMap.set(req, id);
  res.setHeader("X-Request-Id", id);
  next();
}
