---
title: Getting Started
description: Start shajara routines, wait for promise work, and join routine work later.
---

`@shajara/host` is the application-facing entry point for shajara.

## Install

```sh
npm install @shajara/host
```

## Start a routine

shajara routines are written as generator functions. Use `run(...)` to start
one; inside the routine, call shajara operations with `yield*`.

```ts
import { run } from "@shajara/host";

const message = await run(function* main() {
  return "ready";
});
```

`run(...)` starts the routine and returns a promise for its result.

From here on, examples show the routine body. A routine can be passed to
`run(...)` directly or called from another routine.

## Wait for promise work

Most application code already uses APIs that return promises. `fetch(...)` is
one of them. `until(...)` lets a routine wait for that work.

```ts
import { until } from "@shajara/host";

function* loadUser() {
  const response = yield* until(() => fetch("/api/users/user-1"));

  return yield* until(() => response.json());
}
```

The promise still comes from ordinary JavaScript code; `until(...)` brings its
fulfillment or rejection back into the routine's control flow.

## Start concurrent work and join later

When one asynchronous step can run alongside the current flow, the parent
routine can start it and join it where its result is needed.

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

  return `Hello, ${userName} from ${workspaceName}`;
}
```

`spawn(...)` starts `loadWorkspaceName` and returns `workspaceNameFuture`, a handle
for its result. `greetUser` keeps going through the user work, then joins
the workspace result with `wait(...)`.

The parent routine keeps the concurrency structure visible: start work,
continue the current flow, then join the result.
