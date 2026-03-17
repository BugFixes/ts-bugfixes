/**
 * ANSI terminal color codes and TTY detection.
 */

export const ColorReset = "\x1b[0m";

export const ColorRed = "\x1b[31m";
export const ColorGreen = "\x1b[32m";
export const ColorYellow = "\x1b[33m";
export const ColorCyan = "\x1b[36m";

export const ColorBrightRed = "\x1b[91m";
export const ColorBrightGreen = "\x1b[92m";
export const ColorBrightYellow = "\x1b[93m";
export const ColorBrightBlue = "\x1b[94m";
export const ColorBrightMagenta = "\x1b[95m";
export const ColorBrightCyan = "\x1b[96m";
export const ColorBrightWhite = "\x1b[97m";

export function isTTY(): boolean {
  return process.stdout.isTTY === true;
}

export function colorize(color: string, text: string): string {
  if (!isTTY()) return text;
  return `${color}${text}${ColorReset}`;
}
