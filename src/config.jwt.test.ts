import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { signPayload } from "./config.js";

describe("JWT Signing", () => {
  it("should sign a payload with the given secret", () => {
    const payload = { message: "test", level: "error" };
    const secret = "my-secret-key";
    const signed = signPayload(payload, secret);

    expect(typeof signed).toBe("string");
    expect(signed.split(".")).toHaveLength(3); // JWT has 3 parts

    // Verify it can be decoded back
    const decoded = jwt.verify(signed, secret) as Record<string, unknown>;
    expect(decoded.message).toBe("test");
    expect(decoded.level).toBe("error");
  });

  it("should produce different tokens for different secrets", () => {
    const payload = { message: "test" };
    const signed1 = signPayload(payload, "secret-1");
    const signed2 = signPayload(payload, "secret-2");
    expect(signed1).not.toBe(signed2);
  });

  it("should fail verification with wrong secret", () => {
    const payload = { message: "test" };
    const signed = signPayload(payload, "correct-secret");
    expect(() => jwt.verify(signed, "wrong-secret")).toThrow();
  });
});
