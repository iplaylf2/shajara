---
title: Scope in an HTTP Server
description: Use createScope() as the long-lived owner for HTTP route work.
---

After an HTTP server starts, it keeps accepting requests. A route handler finishes one
request while the service process keeps running, so request work usually needs an
ownership boundary that lasts longer than the handler. `createScope()` can live in the
server module's startup flow: handlers start routines from that scope, and the scope
gathers any still-running request work when the service shuts down.

## Create a Scope During Server Startup

The Hono service below opens one long-lived `serverScope` in its top-level flow. Handlers
use it to run request routines. A shutdown signal ends the top-level wait, then
`await using` releases the HTTP server and the shajara scope.

```ts
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { CanceledError, createScope, until } from "@shajara/host";

try {
  await using serverScope = createScope();

  const app = new Hono();

  app.get("/reports/:id", (c) =>
    serverScope.run(function* handleReportRequest() {
      const reportId = c.req.param("id");
      const response = yield* until(() => fetch(`https://reports.internal/reports/${reportId}`));
      const report = yield* until(() => response.json());

      return c.json(report);
    }),
  );

  await using _server = serve({ fetch: app.fetch, port: 3000 });

  const shutdown = Promise.withResolvers<void>();
  process.once("SIGINT", shutdown.resolve);
  process.once("SIGTERM", shutdown.resolve);

  await Promise.race([shutdown.promise, serverScope.closed]);
} catch (error) {
  if (!(error instanceof CanceledError)) {
    console.error(error);
    process.exitCode = 1;
  }
}
```

## Keep the Scope with the Service

`serverScope` and the HTTP server live in the same top-level `try` block. The handler is
registered inside that block, so every request that reaches the handler starts work from
the same `serverScope`.

```ts
try {
  await using serverScope = createScope();

  const app = new Hono();

  app.get("/reports/:id", (c) =>
    serverScope.run(function* handleReportRequest() {
      /* ... */
    }),
  );

  await using _server = serve({ fetch: app.fetch, port: 3000 });

  /* ... */
}
```

This scope is not created or destroyed for each request. It stays open while the
top-level flow is waiting; when the service leaves the block, `await using` releases it.
`serverScope` follows the HTTP server lifetime, not one handler call.

## Enter a Routine from the Handler

The handler returns the Promise from `serverScope.run(...)`. Hono uses that Promise to
get the HTTP response, while shajara runs `handleReportRequest` as work owned by
`serverScope`.

```ts
app.get("/reports/:id", (c) =>
  serverScope.run(function* handleReportRequest() {
    const reportId = c.req.param("id");
    const response = yield* until(() => fetch(`https://reports.internal/reports/${reportId}`));
    const report = yield* until(() => response.json());

    return c.json(report);
  }),
);
```

When the routine returns normally, the handler's Promise resolves to `c.json(report)`.
If the routine lets a non-cancellation exception escape, that Promise usually rejects as
`ScopeError`, and the same failure closes `serverScope`.

When an error should affect only the current request, handle it inside the routine and
return an HTTP response. Letting the error escape means the failure belongs to the
service scope.

## Wait for the Scope During Shutdown

While the service is running, the top-level flow waits for the shutdown signal and for
`serverScope.closed`.

```ts
const shutdown = Promise.withResolvers<void>();
process.once("SIGINT", shutdown.resolve);
process.once("SIGTERM", shutdown.resolve);

await Promise.race([shutdown.promise, serverScope.closed]);
```

After a shutdown signal, `shutdown.promise` completes and the top-level code leaves the
`try` block. `await using` then releases the HTTP server and `serverScope`: the HTTP
server stops accepting new requests and waits until it has finished closing;
`serverScope` is canceled, and route work still owned by it converges with that scope.

If `serverScope` closes first because of an uncaught route failure or another failure
that belongs to this long-lived boundary, `Promise.race(...)` passes the close result to
the outer `catch`.

```ts
} catch (error) {
  if (!(error instanceof CanceledError)) {
    console.error(error);
    process.exitCode = 1;
  }
}
```

A normal close appears there as `CanceledError`, which the `catch` treats as expected;
other errors still surface.
