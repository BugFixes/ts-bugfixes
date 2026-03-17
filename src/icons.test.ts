import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ICON_LOG,
  ICON_INFO,
  ICON_ERROR,
  getIcon,
  withIcon,
  setIconSkip,
  getIconSkip,
} from "./icons.js";

describe("Icons (old-npm parity)", () => {
  beforeEach(() => {
    setIconSkip(false);
    delete process.env.BUGFIXES_ICON_SKIP;
  });

  afterEach(() => {
    setIconSkip(false);
    delete process.env.BUGFIXES_ICON_SKIP;
  });

  it("should have correct unicode icons", () => {
    expect(ICON_LOG).toBe("\u2111"); // ℑ
    expect(ICON_INFO).toBe("\u203c"); // ‼
    expect(ICON_ERROR).toBe("\u2206"); // ∆
  });

  it("should return correct icon for each level", () => {
    expect(getIcon("log")).toBe(ICON_LOG);
    expect(getIcon("debug")).toBe(ICON_LOG);
    expect(getIcon("info")).toBe(ICON_INFO);
    expect(getIcon("warn")).toBe(ICON_INFO);
    expect(getIcon("error")).toBe(ICON_ERROR);
    expect(getIcon("fatal")).toBe(ICON_ERROR);
    expect(getIcon("crash")).toBe(ICON_ERROR);
    expect(getIcon("panic")).toBe(ICON_ERROR);
  });

  it("should prepend icon to message with withIcon", () => {
    expect(withIcon("log", "hello")).toBe("\u2111 hello");
    expect(withIcon("info", "hello")).toBe("\u203c hello");
    expect(withIcon("error", "hello")).toBe("\u2206 hello");
  });

  it("should skip icons when iconSkip is set", () => {
    setIconSkip(true);
    expect(getIcon("log")).toBe("");
    expect(getIcon("error")).toBe("");
    expect(withIcon("info", "hello")).toBe("hello");
  });

  it("should skip icons via BUGFIXES_ICON_SKIP env var", () => {
    process.env.BUGFIXES_ICON_SKIP = "true";
    expect(getIconSkip()).toBe(true);
    expect(getIcon("log")).toBe("");
  });

  it("should skip icons via BUGFIXES_ICON_SKIP=1 env var", () => {
    process.env.BUGFIXES_ICON_SKIP = "1";
    expect(getIconSkip()).toBe(true);
  });
});
