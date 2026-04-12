/**
 * @bugfixes/ts-bugfixes
 *
 * TypeScript logging, error tracking, and HTTP middleware library.
 * Sends logs and bug reports to api.bugfix.es when configured with
 * an API key, otherwise keeps everything local.
 */

// Config
export {
  type Config,
  loadConfigFromEnv,
  getDefaultConfig,
  setDefaultConfig,
  resetDefaultConfig,
  mergeConfig,
  logEndpoint,
  bugEndpoint,
  convertLevelFromString,
  signPayload,
  LogLevelValues,
} from "./config.js";

// Logs
export {
  error,
  errorf,
  warn,
  warnf,
  info,
  infof,
  debug,
  debugf,
  log,
  logf,
  fatal,
  fatalf,
  local,
  BugFixes,
  printPrettyStack,
  parseStack,
  formatPrettyStack,
  captureStack,
  findCaller,
  buildUsefulTrace,
  ERROR,
  WARN,
  INFO,
  DEBUG,
  LOG,
  FATAL,
} from "./logs/index.js";

export type {
  BugFixesData,
  ParsedStackFrame,
  PrettyStackResult,
  UsefulTrace,
} from "./logs/index.js";

// Middleware
export {
  System,
  newMiddleware,
  newDefaultMiddleware,
  defaultMiddleware,
  loggerMiddleware,
  requestIdMiddleware,
  getRequestId,
  REQUEST_ID_HEADER,
  recovererMiddleware,
  asyncRecoverer,
  createRecovererMiddleware,
  createCorsMiddleware,
  wrapResponse,
  WrapResponseWriter,
} from "./middleware/index.js";

export type {
  Middleware,
  Handler,
  BugFixesSend,
  CorsOptions,
} from "./middleware/index.js";

// Icons
export {
  ICON_LOG,
  ICON_INFO,
  ICON_ERROR,
  setIconSkip,
  getIconSkip,
  getIcon,
  withIcon,
} from "./icons.js";

// Utils
export { isDefined } from "./utils/functions.js";
