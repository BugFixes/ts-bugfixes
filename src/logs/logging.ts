import {
  type Config,
  getDefaultConfig,
  mergeConfig,
  logEndpoint,
  makeRequest,
  convertLevelFromString,
  LogLevelValues,
} from "../config.js";
import {
  colorize,
  ColorBrightRed,
  ColorBrightYellow,
  ColorBrightGreen,
  ColorBrightCyan,
  ColorBrightWhite,
  ColorBrightMagenta,
} from "../internal/term.js";
import {
  captureStack,
  parseStack,
  formatPrettyStack,
  findCaller,
} from "./pretty.js";
import { withIcon } from "../icons.js";

export const LOG = "log";
export const DEBUG = "debug";
export const INFO = "info";
export const WARN = "warn";
export const ERROR = "error";
export const CRASH = "crash";
export const PANIC = "panic";
export const FATAL = "fatal";
export const UNKNOWN = "unknown";

export interface BugFixesData {
  formattedLog: string;
  level: string;
  file: string;
  line: number;
  logFmt: string;
  stack: string;
  message: string;
  error?: string;
  localOnly: boolean;
  agentId: string;
  secret: string;
  timestamp: string;
}

const LEVEL_COLORS: Record<string, string> = {
  [ERROR]: ColorBrightRed,
  [FATAL]: ColorBrightRed,
  [CRASH]: ColorBrightRed,
  [PANIC]: ColorBrightRed,
  [WARN]: ColorBrightYellow,
  [INFO]: ColorBrightGreen,
  [DEBUG]: ColorBrightCyan,
  [LOG]: ColorBrightWhite,
};

export class BugFixes {
  level: string = LOG;
  message: string = "";
  file: string = "";
  line: number = 0;
  stack: string = "";
  localOnly: boolean = false;
  skipDepthOverride: number = 0;
  private config: Config | null = null;

  /**
   * Create a local-only logger instance.
   */
  static local(skipDepthOverride: number = 0): BugFixes {
    const b = new BugFixes();
    b.localOnly = true;
    b.skipDepthOverride = skipDepthOverride;
    return b;
  }

  setConfig(cfg: Partial<Config>): BugFixes {
    const base = this.config ?? getDefaultConfig();
    this.config = mergeConfig(base, cfg);
    return this;
  }

  private getConfig(): Config {
    return this.config ?? getDefaultConfig();
  }

  /**
   * Core logging method.
   */
  logAt(level: string, message: string): string | Error {
    this.level = level;
    this.message = message;
    this.timestamp = new Date().toISOString();

    // Capture stack for error/debug/warn levels
    if ([ERROR, FATAL, CRASH, PANIC, DEBUG, WARN].includes(level)) {
      this.stack = captureStack(3);
    }

    // Find the caller
    const caller = findCaller(
      ["ts-bugfixes/src/logs/"],
      this.skipDepthOverride,
    );
    this.file = caller.file;
    this.line = caller.line;

    return this.doReporting();
  }

  private timestamp: string = "";

  private doReporting(): string | Error {
    const cfg = this.getConfig();

    // Check log level filtering
    if (cfg.logLevel) {
      const configuredLevel = convertLevelFromString(cfg.logLevel);
      const currentLevel = convertLevelFromString(this.level);
      if (currentLevel < configuredLevel) {
        return this.level === ERROR
          ? new Error(this.message)
          : this.formatOutput();
      }
    }

    // Format logfmt
    const logfmt = this.toLogFmt();

    // Pretty print to console
    this.printToConsole(logfmt);

    // If not local-only and we have credentials, send to API
    const isLocal = this.localOnly || cfg.localOnly;
    if (!isLocal && cfg.agentKey && cfg.agentSecret) {
      this.sendToApi(cfg).catch((err) => {
        process.stderr.write(
          `bugfixes: failed to send log: ${err.message}\n`,
        );
      });
    } else if (!isLocal && (!cfg.agentKey || !cfg.agentSecret)) {
      // Silently keep local if no credentials
    }

    if (this.level === ERROR) {
      return new Error(this.message);
    }

    return this.formatOutput();
  }

  private toLogFmt(): string {
    const parts: string[] = [
      `level=${this.level}`,
      `ts=${this.timestamp}`,
      `msg=${quoteLogFmt(this.message)}`,
      `file=${this.file}`,
      `line=${this.line}`,
    ];

    if (this.stack) {
      parts.push(`stack=${quoteLogFmt(this.stack)}`);
    }

    return parts.join(" ");
  }

  private printToConsole(logfmt: string): void {
    const cfg = this.getConfig();
    const color = LEVEL_COLORS[this.level] || ColorBrightWhite;
    const levelTag = colorize(color, `[${this.level.toUpperCase()}]`);
    const fileInfo = colorize(
      ColorBrightMagenta,
      `${this.file}:${this.line}`,
    );
    const iconMsg = cfg.iconSkip
      ? this.message
      : withIcon(this.level, this.message);
    const msg = `${levelTag} ${iconMsg} ${fileInfo}`;

    const stream =
      this.level === ERROR || this.level === FATAL || this.level === CRASH
        ? process.stderr
        : process.stdout;

    stream.write(msg + "\n");

    // Print stack trace for error-level logs
    if (this.stack && [ERROR, FATAL, CRASH, PANIC].includes(this.level)) {
      const frames = parseStack(this.stack);
      const pretty = formatPrettyStack(frames);
      stream.write(pretty + "\n");
    }
  }

  private async sendToApi(cfg: Config): Promise<void> {
    const data: BugFixesData = {
      formattedLog: this.formatOutput(),
      level: this.level,
      file: this.file,
      line: this.line,
      logFmt: this.toLogFmt(),
      stack: this.stack,
      message: this.message,
      localOnly: this.localOnly,
      agentId: cfg.agentKey,
      secret: cfg.agentSecret,
      timestamp: this.timestamp,
    };

    const body = JSON.stringify(data);
    const url = logEndpoint(cfg);
    const levelNum = LogLevelValues[this.level] ?? 9;

    await makeRequest(cfg, url, body, levelNum);
  }

  private formatOutput(): string {
    return `[${this.level.toUpperCase()}]: ${this.message}`;
  }
}

function quoteLogFmt(value: string): string {
  if (value.includes(" ") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
  }
  return value;
}
