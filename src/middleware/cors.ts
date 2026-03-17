import type http from "node:http";

export interface CorsOptions {
  allowedOrigins: string[];
  allowedHeaders: string[];
  allowedMethods: string[];
}

const DEFAULT_CORS: CorsOptions = {
  allowedOrigins: [],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
};

/**
 * Create CORS middleware with the given options.
 */
export function createCorsMiddleware(
  options: Partial<CorsOptions> = {},
): (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: () => void,
) => void {
  const opts: CorsOptions = {
    allowedOrigins: options.allowedOrigins ?? DEFAULT_CORS.allowedOrigins,
    allowedHeaders: options.allowedHeaders ?? DEFAULT_CORS.allowedHeaders,
    allowedMethods: options.allowedMethods ?? DEFAULT_CORS.allowedMethods,
  };

  return (req, res, next) => {
    const origin = req.headers.origin || "";

    if (opts.allowedOrigins.length === 0 || isOriginAllowed(origin, opts.allowedOrigins)) {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
    }

    res.setHeader(
      "Access-Control-Allow-Methods",
      opts.allowedMethods.join(", "),
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      opts.allowedHeaders.join(", "),
    );
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Handle preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    next();
  };
}

function isOriginAllowed(origin: string, allowed: string[]): boolean {
  if (allowed.length === 0) return true;
  return allowed.some(
    (a) => a === "*" || a === origin || origin.endsWith(a),
  );
}
