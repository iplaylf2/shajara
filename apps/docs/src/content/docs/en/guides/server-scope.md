---
title: Scope in an HTTP Server
description: Use createScope() as the long-lived owner for HTTP route work.
---

After an HTTP server starts, it keeps accepting requests. It usually needs an ownership
boundary that is longer than one route handler: route work starts from that boundary while
the service is running, and the boundary closes when the service shuts down.
`createScope()` can live in the server module, making route work belong to a
shajara-managed scope.

## Create a Scope in the Server Module

The server module below uses Hono for HTTP routing and opens one long-lived
`serverScope`. Route handlers start request work from that scope. A shutdown signal lets
the top-level code leave the `try` block, then `await using` releases the HTTP server and
the shajara scope.

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

## Where `createScope()` Lives

`serverScope` is created at the top level of the server module and managed with
`await using`. It is not a temporary object created for each request; it represents the
open work boundary for this service process.

The HTTP app and server are created inside the same block. As long as the top-level code
is waiting for a shutdown signal, `serverScope` remains open.

## `scope.run(...)` Starts Route Work

The route handler returns the Promise from `serverScope.run(...)`. The routine is the
main body of the GET handler: it reads the route parameter, loads the report, and returns
the HTTP response.

`serverScope.run(...)` does more than expose the routine as a Promise. It also attaches
this route work to the long-lived scope. The work follows structured concurrency
convergence: if the routine lets a non-cancellation exception escape, the Promise rejects,
usually as `ScopeError`, and the same failure closes `serverScope`. There is no
request-local failure to forget; the owning scope observes it too. If `serverScope` closes
while request work is still running, route work still owned by it converges with that
scope.

## `using` Manages Shutdown

After a shutdown signal, `shutdown.promise` completes and the top-level code leaves the
`try` block. Both `await using` bindings in that block are released.

The HTTP server is also an `await using` resource. When the block exits, its async
disposable calls `server.close()`, so the HTTP layer stops accepting new requests and
waits until the server has finished closing. `serverScope`'s async disposable calls
`scope.cancel()`, and a normal cancellation from shutdown resolves after the
shajara-managed scope has closed. Non-cancellation close failures still reject.

While the service is running, `Promise.race(...)` watches both the shutdown signal and
`serverScope.closed`. If the scope closes first because of an uncaught route failure or
another failure that belongs to this long-lived boundary, the race passes that close
result to the outer `catch`. A normal close appears there as `CanceledError`, which the
`catch` treats as expected; other errors still surface.
