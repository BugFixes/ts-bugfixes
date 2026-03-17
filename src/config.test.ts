import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  loadConfigFromEnv,
  getDefaultConfig,
  setDefaultConfig,
  resetDefaultConfig,
  mergeConfig,
  logEndpoint,
  bugEndpoint,
  convertLevelFromString,
} from "./config.js";

describe("Config", () => {
  beforeEach(() => {
    resetDefaultConfig();
  });

  afterEach(() => {
    resetDefaultConfig();
    delete process.env.BUGFIXES_AGENT_KEY;
    delete process.env.BUGFIXES_AGENT_SECRET;
    delete process.env.BUGFIXES_SERVER;
    delete process.env.BUGFIXES_LOCAL_ONLY;
    delete process.env.BUGFIXES_LOG_LEVEL;
  });

  it("should load config from environment variables", () => {
    process.env.BUGFIXES_AGENT_KEY = "test-key";
    process.env.BUGFIXES_AGENT_SECRET = "test-secret";
    process.env.BUGFIXES_SERVER = "https://custom.server/v1";
    process.env.BUGFIXES_LOCAL_ONLY = "true";
    process.env.BUGFIXES_LOG_LEVEL = "warn";

    const cfg = loadConfigFromEnv();
    expect(cfg.agentKey).toBe("test-key");
    expect(cfg.agentSecret).toBe("test-secret");
    expect(cfg.server).toBe("https://custom.server/v1");
    expect(cfg.localOnly).toBe(true);
    expect(cfg.logLevel).toBe("warn");
  });

  it("should use defaults when env vars not set", () => {
    const cfg = loadConfigFromEnv();
    expect(cfg.server).toBe("https://api.bugfix.es/v1");
    expect(cfg.agentKey).toBe("");
    expect(cfg.localOnly).toBe(false);
  });

  it("should set and get default config", () => {
    setDefaultConfig({ agentKey: "my-key" });
    const cfg = getDefaultConfig();
    expect(cfg.agentKey).toBe("my-key");
    expect(cfg.server).toBe("https://api.bugfix.es/v1");
  });

  it("should merge configs correctly", () => {
    const base = getDefaultConfig();
    const merged = mergeConfig(base, { agentKey: "override-key" });
    expect(merged.agentKey).toBe("override-key");
    expect(merged.server).toBe("https://api.bugfix.es/v1");
  });

  it("should not downgrade localOnly from true to false", () => {
    const base = { ...getDefaultConfig(), localOnly: true };
    const merged = mergeConfig(base, { localOnly: false });
    expect(merged.localOnly).toBe(true);
  });

  it("should return correct endpoints", () => {
    const cfg = getDefaultConfig();
    expect(logEndpoint(cfg)).toBe("https://api.bugfix.es/v1/log");
    expect(bugEndpoint(cfg)).toBe("https://api.bugfix.es/v1/bug");
  });

  it("should convert log levels from string", () => {
    expect(convertLevelFromString("debug")).toBe(1);
    expect(convertLevelFromString("log")).toBe(2);
    expect(convertLevelFromString("info")).toBe(3);
    expect(convertLevelFromString("warn")).toBe(4);
    expect(convertLevelFromString("error")).toBe(5);
    expect(convertLevelFromString("fatal")).toBe(6);
    expect(convertLevelFromString("unknown")).toBe(9);
  });
});
