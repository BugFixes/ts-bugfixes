/**
 * Logging package — public API.
 *
 * Provides leveled logging with stack trace capture and optional
 * remote reporting to api.bugfix.es.
 */

import { BugFixes, ERROR, WARN, INFO, DEBUG, LOG, FATAL } from "./logging.js";
import { exit } from "../core/platform.js";
export { BugFixes, ERROR, WARN, INFO, DEBUG, LOG, FATAL } from "./logging.js";
export {
  printPrettyStack,
  parseStack,
  formatPrettyStack,
  captureStack,
  findCaller,
} from "./pretty.js";
export type { ParsedStackFrame, PrettyStackResult } from "./pretty.js";
export type { BugFixesData } from "./logging.js";

// --- Package-level convenience functions ---

export function error(...inputs: unknown[]): Error {
  const b = new BugFixes();
  return b.logAt(
    ERROR,
    formatErrorInputs(inputs),
    findFirstErrorStack(inputs),
  ) as Error;
}

export function errorf(format: string, ...inputs: unknown[]): Error {
  const b = new BugFixes();
  return b.logAt(
    ERROR,
    sprintf(format, inputs),
    findFirstErrorStack(inputs),
  ) as Error;
}

export function warn(...inputs: unknown[]): string {
  const b = new BugFixes();
  return b.logAt(WARN, formatInputs(inputs), findFirstErrorStack(inputs)) as string;
}

export function warnf(format: string, ...inputs: unknown[]): string {
  const b = new BugFixes();
  return b.logAt(WARN, sprintf(format, inputs), findFirstErrorStack(inputs)) as string;
}

export function info(...inputs: unknown[]): string {
  const b = new BugFixes();
  return b.logAt(INFO, formatInputs(inputs)) as string;
}

export function infof(format: string, ...inputs: unknown[]): string {
  const b = new BugFixes();
  return b.logAt(INFO, sprintf(format, inputs)) as string;
}

export function debug(...inputs: unknown[]): string {
  const b = new BugFixes();
  return b.logAt(DEBUG, formatInputs(inputs), findFirstErrorStack(inputs)) as string;
}

export function debugf(format: string, ...inputs: unknown[]): string {
  const b = new BugFixes();
  return b.logAt(DEBUG, sprintf(format, inputs), findFirstErrorStack(inputs)) as string;
}

export function log(...inputs: unknown[]): string {
  const b = new BugFixes();
  return b.logAt(LOG, formatInputs(inputs)) as string;
}

export function logf(format: string, ...inputs: unknown[]): string {
  const b = new BugFixes();
  return b.logAt(LOG, sprintf(format, inputs)) as string;
}

export function fatal(...inputs: unknown[]): never {
  const b = new BugFixes();
  b.logAt(FATAL, formatInputs(inputs), findFirstErrorStack(inputs));
  return exit(1);
}

export function fatalf(format: string, ...inputs: unknown[]): never {
  const b = new BugFixes();
  b.logAt(FATAL, sprintf(format, inputs), findFirstErrorStack(inputs));
  return exit(1);
}

/**
 * Create a local-only logger (never sends to remote API).
 */
export function local(skipDepthOverride: number = 0): BugFixes {
  return BugFixes.local(skipDepthOverride);
}

// --- Helpers ---

function formatInputs(inputs: unknown[]): string {
  return inputs.map((i) => String(i)).join(" ");
}

function formatErrorInputs(inputs: unknown[]): string {
  return inputs
    .map((input) => (input instanceof Error ? input.message : String(input)))
    .join(" ");
}

function findFirstErrorStack(inputs: unknown[]): string | undefined {
  return inputs.find((input): input is Error => input instanceof Error)?.stack;
}

/**
 * Simple sprintf-style formatter supporting %s, %d, %f, %j.
 */
function sprintf(format: string, args: unknown[]): string {
  let i = 0;
  return format.replace(/%([sdfj%])/g, (match, specifier) => {
    if (specifier === "%") return "%";
    if (i >= args.length) return match;
    const arg = args[i++];
    switch (specifier) {
      case "s":
        return String(arg);
      case "d":
        return Number(arg).toString();
      case "f":
        return Number(arg).toString();
      case "j":
        return JSON.stringify(arg);
      default:
        return String(arg);
    }
  });
}
