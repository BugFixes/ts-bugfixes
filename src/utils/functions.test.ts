import { describe, it, expect } from "vitest";
import {
  checkIfDefined,
  result,
  errorResult,
  defaultError,
  createVerify,
  lambdaResult,
  lambdaError,
} from "./functions.js";

describe("Functions (old-npm parity)", () => {
  describe("checkIfDefined", () => {
    it("should return true for defined values", () => {
      expect(checkIfDefined("hello")).toBe(true);
      expect(checkIfDefined(0)).toBe(true);
      expect(checkIfDefined(false)).toBe(true);
      expect(checkIfDefined("")).toBe(true);
      expect(checkIfDefined([])).toBe(true);
    });

    it("should return false for undefined", () => {
      expect(checkIfDefined(undefined)).toBe(false);
    });

    it("should return false for null", () => {
      expect(checkIfDefined(null)).toBe(false);
    });
  });

  describe("result", () => {
    it("should create a success response object", () => {
      const r = result(200, "OK");
      expect(r).toEqual({ code: 200, message: "OK", type: "Success" });
    });
  });

  describe("errorResult", () => {
    it("should create an error response object", () => {
      const r = errorResult(500, "Server Error");
      expect(r).toEqual({
        code: 500,
        message: "Server Error",
        type: "Error",
      });
    });
  });

  describe("defaultError", () => {
    it("should create a default error with 'Unexpected Error'", () => {
      const r = defaultError(500);
      expect(r).toEqual({
        code: 500,
        message: "Unexpected Error",
        type: "Error",
      });
    });
  });

  describe("createVerify", () => {
    it("should create a UUID v5 verification string", () => {
      // Use a valid UUID as namespace
      const namespace = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
      const v = createVerify("John", "john@example.com", namespace);
      expect(v).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    it("should produce deterministic results", () => {
      const namespace = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
      const v1 = createVerify("John", "john@example.com", namespace);
      const v2 = createVerify("John", "john@example.com", namespace);
      expect(v1).toBe(v2);
    });

    it("should produce different results for different inputs", () => {
      const namespace = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
      const v1 = createVerify("John", "john@example.com", namespace);
      const v2 = createVerify("Jane", "jane@example.com", namespace);
      expect(v1).not.toBe(v2);
    });
  });

  describe("lambdaResult", () => {
    it("should create a Lambda success response", () => {
      const r = lambdaResult(200, "OK");
      expect(r.statusCode).toBe(200);
      expect(r.headers["Content-Type"]).toBe("application/json");
      expect(r.isBase64Encoded).toBe(false);
      const body = JSON.parse(r.body);
      expect(body).toEqual({ code: 200, message: "OK", type: "Success" });
    });
  });

  describe("lambdaError", () => {
    it("should create a Lambda error response", () => {
      const r = lambdaError(500, "Fail");
      expect(r.statusCode).toBe(200);
      const body = JSON.parse(r.body);
      expect(body).toEqual({ code: 500, message: "Fail", type: "Error" });
    });
  });
});
