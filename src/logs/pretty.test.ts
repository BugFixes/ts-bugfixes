import { describe, it, expect } from "vitest";
import { parseStack, findCaller, captureStack } from "./pretty.js";

describe("Pretty Stack", () => {
  it("should parse V8 stack trace", () => {
    const stack = `Error: test
    at Object.someFunction (/path/to/file.ts:10:5)
    at Module._compile (node:internal/modules/cjs/loader:1234:14)
    at /path/to/anonymous.ts:20:10`;

    const frames = parseStack(stack);
    expect(frames).toHaveLength(3);

    expect(frames[0].func).toBe("Object.someFunction");
    expect(frames[0].file).toBe("/path/to/file.ts");
    expect(frames[0].line).toBe(10);
    expect(frames[0].column).toBe(5);

    expect(frames[2].func).toBe("<anonymous>");
    expect(frames[2].file).toBe("/path/to/anonymous.ts");
    expect(frames[2].line).toBe(20);
  });

  it("should handle empty stack", () => {
    const frames = parseStack("");
    expect(frames).toHaveLength(0);
  });

  it("should capture stack trace", () => {
    const stack = captureStack(0);
    expect(stack).toContain("at ");
  });

  it("findCaller should return file and line", () => {
    const caller = findCaller(["nonexistent-pattern"]);
    expect(caller.file).toBeTruthy();
    expect(caller.line).toBeGreaterThan(0);
  });
});
