import {
  ColorReset,
  ColorBrightRed,
  ColorBrightGreen,
  ColorBrightCyan,
  ColorBrightYellow,
  ColorBrightMagenta,
  ColorBrightWhite,
  isTTY,
  colorize,
} from "../internal/term.js";

export interface ParsedStackFrame {
  func: string;
  file: string;
  line: number;
  column: number;
  raw: string;
}

export interface PrettyStackResult {
  frames: ParsedStackFrame[];
  raw: string;
  pretty: string;
  panicFile: string;
  panicLine: number;
}

/**
 * Parse a V8 stack trace string into structured frames.
 */
export function parseStack(stack: string): ParsedStackFrame[] {
  const lines = stack.split("\n");
  const frames: ParsedStackFrame[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("at ")) continue;

    const frame = parseStackLine(trimmed);
    if (frame) {
      frames.push(frame);
    }
  }

  return frames;
}

/**
 * Parse a single "at ..." line from a V8 stack trace.
 */
function parseStackLine(line: string): ParsedStackFrame | null {
  // "at functionName (file:line:col)"
  const withParens = /^at\s+(.+?)\s+\((.+):(\d+):(\d+)\)$/;
  let match = line.match(withParens);
  if (match) {
    return {
      func: match[1],
      file: match[2],
      line: parseInt(match[3], 10),
      column: parseInt(match[4], 10),
      raw: line,
    };
  }

  // "at file:line:col" (anonymous)
  const withoutParens = /^at\s+(.+):(\d+):(\d+)$/;
  match = line.match(withoutParens);
  if (match) {
    return {
      func: "<anonymous>",
      file: match[1],
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
      raw: line,
    };
  }

  return null;
}

/**
 * Format a parsed stack trace with ANSI colors for terminal output.
 */
export function formatPrettyStack(
  frames: ParsedStackFrame[],
  errorMessage?: string,
): string {
  if (!isTTY()) {
    return frames.map((f) => f.raw).join("\n");
  }

  const lines: string[] = [];

  if (errorMessage) {
    lines.push(colorize(ColorBrightRed, `Error: ${errorMessage}`));
    lines.push("");
  }

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const isFirst = i === 0;

    const funcColor = isFirst ? ColorBrightRed : ColorBrightCyan;
    const fileColor = isFirst ? ColorBrightYellow : ColorBrightGreen;
    const lineColor = ColorBrightMagenta;

    const funcStr = colorize(funcColor, frame.func);
    const fileStr = colorize(fileColor, frame.file);
    const lineStr = colorize(lineColor, `${frame.line}:${frame.column}`);

    lines.push(`  ${funcStr}`);
    lines.push(`    ${fileStr}:${lineStr}`);
  }

  return lines.join("\n");
}

/**
 * Capture the current stack trace, skipping a given number of frames.
 */
export function captureStack(skipFrames: number = 2): string {
  const obj: { stack?: string } = {};
  Error.captureStackTrace(obj, captureStack);

  if (!obj.stack) return "";

  const lines = obj.stack.split("\n");
  // Skip the "Error" header line and the requested number of frames
  return ["Error", ...lines.slice(1 + skipFrames)].join("\n");
}

/**
 * Full pipeline: capture, parse, and pretty-print the current stack.
 */
export function printPrettyStack(error: unknown): void {
  let message: string;
  let stack: string;

  if (error instanceof Error) {
    message = error.message;
    stack = error.stack || "";
  } else {
    message = String(error);
    stack = captureStack(1);
  }

  const frames = parseStack(stack);
  const pretty = formatPrettyStack(frames, message);
  process.stderr.write(pretty + "\n");
}

/**
 * Extract file and line from the first relevant frame (skipping internal frames).
 */
export function findCaller(
  skipPatterns: string[] = ["ts-bugfixes/src/logs/"],
  skipDepth: number = 0,
): { file: string; line: number } {
  const err = new Error();
  const stack = err.stack || "";
  const frames = parseStack(stack);

  let skipped = 0;
  for (const frame of frames) {
    const isInternal = skipPatterns.some((p) => frame.file.includes(p));
    if (isInternal) continue;

    if (skipped < skipDepth) {
      skipped++;
      continue;
    }

    return { file: frame.file, line: frame.line };
  }

  return { file: "unknown", line: 0 };
}
