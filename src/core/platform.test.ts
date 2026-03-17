import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isNode,
  isBrowser,
  writeOutput,
  isTTY,
  getEnv,
  randomUUID,
  now,
  exit,
  byteLength,
  signJWT,
} from "./platform.js";

describe("Platform detection", () => {
  it("isNode should be true in Node.js", () => {
    expect(isNode).toBe(true);
  });

  it("isBrowser should be false in Node.js", () => {
    expect(isBrowser).toBe(false);
  });
});

describe("writeOutput", () => {
  beforeEach(() => {
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should write to stdout", () => {
    writeOutput("stdout", "hello\n");
    expect(process.stdout.write).toHaveBeenCalledWith("hello\n");
  });

  it("should write to stderr", () => {
    writeOutput("stderr", "error\n");
    expect(process.stderr.write).toHaveBeenCalledWith("error\n");
  });
});

describe("isTTY", () => {
  it("should return a boolean", () => {
    expect(typeof isTTY()).toBe("boolean");
  });
});

describe("getEnv", () => {
  it("should return an environment variable value", () => {
    process.env.TEST_PLATFORM_VAR = "test-value";
    expect(getEnv("TEST_PLATFORM_VAR")).toBe("test-value");
    delete process.env.TEST_PLATFORM_VAR;
  });

  it("should return undefined for unset variables", () => {
    delete process.env.TEST_PLATFORM_UNSET;
    expect(getEnv("TEST_PLATFORM_UNSET")).toBeUndefined();
  });
});

describe("randomUUID", () => {
  it("should return a valid UUID string", () => {
    const uuid = randomUUID();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("should return unique values", () => {
    const a = randomUUID();
    const b = randomUUID();
    expect(a).not.toBe(b);
  });
});

describe("now", () => {
  it("should return a number", () => {
    expect(typeof now()).toBe("number");
  });

  it("should increase over time", async () => {
    const a = now();
    await new Promise((resolve) => setTimeout(resolve, 5));
    const b = now();
    expect(b).toBeGreaterThan(a);
  });
});

describe("exit", () => {
  it("should call process.exit in Node.js", () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(((code?: number) => {
        throw new Error(`exit:${code}`);
      }) as typeof process.exit);

    expect(() => exit(1)).toThrow("exit:1");
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });
});

describe("byteLength", () => {
  it("should return correct byte length for ASCII", () => {
    expect(byteLength("hello")).toBe(5);
  });

  it("should return correct byte length for multi-byte characters", () => {
    // "é" is 2 bytes in UTF-8
    expect(byteLength("é")).toBe(2);
    // emoji is 4 bytes
    expect(byteLength("😀")).toBe(4);
  });

  it("should return 0 for empty string", () => {
    expect(byteLength("")).toBe(0);
  });
});

describe("signJWT", () => {
  function decodeJWTPart(part: string): Record<string, unknown> {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  }

  it("should produce a valid 3-part JWT", async () => {
    const token = await signJWT({ foo: "bar" }, "secret");
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
  });

  it("should set alg to HS256 in header", async () => {
    const token = await signJWT({ foo: "bar" }, "secret");
    const header = decodeJWTPart(token.split(".")[0]);
    expect(header.alg).toBe("HS256");
    expect(header.typ).toBe("JWT");
  });

  it("should include payload fields and iat", async () => {
    const token = await signJWT({ user: "alice" }, "secret");
    const payload = decodeJWTPart(token.split(".")[1]);
    expect(payload.user).toBe("alice");
    expect(payload.iat).toBeTypeOf("number");
  });

  it("should produce different signatures for different secrets", async () => {
    const a = await signJWT({ x: 1 }, "secret-a");
    const b = await signJWT({ x: 1 }, "secret-b");
    // Signatures (third part) should differ
    expect(a.split(".")[2]).not.toBe(b.split(".")[2]);
  });

  it("should handle large payloads without RangeError", async () => {
    // Create a payload large enough to exceed the ~65K spread argument limit
    const largeStack = "at SomeFunction (/path/to/file.ts:1:1)\n".repeat(2000);
    const payload = {
      message: "test error",
      stack: largeStack,
      raw: largeStack,
    };
    const token = await signJWT(payload, "secret");
    const parts = token.split(".");
    expect(parts).toHaveLength(3);

    // Verify payload is decodable
    const decoded = decodeJWTPart(parts[1]);
    expect(decoded.message).toBe("test error");
    expect((decoded.stack as string).length).toBeGreaterThan(10000);
  });
});
