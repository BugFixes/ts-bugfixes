import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  error,
  errorf,
  info,
  infof,
  parseStack,
  warn,
  warnf,
  debug,
  debugf,
  log,
  local,
  fatal,
  fatalf,
  BugFixes,
} from "./index.js";
import { resetDefaultConfig, setDefaultConfig } from "../config.js";

function makeOriginalError(message: string): Error {
  return new Error(message);
}

function clearWriteCalls(): void {
  vi.mocked(process.stdout.write).mockClear();
  vi.mocked(process.stderr.write).mockClear();
}

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

  it("error() should preserve the original stack when given an Error", () => {
    const original = makeOriginalError("boom");
    const result = error(original);

    expect(result.message).toBe("boom");
    expect(result.stack).toContain("makeOriginalError");
  });

  it("errorf() should preserve the original stack when formatting an Error", () => {
    const original = makeOriginalError("boom");
    const result = errorf("wrapped %s", original);

    expect(result.message).toBe("wrapped Error: boom");
    expect(result.stack).toContain("makeOriginalError");
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

  it("warn() should forward an existing stack to the logger", () => {
    const original = makeOriginalError("boom");
    const frame = parseStack(original.stack || "")[0];
    clearWriteCalls();
    const result = warn(original);
    const output = vi.mocked(process.stdout.write).mock.calls[0]?.[0];

    expect(result).toBe("[WARN]: Error: boom");
    expect(output).toContain(`${frame.file}:${frame.line}`);
  });

  it("warnf() should forward an existing stack to the logger", () => {
    const original = makeOriginalError("boom");
    const frame = parseStack(original.stack || "")[0];
    clearWriteCalls();
    const result = warnf("wrapped %s", original);
    const output = vi.mocked(process.stdout.write).mock.calls[0]?.[0];

    expect(result).toBe("[WARN]: wrapped Error: boom");
    expect(output).toContain(`${frame.file}:${frame.line}`);
  });

  it("debug() should return a formatted string", () => {
    const result = debug("trace value");
    expect(result).toBe("[DEBUG]: trace value");
  });

  it("debug() should forward an existing stack to the logger", () => {
    const original = makeOriginalError("boom");
    const frame = parseStack(original.stack || "")[0];
    clearWriteCalls();
    const result = debug(original);
    const output = vi.mocked(process.stdout.write).mock.calls[0]?.[0];

    expect(result).toBe("[DEBUG]: Error: boom");
    expect(output).toContain(`${frame.file}:${frame.line}`);
  });

  it("debugf() should forward an existing stack to the logger", () => {
    const original = makeOriginalError("boom");
    const frame = parseStack(original.stack || "")[0];
    clearWriteCalls();
    const result = debugf("wrapped %s", original);
    const output = vi.mocked(process.stdout.write).mock.calls[0]?.[0];

    expect(result).toBe("[DEBUG]: wrapped Error: boom");
    expect(output).toContain(`${frame.file}:${frame.line}`);
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

  it("fatal() should forward an existing stack to the logger", () => {
    const original = makeOriginalError("boom");
    const frame = parseStack(original.stack || "")[0];
    clearWriteCalls();
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(((code?: string | number | null) => {
        throw new Error(`exit:${code}`);
      }) as typeof process.exit);

    expect(() => fatal(original)).toThrow("exit:1");

    const output = vi.mocked(process.stderr.write).mock.calls[0]?.[0];
    expect(output).toContain(`${frame.file}:${frame.line}`);
    exitSpy.mockRestore();
  });

  it("fatalf() should forward an existing stack to the logger", () => {
    const original = makeOriginalError("boom");
    const frame = parseStack(original.stack || "")[0];
    clearWriteCalls();
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(((code?: string | number | null) => {
        throw new Error(`exit:${code}`);
      }) as typeof process.exit);

    expect(() => fatalf("wrapped %s", original)).toThrow("exit:1");

    const output = vi.mocked(process.stderr.write).mock.calls[0]?.[0];
    expect(output).toContain(`${frame.file}:${frame.line}`);
    exitSpy.mockRestore();
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

  it("should use the override stack for warn file and line", () => {
    const original = makeOriginalError("boom");
    const frame = parseStack(original.stack || "")[0];
    const b = new BugFixes();

    b.logAt("warn", "wrapped", original.stack);

    expect(b.file).toBe(frame.file);
    expect(b.line).toBe(frame.line);
  });

  it("should prefer app frames over compiled bundle frames", () => {
    const stack = `TypeError: fetch failed
    at fetchProjects (/Volumes/Dockcase/Projects/flags/dashboard/.next/dev/server/chunks/ssr/node_modules__pnpm_59a7dda5._.js:3430:12)
    at loadDashboardHome (/Volumes/Dockcase/Projects/flags/dashboard/src/app/page.tsx:87:19)
    at DashboardPage (/Volumes/Dockcase/Projects/flags/dashboard/src/app/page.tsx:120:5)`;
    const b = new BugFixes();

    b.logAt("error", "failed to build dashboard home fetch failed", stack);

    expect(b.file).toBe("/Volumes/Dockcase/Projects/flags/dashboard/src/app/page.tsx");
    expect(b.line).toBe(87);
    expect(b.column).toBe(19);
    expect(b.trace.fingerprint).toContain("src/app/page.tsx:87");
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
