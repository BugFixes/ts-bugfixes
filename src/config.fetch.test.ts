import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeRequest, getDefaultConfig, resetDefaultConfig } from "./config.js";

describe("makeRequest (fetch-based)", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    resetDefaultConfig();
    fetchSpy = vi.fn().mockResolvedValue({
      text: () => Promise.resolve(""),
    });
    globalThis.fetch = fetchSpy;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetDefaultConfig();
  });

  it("should call fetch with POST method", async () => {
    const cfg = { ...getDefaultConfig(), agentKey: "key", agentSecret: "" };
    await makeRequest(cfg, "https://api.bugfix.es/v1/log", '{"msg":"hello"}');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.bugfix.es/v1/log");
    expect(opts.method).toBe("POST");
  });

  it("should set correct headers", async () => {
    const cfg = {
      ...getDefaultConfig(),
      agentKey: "my-key",
      agentSecret: "",
      agentId: "my-id",
    };
    await makeRequest(cfg, "https://api.bugfix.es/v1/log", '{"msg":"test"}');

    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.headers["Content-Type"]).toBe("application/json");
    expect(opts.headers["X-API-KEY"]).toBe("my-key");
    expect(opts.headers["X-API-ID"]).toBe("my-id");
  });

  it("should not include X-API-ID when agentId is empty", async () => {
    const cfg = { ...getDefaultConfig(), agentKey: "key", agentSecret: "" };
    await makeRequest(cfg, "https://api.bugfix.es/v1/log", '{"msg":"test"}');

    const [, opts] = fetchSpy.mock.calls[0];
    expect(opts.headers["X-API-ID"]).toBeUndefined();
  });

  it("should JWT-sign the body when agentSecret is set", async () => {
    const cfg = {
      ...getDefaultConfig(),
      agentKey: "key",
      agentSecret: "my-secret",
    };
    await makeRequest(cfg, "https://api.bugfix.es/v1/log", '{"msg":"test"}');

    const [, opts] = fetchSpy.mock.calls[0];
    const body = JSON.parse(opts.body);
    // Should have a JWT message field
    expect(body.message).toBeTypeOf("string");
    expect(body.message.split(".")).toHaveLength(3); // JWT format
  });

  it("should include logLevel in signed body when provided", async () => {
    const cfg = {
      ...getDefaultConfig(),
      agentKey: "key",
      agentSecret: "secret",
    };
    await makeRequest(
      cfg,
      "https://api.bugfix.es/v1/log",
      '{"msg":"test"}',
      5,
    );

    const [, opts] = fetchSpy.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.logLevel).toBe(5);
  });

  it("should throw on fetch failure", async () => {
    fetchSpy.mockRejectedValue(new Error("network error"));
    const cfg = { ...getDefaultConfig(), agentKey: "key", agentSecret: "" };

    await expect(
      makeRequest(cfg, "https://api.bugfix.es/v1/log", '{"msg":"test"}'),
    ).rejects.toThrow("network error");
  });

  it("should throw on timeout", async () => {
    fetchSpy.mockImplementation(
      () => new Promise((_, reject) => {
        const err = new Error("aborted");
        err.name = "AbortError";
        setTimeout(() => reject(err), 5);
      }),
    );
    const cfg = {
      ...getDefaultConfig(),
      agentKey: "key",
      agentSecret: "",
      httpTimeout: 1,
    };

    await expect(
      makeRequest(cfg, "https://api.bugfix.es/v1/log", '{"msg":"test"}'),
    ).rejects.toThrow("request timeout");
  });
});
