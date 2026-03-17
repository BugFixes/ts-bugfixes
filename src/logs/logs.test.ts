import { describe, it, expect, beforeEach, vi } from "vitest";
import { error, errorf, info, infof, warn, debug, log, local, BugFixes } from "./index.js";
import { resetDefaultConfig, setDefaultConfig } from "../config.js";

describe("Logs", () => {
  beforeEach(() => {
    resetDefaultConfig();
    // Suppress console output during tests
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  it("error() should return an Error", () => {
    const result = error("something went wrong");
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("something went wrong");
  });

  it("errorf() should format the message", () => {
    const result = errorf("failed with code %d", 404);
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("failed with code 404");
  });

  it("info() should return a formatted string", () => {
    const result = info("server started");
    expect(result).toBe("[INFO]: server started");
  });

  it("infof() should format the message", () => {
    const result = infof("listening on port %d", 8080);
    expect(result).toBe("[INFO]: listening on port 8080");
  });

  it("warn() should return a formatted string", () => {
    const result = warn("deprecated");
    expect(result).toBe("[WARN]: deprecated");
  });

  it("debug() should return a formatted string", () => {
    const result = debug("trace value");
    expect(result).toBe("[DEBUG]: trace value");
  });

  it("log() should return a formatted string", () => {
    const result = log("generic message");
    expect(result).toBe("[LOG]: generic message");
  });

  it("local() should create a local-only instance", () => {
    const b = local();
    expect(b).toBeInstanceOf(BugFixes);
    expect(b.localOnly).toBe(true);
  });

  it("should respect log level filtering", () => {
    setDefaultConfig({ logLevel: "error" });
    // info is below error level, so it should still return but not log
    const result = info("filtered out");
    expect(result).toBe("[INFO]: filtered out");
  });

  it("should capture stack for error level", () => {
    const b = new BugFixes();
    b.logAt("error", "test error");
    expect(b.stack).toBeTruthy();
    expect(b.stack.length).toBeGreaterThan(0);
  });

  it("should capture stack for debug level", () => {
    const b = new BugFixes();
    b.logAt("debug", "test debug");
    expect(b.stack).toBeTruthy();
  });

  it("should not capture stack for info level", () => {
    const b = new BugFixes();
    b.logAt("info", "test info");
    expect(b.stack).toBe("");
  });
});
