---
title: Scopes and Processes
description: Move from all and race return shapes to process work and scope boundaries.
---

The previous guide introduced `all(...)` and `race(...)` from familiar Promise patterns.
This page starts from one difference between them: `all(...)` returns a future, while
`race(...)` returns a value.

That difference is a small entry point into shajara's runtime shape. A future means the
caller still has a handle it can wait for later. A value means the API has already waited
through the boundary it created.

## Start From `all` and `race`

With routine bodies omitted, the two calls have different shapes:

```ts
import { all, race, wait } from "@shajara/host/primitives";

function* loadProfilePage() {
  const pageDataFuture = yield* all([loadUserName, loadWorkspaceName]);

  const fastestProfile = yield* race([readCacheProfile, readNetworkProfile]);

  const pageData = yield* wait(pageDataFuture);

  return { fastestProfile, pageData };
}
```

`pageDataFuture` is still a future after `all(...)` returns. `loadProfilePage` can keep
running and wait for it where the page data is needed.

`fastestProfile` is already a value. `race(...)` has already run the alternatives through
its race scope before `loadProfilePage` continues.

## The Future Shape: Process

A process is one running routine inside a scope. `spawn(...)` shows the smallest form of
the same future-returning shape: it starts one process in the current scope and returns
that process's exit future.

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
`recommendationsFuture` is only an observation handle; `loadSidebar` decides when to wait
for it.

`all(...)` follows the same reading at a larger scale: several routines start in the
current scope, and the caller receives one future for their ordered result.

## The Value Shape: Scope Boundary

A scope is a runtime ownership boundary. `branch(...)` opens a child scope for a routine,
waits for that scope, and returns the scope result as a value.

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

`race(...)` is the specialized scope form for alternatives: it opens a scope, waits until
one routine succeeds, cancels the rest, and returns the winning value. `branch(...)` is the
general form for running a routine inside its own scope.

## Wait in Another Process

The host API keeps this distinction consistent. APIs that open a child scope wait for that
scope in the process that called them, then return a value. APIs that start work in the
current scope return a future for observing that work.

When work needs a child scope but the current process should continue, compose the two
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

## Apply the Same Reading

Other routine-taking APIs follow the same reading pattern. Some keep the routine in the
current scope and return a future; others run the routine in a child scope and return a
value.

```ts
import { resource } from "@shajara/host";
import { autonomy, guard, resumable } from "@shajara/host/primitives";

function* readOtherShapes() {
  // Current scope: provider publishes one value, returned as a future.
  const sessionFuture = yield* resource(openSession);

  // Child scope: recoverable by this recovery boundary.
  const guardedValue = yield* guard(saveProfile, recover);

  // Child scope: failure can be recovered by an ancestor guard.
  const recoveredValue = yield* resumable(saveProfile);

  // Child scope: scheduler or reaper controls scope progress.
  const autonomousValue = yield* autonomy(saveProfile, options);
}
```

Use the same first read: routine argument, returned future or value, then current scope or
child scope.
