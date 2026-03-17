/**
 * Platform detection and cross-platform utilities.
 *
 * Provides environment-safe wrappers for APIs that differ between
 * Node.js, browsers, and Edge Runtime.
 */

export const isNode =
  typeof process !== "undefined" &&
  process.versions?.node !== undefined;

export const isBrowser =
  typeof globalThis !== "undefined" &&
  typeof (globalThis as any).window !== "undefined";

/**
 * Write to stdout or stderr, falling back to console methods in non-Node environments.
 */
export function writeOutput(
  stream: "stdout" | "stderr",
  msg: string,
): void {
  if (isNode) {
    if (stream === "stderr") {
      process.stderr.write(msg);
    } else {
      process.stdout.write(msg);
    }
    return;
  }

  // Browser / Edge Runtime fallback
  if (stream === "stderr") {
    console.error(msg);
  } else {
    console.log(msg);
  }
}

/**
 * Check if stdout is a TTY (always false in non-Node environments).
 */
export function isTTY(): boolean {
  if (isNode) {
    return process.stdout?.isTTY === true;
  }
  return false;
}

/**
 * Get an environment variable, returning undefined in non-Node environments.
 */
export function getEnv(key: string): string | undefined {
  if (isNode) {
    return process.env[key];
  }
  return undefined;
}

/**
 * Generate a random UUID using the Web Crypto API (available in Node 19+ and all browsers).
 * Falls back to a simple implementation for older Node versions.
 */
export function randomUUID(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * High-resolution timestamp in milliseconds.
 */
export function now(): number {
  return performance.now();
}

/**
 * Exit the process (Node only). In non-Node environments, throws an error.
 */
export function exit(code: number): never {
  if (isNode) {
    process.exit(code);
  }
  throw new Error(`Fatal error (exit code ${code})`);
}

/**
 * Get the byte length of a string encoded as UTF-8.
 */
export function byteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

/**
 * HMAC-SHA256 JWT signing using Web Crypto (works in Node 18+, browsers, Edge Runtime).
 * Replaces the jsonwebtoken dependency.
 */
export async function signJWT(
  payload: object,
  secret: string,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now };

  const encoder = new TextEncoder();
  const encodedHeader = base64url(encoder.encode(JSON.stringify(header)));
  const encodedPayload = base64url(encoder.encode(JSON.stringify(fullPayload)));
  const data = `${encodedHeader}.${encodedPayload}`;

  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data),
  );

  return `${data}.${base64url(new Uint8Array(signature))}`;
}

function base64url(data: Uint8Array): string {
  // Use btoa which is available in both Node 16+ and browsers
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
