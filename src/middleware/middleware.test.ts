import { describe, it, expect, vi, beforeEach } from "vitest";
import http from "node:http";
import {
  System,
  newMiddleware,
  newDefaultMiddleware,
  defaultMiddleware,
  createRecovererMiddleware,
  recovererMiddleware,
  asyncRecoverer,
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

describe("recovererMiddleware", () => {
  it("should catch sync errors and return 500", () => {
    const req = createMockReq();
    const res = createMockRes();

    recovererMiddleware(req, res, () => {
      throw new Error("sync boom");
    });

    expect(res.writeHead).toHaveBeenCalledWith(500, {
      "Content-Type": "text/plain",
    });
    expect(res.end).toHaveBeenCalledWith("Internal Server Error");
  });

  it("should pass through when no error", () => {
    const req = createMockReq();
    const res = createMockRes();
    let called = false;

    recovererMiddleware(req, res, () => {
      called = true;
    });

    expect(called).toBe(true);
    expect(res.writeHead).not.toHaveBeenCalled();
  });
});

describe("createRecovererMiddleware", () => {
  it("should return a middleware function", () => {
    const mw = createRecovererMiddleware("key", "secret");
    expect(mw).toBeInstanceOf(Function);
  });

  it("should catch errors and return 500", () => {
    const mw = createRecovererMiddleware();
    const req = createMockReq();
    const res = createMockRes();

    mw(req, res, () => {
      throw new Error("factory boom");
    });

    expect(res.writeHead).toHaveBeenCalledWith(500, {
      "Content-Type": "text/plain",
    });
    expect(res.end).toHaveBeenCalledWith("Internal Server Error");
  });

  it("should pass through when no error", () => {
    const mw = createRecovererMiddleware();
    const req = createMockReq();
    const res = createMockRes();
    let called = false;

    mw(req, res, () => {
      called = true;
    });

    expect(called).toBe(true);
    expect(res.writeHead).not.toHaveBeenCalled();
  });

  it("should not send 500 if headers already sent", () => {
    const mw = createRecovererMiddleware();
    const req = createMockReq();
    const res = createMockRes();
    (res as any).headersSent = true;

    mw(req, res, () => {
      throw new Error("late error");
    });

    expect(res.writeHead).not.toHaveBeenCalled();
  });
});

describe("asyncRecoverer", () => {
  it("should catch async errors and return 500", async () => {
    const req = createMockReq();
    const res = createMockRes();

    const handler = asyncRecoverer(async () => {
      throw new Error("async boom");
    });

    handler(req, res);
    // Allow the promise rejection to be caught
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(res.writeHead).toHaveBeenCalledWith(500, {
      "Content-Type": "text/plain",
    });
    expect(res.end).toHaveBeenCalledWith("Internal Server Error");
  });

  it("should pass through for successful async handlers", async () => {
    const req = createMockReq();
    const res = createMockRes();
    let called = false;

    const handler = asyncRecoverer(async () => {
      called = true;
    });

    handler(req, res);
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(called).toBe(true);
    expect(res.writeHead).not.toHaveBeenCalled();
  });
});
