import http from "node:http";
import https from "node:https";
import jwt from "jsonwebtoken";

export interface Config {
  server: string;
  agentKey: string;
  agentSecret: string;
  agentId: string;
  logLevel: string;
  localOnly: boolean;
  iconSkip: boolean;
  httpTimeout: number; // milliseconds
}

const DEFAULT_SERVER = "https://api.bugfix.es/v1";

let defaultConfig: Config = {
  server: DEFAULT_SERVER,
  agentKey: "",
  agentSecret: "",
  agentId: "",
  logLevel: "",
  localOnly: false,
  iconSkip: false,
  httpTimeout: 10_000,
};

export function loadConfigFromEnv(): Config {
  const localOnly = process.env.BUGFIXES_LOCAL_ONLY;
  const iconSkip = process.env.BUGFIXES_ICON_SKIP;

  return {
    server: process.env.BUGFIXES_SERVER || DEFAULT_SERVER,
    agentKey: process.env.BUGFIXES_AGENT_KEY || process.env.BUGFIXES_KEY || "",
    agentSecret: process.env.BUGFIXES_AGENT_SECRET || process.env.BUGFIXES_SECRET || "",
    agentId: process.env.BUGFIXES_AGENT_ID || process.env.BUGFIXES_ID || "",
    logLevel: process.env.BUGFIXES_LOG_LEVEL || "",
    localOnly: localOnly === "true" || localOnly === "1",
    iconSkip: iconSkip === "true" || iconSkip === "1",
    httpTimeout: 10_000,
  };
}

export function getDefaultConfig(): Config {
  return { ...defaultConfig };
}

export function setDefaultConfig(cfg: Partial<Config>): void {
  defaultConfig = mergeConfig(defaultConfig, cfg);
}

export function resetDefaultConfig(): void {
  defaultConfig = {
    server: DEFAULT_SERVER,
    agentKey: "",
    agentSecret: "",
    agentId: "",
    logLevel: "",
    localOnly: false,
    iconSkip: false,
    httpTimeout: 10_000,
  };
}

export function mergeConfig(base: Config, override: Partial<Config>): Config {
  return {
    server: override.server || base.server,
    agentKey: override.agentKey || base.agentKey,
    agentSecret: override.agentSecret || base.agentSecret,
    agentId: override.agentId || base.agentId,
    logLevel: override.logLevel || base.logLevel,
    // localOnly can only be upgraded to true, never downgraded
    localOnly: base.localOnly || (override.localOnly ?? false),
    iconSkip: override.iconSkip ?? base.iconSkip,
    httpTimeout: override.httpTimeout || base.httpTimeout,
  };
}

export function logEndpoint(cfg: Config): string {
  return `${cfg.server}/log`;
}

export function bugEndpoint(cfg: Config): string {
  return `${cfg.server}/bug`;
}

/**
 * Sign a payload with JWT using the agent secret.
 * Matches the old-npm behavior where the message is JWT-signed before sending.
 */
export function signPayload(payload: unknown, secret: string): string {
  return jwt.sign(payload as object, secret);
}

export function makeRequest(
  cfg: Config,
  url: string,
  body: string,
  logLevel?: number,
): Promise<void> {
  const parsedUrl = new URL(url);
  const transport = parsedUrl.protocol === "https:" ? https : http;

  // JWT-sign the payload if we have a secret (matches old-npm behavior)
  let finalBody: string;
  if (cfg.agentSecret) {
    const signedMessage = signPayload(JSON.parse(body), cfg.agentSecret);
    finalBody = JSON.stringify({
      message: signedMessage,
      ...(logLevel !== undefined ? { logLevel } : {}),
    });
  } else {
    finalBody = body;
  }

  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(finalBody)),
      "X-API-KEY": cfg.agentKey,
      "X-API-SECRET": cfg.agentSecret,
    };

    // Include X-API-ID if agent ID is configured (matches old-npm)
    if (cfg.agentId) {
      headers["X-API-ID"] = cfg.agentId;
    }

    const req = transport.request(
      parsedUrl,
      {
        method: "POST",
        headers,
        timeout: cfg.httpTimeout,
      },
      (res) => {
        res.resume(); // drain response
        resolve();
      },
    );

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("request timeout"));
    });

    req.write(finalBody);
    req.end();
  });
}

export const LogLevelValues: Record<string, number> = {
  debug: 1,
  log: 2,
  info: 3,
  warn: 4,
  error: 5,
  fatal: 6,
  crash: 6,
  panic: 6,
};

export function convertLevelFromString(s: string): number {
  return LogLevelValues[s.toLowerCase()] ?? 9;
}
