---
title: Scopes and Processes
description: Read futures and direct values as process results and scope boundaries.
---

After a few calls, the return shape starts to matter more than the function name. A future
means the routine still has a result it can wait for; a direct value means the call has
already crossed a boundary and come back.

The runtime names behind that shape are process and scope. A process is one running
routine inside a scope. A scope is the boundary that owns processes and waits for them to
converge.

## One Process, One Future

`spawn(...)` starts one process in the current scope and returns that process's exit
future.

```ts
import { sleep } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";

function* loadSidebar() {
  const recommendationsFuture = yield* spawn(function* loadRecommendations() {
    yield* sleep(20);

    return ["guide", "api"];
  });

  yield* sleep(5);

  const recommendations = yield* wait(recommendationsFuture);

  return { recommendations };
}
```

`loadRecommendations` runs as a process in the same scope as `loadSidebar`.
`recommendationsFuture` is an observation handle for that process result. `loadSidebar`
keeps running and waits for the future only where it needs the value.

`all(...)` follows the same read at a larger scale: several routines start in the current
scope, and the caller receives one future for their ordered result.

## A Child Scope Returns a Value

`branch(...)` opens a child scope for a routine, waits for that scope, and returns the
scope result as a value.

```ts
import { sleep } from "@shajara/host";
import { branch, spawn } from "@shajara/host/primitives";

function* saveProfile() {
  const result = yield* branch(function* saveProfileScope() {
    yield* spawn(function* writeAuditTrail() {
      yield* sleep(20);
    });

    yield* sleep(5);

    return "saved";
  });

  // result is "saved" after the child scope has converged.
  return result;
}
```

The routine passed to `branch(...)` becomes the first process in the child scope. It can
start more processes in that same scope. The caller receives `"saved"` only after the child
scope has finished the `saveProfileScope` process and the `writeAuditTrail` process.

`race(...)` is the specialized child-scope form for alternatives: it waits until one
routine succeeds, cancels the rest, and returns the winning value. `branch(...)` is the
general form for running a routine inside its own scope.

## Wait in Another Process

When a child scope is needed but the current process should continue, compose the two
shapes:

```ts
import { branch, spawn, wait } from "@shajara/host/primitives";

function* saveWithoutWaitingHere() {
  const saveFuture = yield* spawn(function* saveProcess() {
    return yield* branch(saveProfileScope);
  });

  const status = "saving";
  const result = yield* wait(saveFuture);

  return { result, status };
}
```

The current process starts `saveProcess` and receives `saveFuture`. `saveProcess` is the
process that waits through `saveProfileScope`; the caller can keep going until it needs the
future's value.

The host API keeps this distinction consistent. APIs that start work in the current scope
return a future for observing that work. APIs that open a child scope wait for that scope
in the process that called them, then return a value.
