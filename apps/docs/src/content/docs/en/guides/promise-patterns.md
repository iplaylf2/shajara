---
title: Promise Patterns
description: Use familiar Promise patterns to organize shajara routine work and native Promise boundaries.
---

Familiar Promise shapes are useful as a reading aid. In a shajara routine, the important
question is whether a call gives the routine a value now or a handle it can wait for
later.

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

  const [userName, permissions] = yield* wait(sessionFuture);

  // userName is "Ada"; permissions is ["read", "write"].
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
  const profile = yield* race([
    function* cache() {
      yield* sleep(30);

      return "cached profile";
    },
    function* network() {
      yield* sleep(5);

      return "network profile";
    },
  ]);

  // profile is "network profile".
  return profile;
}
```

After `network` wins, `race(...)` cancels the remaining routine and returns the winning
value to `loadFastProfile`.

This differs from `Promise.race(...)`, which settles with the first promise result.
`race(...)` returns the winning value only after shajara has handled the non-winning
routine.

## Read the `all` and `race` Shapes

`all(...)` returns a future, so the caller still decides where to wait for the ordered
values. `race(...)` returns a value, so the caller resumes after the alternatives have
already converged to one result.

For now, read that as an interface shape: future means wait later; value means this API
already waited through the routines it started.

## Build a Future From Callbacks

When plain JavaScript code would create a promise with `new Promise(...)` or
`Promise.withResolvers(...)`, use `completer(...)` to create a shajara future and settle it
from callbacks.

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

`yield* completer(...)` is not just generator call syntax. It creates the future and
registers it with the current scope's lifecycle, so if that scope ends while the future is
still pending, shajara cancels the future instead of leaving a dangling handle.

## Use Abort Signals at Promise Boundaries

Many promise-based APIs already accept an `AbortSignal`. `abortSignal(...)` returns one
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

Inside a routine, use `promisify(...)` when native Promise code needs to observe a shajara
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

The future still represents a shajara process result. The native Promise exposes that
result at the boundary so ordinary Promise chains can continue from it.
