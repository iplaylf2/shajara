---
title: Getting Started
description: Start shajara from application code and bring existing Promise work into a routine.
---

Start with `@shajara/host` when application code needs to enter shajara. Ordinary
JavaScript code uses it to start an entry routine; inside a routine, `yield*` hands
control to shajara.

## Install

```sh
npm install @shajara/host
```

## Run a routine

shajara routines are JavaScript generator functions. Use `run(...)` to start one; inside
the routine, `yield*` hands control to shajara and resumes when the result is ready.

```ts
import { run } from "@shajara/host";

// "ready"
const message = await run(function* main() {
  return "ready";
});
```

`run(...)` is the application entry point. The Promise resolves when the routine returns.

Later examples show the routine body and omit the surrounding `run(...)` entry from
application code.

## Wait for Promise work

Most application code already uses APIs that return Promises. `fetch(...)` is
one of them. `until(...)` lets a routine wait for that work.

```ts
import { until } from "@shajara/host";

function* loadUser() {
  const response = yield* until(() => fetch("/api/users/user-1"));

  return yield* until(() => response.json());
}
```

The Promise still comes from ordinary JavaScript code; `until(...)` brings its
fulfillment or rejection back into the routine's control flow.

The `yield* until(...)` expression is where the routine hands control to shajara and
receives the Promise result back.

## Start concurrent work and wait later

When one asynchronous step can run alongside the current flow, the parent
routine can start it and wait for its result where that value is needed.

```ts
import { sleep } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";

function* greetUser() {
  const workspaceNameFuture = yield* spawn(function* loadWorkspaceName() {
    yield* sleep(10);

    return "Docs";
  });

  yield* sleep(20);

  const userName = "Ada";
  const workspaceName = yield* wait(workspaceNameFuture);

  // "Hello, Ada from Docs"
  return `Hello, ${userName} from ${workspaceName}`;
}
```

`spawn(...)` starts `loadWorkspaceName` and returns `workspaceNameFuture`. `wait(...)` is
the point where `greetUser` observes that future.

The parent routine keeps the concurrency structure visible: start work, continue the
current flow, then wait for the result.
