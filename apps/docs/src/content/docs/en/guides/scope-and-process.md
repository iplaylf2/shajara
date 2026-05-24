---
title: Scopes and Processes
description: Use return shapes to distinguish process futures from child-scope values.
---

When APIs return different shapes, the return shape matters more than the function name.
A future means there is still a result to wait for; a direct value means the call has
already crossed a boundary and come back.

The runtime names behind that shape are process and scope. A process is the runtime
identity a scope creates for work started from a routine entry. A scope is the boundary
that owns processes and waits for them to converge.

## One Process, One Future

`spawn(...)` uses one routine as the entry for one process in the current scope and
returns that process's exit future.

```ts
import { sleep } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";

function* loadSidebar() {
  const recommendationsFuture = yield* spawn(function* loadRecommendations() {
    yield* sleep(20);

    return ["guide", "api"];
  });

  yield* sleep(5);

  // ["guide", "api"]
  const recommendations = yield* wait(recommendationsFuture);

  return { recommendations };
}
```

`loadRecommendations` starts as a process in the same scope as `loadSidebar`.
`recommendationsFuture` is an observation handle for that process. `loadSidebar` keeps
running until it reaches the wait point.

`all(...)` follows the same read at a larger scale: several routines start in the current
scope, and the caller receives one future for their ordered result.

## A Child Scope Returns a Value

`branch(...)` opens a child scope for a routine, waits for that scope, and returns the
scope result as a value.

```ts
import { sleep } from "@shajara/host";
import { branch, spawn } from "@shajara/host/primitives";

function* saveProfile() {
  return yield* branch(function* saveProfileScope() {
    yield* spawn(function* writeAuditTrail() {
      yield* sleep(20);
    });

    yield* sleep(5);

    return "saved";
  }); // "saved" after the child scope converges.
}
```

The routine passed to `branch(...)` is used as the child scope's entry process. It can
start more processes in that same scope. The caller receives the entry process result only
after the child scope has finished both processes.

`race(...)` is the specialized child-scope form for alternatives: it waits until one
routine succeeds, cancels the rest, and returns the winning value. `branch(...)` is the
general form for running a routine inside its own scope.

## Wait in Another Process

When a child scope is needed but the current process should continue, compose the two
shapes:

```ts
import { branch, spawn, wait } from "@shajara/host/primitives";

function* saveWithoutWaitingHere() {
  const saveFuture = yield* spawn(function* saveProfileEntry() {
    return yield* branch(function* saveProfileScope() {
      return "saved";
    });
  });

  const status = "saving";
  // "saved"
  const result = yield* wait(saveFuture);

  return { result, status };
}
```

The current process starts `saveProfileEntry` and receives `saveFuture`. The process
created for `saveProfileEntry` is the one that waits through `saveProfileScope`; the
caller can keep going until this wait point.

The API shapes keep this distinction consistent. APIs that start work in the current
scope return a future for that work's result. APIs that open a child scope wait for that
scope in the process that called them, then return a value.
