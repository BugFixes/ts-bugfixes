import { describe, it, expect } from "vitest";
import { signPayload } from "./config.js";

function decodeJWTPart(part: string): Record<string, unknown> {
  // Convert base64url to base64
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const json = atob(padded);
  return JSON.parse(json);
}

describe("JWT Signing (Web Crypto)", () => {
  it("should sign a payload with the given secret", async () => {
    const payload = { message: "test", level: "error" };
    const secret = "my-secret-key";
    const signed = await signPayload(payload, secret);

    expect(typeof signed).toBe("string");
    const parts = signed.split(".");
    expect(parts).toHaveLength(3); // JWT has 3 parts

    // Verify header
    const header = decodeJWTPart(parts[0]);
    expect(header.alg).toBe("HS256");
    expect(header.typ).toBe("JWT");

    // Verify payload can be decoded
    const decoded = decodeJWTPart(parts[1]);
    expect(decoded.message).toBe("test");
    expect(decoded.level).toBe("error");
    expect(decoded.iat).toBeTypeOf("number");
  });

  it("should produce different tokens for different secrets", async () => {
    const payload = { message: "test" };
    const signed1 = await signPayload(payload, "secret-1");
    const signed2 = await signPayload(payload, "secret-2");
    expect(signed1).not.toBe(signed2);
  });

  it("should include iat claim", async () => {
    const payload = { message: "test" };
    const signed = await signPayload(payload, "secret");
    const parts = signed.split(".");
    const decoded = decodeJWTPart(parts[1]);
    expect(decoded.iat).toBeTypeOf("number");
    // iat should be close to current time
    const nowSeconds = Math.floor(Date.now() / 1000);
    expect(decoded.iat as number).toBeGreaterThanOrEqual(nowSeconds - 2);
    expect(decoded.iat as number).toBeLessThanOrEqual(nowSeconds + 2);
  });
});
