# bugfixes

TypeScript logging, error reporting, and HTTP middleware. Works in Node.js, browsers, and Edge Runtime with **zero runtime dependencies**.

ESM-first with named exports from the package root.

## Install

```bash
npm install bugfixes
```

Node 24+ is required for server-side usage. Browser and Edge Runtime are supported out of the box.

## What It Exports

| Subpath | Environment | Description |
|---|---|---|
| `bugfixes` | All | Logging, config, stack traces, icons, utilities |
| `bugfixes/logs` | All | Logging-only subset |
| `bugfixes/middleware` | Node.js | HTTP middleware for `node:http` servers |

## Configuration

Environment variables (server-side only):

```bash
BUGFIXES_AGENT_KEY=your-key
BUGFIXES_AGENT_SECRET=your-secret
BUGFIXES_AGENT_ID=your-agent-id
BUGFIXES_SERVER=https://api.bugfix.es/v1
BUGFIXES_LOG_LEVEL=warn
BUGFIXES_LOCAL_ONLY=false
BUGFIXES_ICON_SKIP=false
```

Legacy aliases `BUGFIXES_KEY`, `BUGFIXES_SECRET`, and `BUGFIXES_ID` are also accepted.

Apply environment config explicitly:

```ts
import { loadConfigFromEnv, setDefaultConfig } from "bugfixes";

setDefaultConfig(loadConfigFromEnv());
```

Or configure directly (works in any environment):

```ts
import { setDefaultConfig } from "bugfixes";

setDefaultConfig({
  agentKey: "your-key",
  agentSecret: "your-secret",
  localOnly: false,
});
```

Remote reporting only happens when `localOnly` is false and both `agentKey` and `agentSecret` are set.

## Logging

```ts
import { log, info, warn, debug, error, fatal } from "bugfixes";

log("server boot");
info("listening on port", 3000);
warn("deprecated route");
debug("payload", JSON.stringify({ ok: true }));

const err = error("database unavailable");
// error() returns an Error object

fatal("unrecoverable"); // exits process in Node, throws in browser/Edge
```

Return values:

- `log`, `info`, `warn`, `debug` return formatted strings like `[INFO]: server started`
- `error` returns an `Error` with a captured stack trace
- `fatal` exits the process (Node) or throws (browser/Edge)

### Instance-level config

```ts
import { BugFixes } from "bugfixes";

const logger = new BugFixes().setConfig({
  agentKey: "your-key",
  agentSecret: "your-secret",
  localOnly: true,
});

logger.logAt("info", "configured logger");
```

### Local-only logging

```ts
import { local } from "bugfixes";

const logger = local();
logger.logAt("warn", "local warning only");
```

## Next.js

### Server Components and API Routes

```ts
// app/api/orders/route.ts
import { info, error } from "bugfixes";

export async function GET() {
  info("fetching orders");
  try {
    const orders = await db.order.findMany();
    return Response.json(orders);
  } catch (err) {
    error("failed to fetch orders", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

### Server Actions

```ts
// app/actions.ts
"use server";

import { info, error } from "bugfixes";

export async function createOrder(formData: FormData) {
  const name = formData.get("name") as string;
  info("creating order", name);

  try {
    const order = await db.order.create({ data: { name } });
    return { success: true, id: order.id };
  } catch (err) {
    const e = error("order creation failed", err);
    return { success: false, error: e.message };
  }
}
```

### Client Components

```ts
// components/checkout.tsx
"use client";

import { info, error } from "bugfixes";

export function Checkout() {
  const handleSubmit = async () => {
    info("checkout started");
    try {
      await submitOrder();
      info("checkout complete");
    } catch (err) {
      error("checkout failed", err);
    }
  };

  return <button onClick={handleSubmit}>Place Order</button>;
}
```

### Next.js Middleware (Edge Runtime)

```ts
// middleware.ts
import { info } from "bugfixes";
import { NextResponse } from "next/server";

export function middleware(request: Request) {
  info("request", request.method, new URL(request.url).pathname);
  return NextResponse.next();
}
```

### Setup with instrumentation

```ts
// instrumentation.ts
import { loadConfigFromEnv, setDefaultConfig } from "bugfixes";

export function register() {
  setDefaultConfig(loadConfigFromEnv());
}
```

## TanStack Start

### Server Functions

```ts
// app/server/orders.ts
import { createServerFn } from "@tanstack/start";
import { info, error } from "bugfixes";

export const getOrders = createServerFn().handler(async () => {
  info("fetching orders");
  try {
    return await db.order.findMany();
  } catch (err) {
    error("failed to fetch orders", err);
    throw err;
  }
});

export const createOrder = createServerFn()
  .validator((data: { name: string }) => data)
  .handler(async ({ data }) => {
    info("creating order", data.name);
    try {
      return await db.order.create({ data });
    } catch (err) {
      error("order creation failed", err);
      throw err;
    }
  });
```

### Route Components

```tsx
// app/routes/orders.tsx
import { createFileRoute } from "@tanstack/react-router";
import { info } from "bugfixes";
import { getOrders } from "../server/orders";

export const Route = createFileRoute("/orders")({
  loader: async () => {
    info("loading orders route");
    return getOrders();
  },
  component: OrdersPage,
});

function OrdersPage() {
  const orders = Route.useLoaderData();
  return (
    <ul>
      {orders.map((o) => (
        <li key={o.id}>{o.name}</li>
      ))}
    </ul>
  );
}
```

### Client-Side Error Logging

```tsx
// app/routes/__root.tsx
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { error } from "bugfixes";

export const Route = createRootRoute({
  errorComponent: ({ error: err }) => {
    error("unhandled route error", err);
    return <div>Something went wrong</div>;
  },
  component: () => <Outlet />,
});
```

### App Entry Setup

```ts
// app/ssr.tsx or app/client.tsx
import { setDefaultConfig } from "bugfixes";

setDefaultConfig({
  agentKey: import.meta.env.VITE_BUGFIXES_KEY ?? "",
  agentSecret: import.meta.env.VITE_BUGFIXES_SECRET ?? "",
});
```

## HTTP Middleware (Node.js)

For raw `node:http` servers. Import from `bugfixes` or `bugfixes/middleware`.

```ts
import http from "node:http";
import {
  newDefaultMiddleware,
  createCorsMiddleware,
} from "bugfixes";

const system = newDefaultMiddleware();
system.addMiddleware(
  createCorsMiddleware({
    allowedOrigins: ["http://localhost:3000"],
  }),
);

const handler = system.handler((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ok");
});

http.createServer(handler).listen(3000);
```

Available middleware:

- `requestIdMiddleware` — attach `X-Request-Id` header
- `loggerMiddleware` — log method, path, status, duration, bytes
- `recovererMiddleware` — catch errors, return 500, optionally report to API
- `createRecovererMiddleware(key?, secret?)` — recoverer with credential overrides
- `createCorsMiddleware(options?)` — CORS headers and OPTIONS preflight
- `asyncRecoverer(handler)` — wrap async handlers with error recovery

## Utility Helpers

```ts
import { isDefined } from "bugfixes";

isDefined(null);      // false (narrowed out)
isDefined(undefined); // false (narrowed out)
isDefined("");        // true (narrowed to string)
isDefined(0);         // true (narrowed to number)
```

`isDefined` is a TypeScript type guard that narrows `T | null | undefined` to `T`.

## Icons

Icons are disabled by default. Enable them with:

```ts
import { setIconSkip, withIcon } from "bugfixes";

setIconSkip(false);
withIcon("info", "hello"); // "‼ hello"
```

Or via environment variable: `BUGFIXES_ICON_SKIP=false`.

## Platform Support

The core library (`bugfixes`, `bugfixes/logs`) uses only cross-platform APIs:

- `fetch()` for remote reporting (replaces `node:http`)
- `performance.now()` for timing (replaces `process.hrtime`)
- `crypto.randomUUID()` for IDs (replaces `node:crypto`)
- `crypto.subtle` for JWT signing (replaces `jsonwebtoken`)
- `TextEncoder` for byte length (replaces `Buffer`)
- `console` fallback for output in browsers (replaces `process.stdout`)

The middleware subpath (`bugfixes/middleware`) requires Node.js as it uses `node:http` types.
