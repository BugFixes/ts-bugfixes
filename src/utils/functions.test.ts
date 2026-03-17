import { describe, it, expect } from "vitest";
import { isDefined } from "./functions.js";

describe("isDefined", () => {
  it("should return true for defined values", () => {
    expect(isDefined("hello")).toBe(true);
    expect(isDefined(0)).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined("")).toBe(true);
    expect(isDefined([])).toBe(true);
  });

  it("should return false for undefined", () => {
    expect(isDefined(undefined)).toBe(false);
  });

  it("should return false for null", () => {
    expect(isDefined(null)).toBe(false);
  });

  it("should narrow types correctly", () => {
    const value: string | null | undefined = "hello";
    if (isDefined(value)) {
      // TypeScript should narrow this to string
      const _str: string = value;
      expect(_str).toBe("hello");
    }
  });
});
