---
title: Promise Patterns
description: Read familiar Promise coordination through shajara values, futures, and Promise boundaries.
---

Familiar Promise code groups work, races alternatives, wraps callbacks, and hands values
back to Promise chains. In a shajara routine, read each pattern by asking whether the API
returns a value at the current point or a future to observe later.

## Group Work Like `Promise.all`

Use `all(...)` when several routines should start together and produce one ordered result.

```ts
import { sleep } from "@shajara/host";
import { all, wait } from "@shajara/host/primitives";

function* loadSession() {
  const sessionFuture = yield* all([
    function* loadUserName() {
      yield* sleep(20);

      return "Ada";
    },
    function* loadPermissions() {
      yield* sleep(10);

      return ["read", "write"];
    },
  ]);

  // userName: "Ada"; permissions: ["read", "write"]
  const [userName, permissions] = yield* wait(sessionFuture);

  return { permissions, userName };
}
```

`all(...)` starts the routines and returns one future for their ordered result. The caller
can keep going after the group starts, then use `wait(...)` where the values are needed.

This is close to `Promise.all(...)` in result shape, but the wait stays explicit in the
routine. Starting the group and waiting for the result are two separate moves.

## Race Alternatives Like `Promise.race`

Use `race(...)` when a routine needs the first successful result from several alternatives.

```ts
import { sleep } from "@shajara/host";
import { race } from "@shajara/host/primitives";

function* loadFastProfile() {
  // "network profile"
  return yield* race([
    function* cache() {
      yield* sleep(30);

      return "cached profile";
    },
    function* network() {
      yield* sleep(5);

      return "network profile";
    },
  ]);
}
```

After `network` wins, `race(...)` cancels the remaining routine before `loadFastProfile`
resumes.

This differs from `Promise.race(...)`, which settles with the first Promise result.
`race(...)` returns the winning value only after shajara has handled the non-winning
routine.

## Read the `all` and `race` Shapes

`all(...)` returns a future, so the caller still decides where to wait for the ordered
values. `race(...)` returns a value, so the caller resumes after the alternatives have
already converged to one result.

Read that as an interface shape: future means wait later; value means the API already
waited through the routines it started.

## Build a Future From Callbacks

When ordinary JavaScript code would create a Promise with `new Promise(...)` or
`Promise.withResolvers(...)`, use `completer(...)` to create a shajara future and settle
it from callbacks.

```ts
import { completer } from "@shajara/host";
import { wait } from "@shajara/host/primitives";

function* locateUser() {
  const { future, reject, resolve } = yield* completer<GeolocationPosition>();

  navigator.geolocation.getCurrentPosition(resolve, reject);

  return yield* wait(future);
}
```

Callback code settles the future; the routine waits for the same result with
`wait(...)`.

`yield* completer(...)` creates the future in the current scope and returns callback
functions for settling that future. Callback code receives settlement authority, but the
future remains owned by the scope that created it.

## Use Abort Signals at Promise Boundaries

Many Promise-based APIs already accept an `AbortSignal`. `abortSignal(...)` returns one
registered with the current scope.

```ts
import { abortSignal, until } from "@shajara/host";

function* loadProfile() {
  const signal = yield* abortSignal();
  const response = yield* until(() => fetch("/api/profile", { signal }));

  return yield* until(() => response.json());
}
```

`yield* abortSignal(...)` registers the signal with the current scope. The returned signal
does not cancel the routine by itself; it gives the Promise API a native cancellation
handle when the scope starts closing.

## Expose a Future as a Promise

Inside a routine, use `promisify(...)` when Promise code needs to observe a shajara
future.

```ts
import { promisify, sleep, until } from "@shajara/host";
import { spawn } from "@shajara/host/primitives";

function* loadAndReport() {
  const profileFuture = yield* spawn(function* loadProfile() {
    yield* sleep(10);

    return "Ada";
  });

  const profilePromise = yield* promisify(profileFuture);

  yield* until(() =>
    profilePromise.then((name) =>
      fetch("/api/profile-report", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    ),
  );
}
```

The future still represents a shajara process result. The returned Promise exposes that
result at the boundary so Promise chains can continue from it.
