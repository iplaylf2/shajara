---
title: Scope in an HTTP Server
description: Use createScope() to make HTTP route work belong to a scope in the server module and let that scope converge during shutdown.
---

After an HTTP server starts, it keeps accepting requests. It usually needs an ownership
boundary that is longer than one route handler: route work starts from that boundary
while the service is running, and the boundary closes when the service shuts down.
`createScope()` can live in the server module, making route work belong to a
shajara-managed scope.

## Create a Scope in the Server Module

The server module below uses Hono for HTTP routing and opens one long-lived
`serverScope` at the module level. Route handlers start request work from that scope; a
shutdown signal lets the top-level code leave the `try` block, then the `await using`
bindings release `serverScope` and the HTTP server.

```ts
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { CanceledError, createScope, until } from "@shajara/host";

try {
  await using serverScope = createScope();

  const app = new Hono();

  app.get("/reports/:id", async (c) => {
    const reportId = c.req.param("id");

    const report = await serverScope.run(function* handleReportRequest() {
      const response = yield* until(() => fetch(`https://reports.internal/reports/${reportId}`));

      return yield* until(() => response.json());
    });

    return c.json(report);
  });

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

## This Scope's Lifecycle

### Where `createScope()` Lives

`serverScope` is created at the top level of the server module and managed with
`await using`. It is not a temporary object created for each request; it represents the
open work boundary for this service process.

The HTTP app and server are created inside that block. As long as the top-level code is
waiting for a shutdown signal, `serverScope` remains open.

### `scope.run(...)` Starts Route Work

The route handler starts one request's work with `serverScope.run(...)` and waits for
that work's Promise. The HTTP response still comes from the route handler.

That Promise carries this route work's result back to the handler: success resolves with
`report`; if the routine throws a non-cancellation exception, the Promise rejects,
usually as `ScopeError`. That failure belongs only to the work started by this
`serverScope.run(...)`; it does not automatically close the outer `serverScope`. The
route handler can let the rejection reach the HTTP framework's error handling, or catch
it and return the HTTP response this endpoint needs.

If `serverScope` closes while request work is still running, route work still owned by
it converges with that scope.

### `using` Manages Shutdown

After a shutdown signal, `shutdown.promise` completes and the top-level code leaves the
`try` block. Both `await using` bindings in that block are released.

The HTTP server is also an `await using` resource. When the block exits, its async
disposable calls `server.close()`, so the HTTP layer stops accepting new requests and
waits until the server has finished closing.
`serverScope`'s async disposable calls `scope.cancel()`, closing this shajara-managed
scope.

`Promise.race(...)` waits for both the shutdown signal and `serverScope.closed`. If the
scope closes first, its close result reaches the outer `catch` unchanged. Closing a
healthy running scope finishes with a cancellation result, so this shutdown path treats
`CanceledError` as the expected result; other errors should still surface.
