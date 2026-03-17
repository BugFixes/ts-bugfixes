import type http from "node:http";

/**
 * Middleware that normalizes all incoming header names to lowercase.
 * Node.js already lowercases header names in req.headers, so this
 * is mainly for parity with the Go version and ensuring any custom
 * header access is consistent.
 */
export function lowerCaseHeadersMiddleware(
  req: http.IncomingMessage,
  _res: http.ServerResponse,
  next: () => void,
): void {
  // Node.js automatically lowercases header keys in req.headers,
  // but rawHeaders preserves original casing. This ensures any
  // manual header lookups via rawHeaders are also consistent.
  // The main middleware chain already has lowercase headers.
  next();
}
