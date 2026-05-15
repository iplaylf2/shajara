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

console.log(message);
// ready
```

`run(...)` starts the routine and returns a promise for its result.

From here on, examples show the routine itself. The routine can be passed to
`run(...)` directly, or started indirectly by another routine.

## Wait for promise work

Most application code already has functions that return promises. `until(...)`
lets a routine wait for that work.

```ts
import { until } from "@shajara/host";
import { loadUserName } from "./user-data";

function* loadUser() {
  return yield* until(() => loadUserName("user-1"));
}
```

The promise still comes from ordinary JavaScript code; `until(...)` brings its
fulfillment or rejection back into the routine's control flow.

## Start concurrent work and join later

Once asynchronous steps are wrapped in smaller routines, the parent routine can
start work that can make progress alongside the current flow, then join it where
its result is needed.

```ts
import { spawn, wait } from "@shajara/host/primitives";
import { loadUserName, loadWorkspaceName, saveGreeting } from "./user-routines";

function* greetUser() {
  const workspaceNameFuture = yield* spawn(function* loadWorkspace() {
    return yield* loadWorkspaceName("workspace-1");
  });

  const userName = yield* loadUserName("user-1");
  const workspaceName = yield* wait(workspaceNameFuture);
  const greeting = `Hello, ${userName} from ${workspaceName}`;

  yield* saveGreeting("user-1", greeting);

  return greeting;
}
```

`spawn(...)` starts `loadWorkspace` and returns `workspaceNameFuture`, a handle
for its result. `greetUser` keeps going through `loadUserName(...)`, then joins
the workspace result with `wait(...)`.

The imported routines own their internal details. The parent routine keeps the
concurrency structure visible: start work, continue the current flow, then join
the result.
