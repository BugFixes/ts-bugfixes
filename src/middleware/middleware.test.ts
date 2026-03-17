import { describe, it, expect, vi, beforeEach } from "vitest";
import http from "node:http";
import {
  System,
  newMiddleware,
  newDefaultMiddleware,
  defaultMiddleware,
} from "./index.js";
import { resetDefaultConfig, getDefaultConfig } from "../config.js";

// Suppress log output
beforeEach(() => {
  resetDefaultConfig();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

function createMockReq(
  overrides: Partial<http.IncomingMessage> = {},
): http.IncomingMessage {
  const req = {
    method: "GET",
    url: "/test",
    headers: {},
    ...overrides,
  } as http.IncomingMessage;
  return req;
}

function createMockRes(): http.ServerResponse {
  const res = {
    headersSent: false,
    writeHead: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
    end: vi.fn(),
    write: vi.fn().mockReturnValue(true),
    on: vi.fn(),
    removeListener: vi.fn(),
    statusCode: 200,
  } as unknown as http.ServerResponse;
  return res;
}

describe("Middleware System", () => {
  it("should create a new middleware system", () => {
    const system = newMiddleware();
    expect(system).toBeInstanceOf(System);
  });

  it("should chain middleware in order", () => {
    const order: number[] = [];

    const system = newMiddleware();
    system.addMiddleware(
      (_req, _res, next) => {
        order.push(1);
        next();
      },
      (_req, _res, next) => {
        order.push(2);
        next();
      },
    );

    const handler = system.handler((_req, _res) => {
      order.push(3);
    });

    handler(createMockReq(), createMockRes());
    expect(order).toEqual([1, 2, 3]);
  });

  it("should allow middleware to short-circuit", () => {
    const order: number[] = [];

    const system = newMiddleware();
    system.addMiddleware(
      (_req, _res, _next) => {
        order.push(1);
        // Don't call next
      },
      (_req, _res, next) => {
        order.push(2);
        next();
      },
    );

    const handler = system.handler((_req, _res) => {
      order.push(3);
    });

    handler(createMockReq(), createMockRes());
    expect(order).toEqual([1]);
  });

  it("should setup bugfixes credentials", () => {
    const system = newMiddleware();
    system.setupBugfixes("key", "secret");
    const cfg = getDefaultConfig();
    expect(cfg.agentKey).toBe("key");
    expect(cfg.agentSecret).toBe("secret");
  });

  it("newDefaultMiddleware should include standard middleware", () => {
    const system = newDefaultMiddleware();
    expect(system).toBeInstanceOf(System);

    // Should work without errors
    const handler = system.handler((_req, _res) => {});
    expect(handler).toBeInstanceOf(Function);
  });

  it("defaultMiddleware should wrap a handler", () => {
    let called = false;
    const handler = defaultMiddleware((_req, _res) => {
      called = true;
    });

    const req = createMockReq();
    const res = createMockRes();
    handler(req, res);
    expect(called).toBe(true);
  });

  it("should configure CORS options", () => {
    const system = newMiddleware();
    system.addAllowedOrigins("http://localhost:3000");
    system.addAllowedHeaders("X-Custom");
    system.addAllowedMethods("PATCH");

    const cors = system.cors();
    expect(cors).toBeInstanceOf(Function);
  });
});
