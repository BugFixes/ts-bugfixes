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
  ERROR,
  WARN,
  INFO,
  DEBUG,
  LOG,
  FATAL,
} from "./logs/index.js";

export type { BugFixesData, ParsedStackFrame, PrettyStackResult } from "./logs/index.js";

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
  lowerCaseHeadersMiddleware,
  createCorsMiddleware,
  createBugfixesMiddleware,
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
export { toOptional } from "./utils/pointers.js";

// Functions (ported from old-npm)
export {
  checkIfDefined,
  result,
  errorResult,
  defaultError,
  createVerify,
  lambdaResult,
  lambdaError,
} from "./utils/functions.js";

export type { ResponseObject, LambdaResponse } from "./utils/functions.js";
