import { getEnv, byteLength, signJWT } from "./core/platform.js";

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
  const localOnly = getEnv("BUGFIXES_LOCAL_ONLY");
  const iconSkip = getEnv("BUGFIXES_ICON_SKIP");

  return {
    server: getEnv("BUGFIXES_SERVER") || DEFAULT_SERVER,
    agentKey: getEnv("BUGFIXES_AGENT_KEY") || getEnv("BUGFIXES_KEY") || "",
    agentSecret: getEnv("BUGFIXES_AGENT_SECRET") || getEnv("BUGFIXES_SECRET") || "",
    agentId: getEnv("BUGFIXES_AGENT_ID") || getEnv("BUGFIXES_ID") || "",
    logLevel: getEnv("BUGFIXES_LOG_LEVEL") || "",
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
 * Sign a payload with HMAC-SHA256 JWT using Web Crypto.
 * Works in Node 18+, browsers, and Edge Runtime.
 */
export async function signPayload(payload: unknown, secret: string): Promise<string> {
  return signJWT(payload as object, secret);
}

export async function makeRequest(
  cfg: Config,
  url: string,
  body: string,
  logLevel?: number,
): Promise<void> {
  // JWT-sign the payload if we have a secret
  let finalBody: string;
  if (cfg.agentSecret) {
    const signedMessage = await signPayload(JSON.parse(body), cfg.agentSecret);
    finalBody = JSON.stringify({
      message: signedMessage,
      ...(logLevel !== undefined ? { logLevel } : {}),
    });
  } else {
    finalBody = body;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Content-Length": String(byteLength(finalBody)),
    "X-API-KEY": cfg.agentKey,
    "X-API-SECRET": cfg.agentSecret,
  };

  if (cfg.agentId) {
    headers["X-API-ID"] = cfg.agentId;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), cfg.httpTimeout);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: finalBody,
      signal: controller.signal,
    });
    // Drain response body
    await response.text();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("request timeout");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
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
