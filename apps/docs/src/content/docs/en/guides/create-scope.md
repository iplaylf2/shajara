---
title: Long-Lived Boundaries with createScope()
description: Create a long-lived scope at an application entry so external callbacks share one owner.
---

Some shajara work does not start from another routine. It starts when an application
entry receives an external event: an HTTP server receives a request, a worker receives a
message, or a UI shell receives an event. That entry usually outlives one callback, so it
needs a long-lived scope for the routines it starts.

`createScope()` opens that boundary from ordinary application code. External callbacks
start routines from it, and when the entry shuts down, it gathers work that still belongs
to it.

## Open a Scope at the Entry

The Hono service below creates `serviceScope` during startup. When a request arrives, the
route handler starts a request routine from that scope. When a shutdown signal arrives,
the top-level flow leaves the wait, and `await using` releases the HTTP server and the
shajara scope.

```ts
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { CanceledError, createScope, until } from "@shajara/host";

try {
  await using serviceScope = createScope();

  const app = new Hono();

  app.get("/reports/:id", (c) =>
    serviceScope.run(function* handleReportRequest() {
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

  await Promise.race([shutdown.promise, serviceScope.closed]);
} catch (error) {
  if (!(error instanceof CanceledError)) {
    console.error(error);
    process.exitCode = 1;
  }
}
```

`serviceScope` lives in the startup flow, not inside the handler. Each handler call
starts from that same long-lived scope.

## Start Routines from External Callbacks

The scope returned by `createScope()` can call `run(...)` outside a routine. The route
handler returns that Promise to Hono; shajara uses the same `run(...)` call to observe
the result of `handleReportRequest`.

```ts
app.get("/reports/:id", (c) =>
  serviceScope.run(function* handleReportRequest() {
    const reportId = c.req.param("id");
    const response = yield* until(() => fetch(`https://reports.internal/reports/${reportId}`));
    const report = yield* until(() => response.json());

    return c.json(report);
  }),
);
```

This request work belongs to `serviceScope`. When the routine returns normally, the
handler's Promise resolves to `c.json(report)`. If the routine lets a non-cancellation
exception escape, that Promise usually rejects as `ScopeError`, and the same failure
closes `serviceScope`.

When an error should affect only the current request, handle it inside the routine and
return an HTTP response. Letting the error escape means the failure belongs to the
long-lived scope that owns it.

## Keep the Scope with the Entry

`serviceScope` and the HTTP server live in the same top-level `try` block. This scope is
not created or destroyed for each request; it stays open while the top-level flow is
waiting.

```ts
try {
  await using serviceScope = createScope();

  const app = new Hono();

  app.get("/reports/:id", (c) =>
    serviceScope.run(function* handleReportRequest() {
      /* ... */
    }),
  );

  await using _server = serve({ fetch: app.fetch, port: 3000 });

  /* ... */
}
```

`await using` ties the scope's release to the entry lifetime. When the service leaves the
block, the HTTP server stops accepting new requests, and `serviceScope` starts closing;
request work still owned by it converges with that scope.

## Wait for the Scope's Close Result

`createScope()` exposes a `closed` Promise so application code can observe the long-lived
scope's convergence result. While the service is running, the top-level flow waits for
both the shutdown signal and `serviceScope.closed`.

```ts
const shutdown = Promise.withResolvers<void>();
process.once("SIGINT", shutdown.resolve);
process.once("SIGTERM", shutdown.resolve);

await Promise.race([shutdown.promise, serviceScope.closed]);
```

After a shutdown signal, the top-level code leaves the `try` block, and `await using`
releases the HTTP server and `serviceScope`. If `serviceScope` closes first because of an
uncaught request failure or another failure that belongs to this long-lived boundary,
`Promise.race(...)` passes the close result to the outer `catch`.

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
