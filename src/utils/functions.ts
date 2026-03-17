/**
 * Utility functions — port of old-npm functions/index.js.
 *
 * Provides response formatting, verification, Lambda helpers,
 * and an Express-compatible error logger middleware.
 */

import { v5 as uuidV5 } from "uuid";

export interface ResponseObject {
  code: number;
  message: string;
  type: "Success" | "Error";
}

export interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded: boolean;
}

/**
 * Check if a value is defined (not undefined and not null).
 */
export function checkIfDefined(attribute: unknown): boolean {
  if (typeof attribute === "undefined") return false;
  if (attribute === null) return false;
  return true;
}

/**
 * Create a success response object.
 */
export function result(code: number, message: string): ResponseObject {
  return { code, message, type: "Success" };
}

/**
 * Create an error response object.
 */
export function errorResult(code: number, message: string): ResponseObject {
  return { code, message, type: "Error" };
}

/**
 * Create a default error response with "Unexpected Error" message.
 */
export function defaultError(code: number): ResponseObject {
  return errorResult(code, "Unexpected Error");
}

/**
 * Create a UUID v5 verification string from name, email, and namespace ID.
 */
export function createVerify(
  name: string,
  email: string,
  id: string,
): string {
  const verifyString = JSON.stringify({ name, email });
  return uuidV5(verifyString, id);
}

/**
 * Create an AWS Lambda success response.
 */
export function lambdaResult(code: number, message: string): LambdaResponse {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result(code, message)),
    isBase64Encoded: false,
  };
}

/**
 * Create an AWS Lambda error response.
 */
export function lambdaError(code: number, message: string): LambdaResponse {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(errorResult(code, message)),
    isBase64Encoded: false,
  };
}
