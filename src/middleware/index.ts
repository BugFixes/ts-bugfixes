/**
 * Middleware package — composable HTTP middleware chain for Node.js.
 */

import type http from "node:http";
import type { Config } from "../config.js";
import { setDefaultConfig } from "../config.js";
import { loggerMiddleware } from "./logger.js";
import { requestIdMiddleware, getRequestId } from "./requestid.js";
import { recovererMiddleware, asyncRecoverer, createRecovererMiddleware } from "./recoverer.js";
import { createCorsMiddleware, type CorsOptions } from "./cors.js";
import { wrapResponse, WrapResponseWriter } from "./wrapwriter.js";

export { loggerMiddleware } from "./logger.js";
export {
  requestIdMiddleware,
  getRequestId,
  REQUEST_ID_HEADER,
} from "./requestid.js";
export { recovererMiddleware, asyncRecoverer, createRecovererMiddleware } from "./recoverer.js";
export type { BugFixesSend } from "./recoverer.js";
export { createCorsMiddleware } from "./cors.js";
export type { CorsOptions } from "./cors.js";
export { wrapResponse, WrapResponseWriter } from "./wrapwriter.js";

export type Middleware = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  next: () => void,
) => void;

export type Handler = (
  req: http.IncomingMessage,
  res: http.ServerResponse,
) => void;

/**
 * System — composable middleware chain builder.
 */
export class System {
  private middlewares: Middleware[] = [];
  private corsOptions: Partial<CorsOptions> = {};

  /**
   * Add one or more middleware functions to the chain.
   */
  addMiddleware(...middlewares: Middleware[]): this {
    this.middlewares.push(...middlewares);
    return this;
  }

  /**
   * Set up Bugfixes API credentials.
   */
  setupBugfixes(agentKey: string, agentSecret: string): this {
    setDefaultConfig({ agentKey, agentSecret });
    return this;
  }

  /**
   * Set the global config.
   */
  setConfig(cfg: Partial<Config>): this {
    setDefaultConfig(cfg);
    return this;
  }

  /**
   * Add allowed CORS origins.
   */
  addAllowedOrigins(...origins: string[]): this {
    if (!this.corsOptions.allowedOrigins) {
      this.corsOptions.allowedOrigins = [];
    }
    this.corsOptions.allowedOrigins.push(...origins);
    return this;
  }

  /**
   * Add allowed CORS headers.
   */
  addAllowedHeaders(...headers: string[]): this {
    if (!this.corsOptions.allowedHeaders) {
      this.corsOptions.allowedHeaders = [];
    }
    this.corsOptions.allowedHeaders.push(...headers);
    return this;
  }

  /**
   * Add allowed CORS methods.
   */
  addAllowedMethods(...methods: string[]): this {
    if (!this.corsOptions.allowedMethods) {
      this.corsOptions.allowedMethods = [];
    }
    this.corsOptions.allowedMethods.push(...methods);
    return this;
  }

  /**
   * Get the CORS middleware with current options.
   */
  cors(): Middleware {
    return createCorsMiddleware(this.corsOptions);
  }

  /**
   * Compose all middlewares and wrap the final handler.
   * Returns a single request handler that runs through the middleware chain.
   */
  handler(finalHandler: Handler): Handler {
    const chain = [...this.middlewares];

    return (req, res) => {
      let index = 0;

      const next = (): void => {
        if (index < chain.length) {
          const mw = chain[index++];
          mw(req, res, next);
        } else {
          finalHandler(req, res);
        }
      };

      next();
    };
  }
}

/**
 * Create a new middleware system.
 */
export function newMiddleware(): System {
  return new System();
}

/**
 * Create a middleware system with default middleware pre-configured:
 * RequestID, Logger, Recoverer.
 */
export function newDefaultMiddleware(): System {
  const system = new System();
  system.addMiddleware(
    requestIdMiddleware,
    loggerMiddleware,
    recovererMiddleware,
  );
  return system;
}

/**
 * Apply default middleware stack to a handler and return the composed handler.
 */
export function defaultMiddleware(finalHandler: Handler): Handler {
  return newDefaultMiddleware().handler(finalHandler);
}
