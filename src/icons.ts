/**
 * Unicode icon support — port of old-npm outputs/console.js icon behavior.
 *
 * Icons are prepended to console output unless iconSkip is enabled.
 */

export const ICON_LOG = "\u2111"; // ℑ
export const ICON_INFO = "\u203c"; // ‼
export const ICON_ERROR = "\u2206"; // ∆

export interface IconOptions {
  iconSkip: boolean;
}

let globalIconSkip = false;

/**
 * Set the global icon skip flag.
 * Can also be set via BUGFIXES_ICON_SKIP env var.
 */
export function setIconSkip(skip: boolean): void {
  globalIconSkip = skip;
}

export function getIconSkip(): boolean {
  if (process.env.BUGFIXES_ICON_SKIP === "true" || process.env.BUGFIXES_ICON_SKIP === "1") {
    return true;
  }
  return globalIconSkip;
}

/**
 * Get the icon for a given log level, respecting iconSkip.
 */
export function getIcon(level: string): string {
  if (getIconSkip()) return "";

  switch (level) {
    case "error":
    case "fatal":
    case "crash":
    case "panic":
      return ICON_ERROR;
    case "info":
      return ICON_INFO;
    case "warn":
      return ICON_INFO;
    case "log":
    case "debug":
    default:
      return ICON_LOG;
  }
}

/**
 * Format a message with its level icon prepended.
 */
export function withIcon(level: string, message: string): string {
  const icon = getIcon(level);
  if (!icon) return message;
  return `${icon} ${message}`;
}
