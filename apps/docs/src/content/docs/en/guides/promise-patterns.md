---
title: Promise Patterns
description: Organize Promise grouping, racing, callbacks, abort signals, and native Promise boundaries in shajara routines.
---

Once promise work is already entering a routine through `until(...)`, the next step is to
organize its ownership, joining, and lifecycle. The examples still start from familiar
Promise patterns and show how a shajara routine takes responsibility for that work.

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

`all(...)` starts these routines and returns a future. That future keeps the combined
result so the caller can wait where the values are actually needed.

The important shift from `Promise.all(...)` is ownership: `all(...)` registers these
routines in the current scope, and the returned future is the handle used to join their
results later.

## Race Alternatives

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

After one routine wins, `race(...)` cancels the remaining routines and returns the winning
value to the caller.

This is not the same as `Promise.race(...)` returning the first settled promise.
`race(...)` returns the winning value directly because it has already canceled the
non-winning routines inside the race scope; when the caller receives the value, those
routines do not keep running.

## Read Return Shapes

The difference between the two examples is visible in the return value. `all(...)` returns
a future, which means the work still belongs to the current scope and the caller decides
when to join it. `race(...)` returns the result directly, which means it has already waited
through the intermediate race scope.

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

`yield* completer(...)` is more than call syntax. It registers the future with the current
scope's lifecycle: if the scope ends while this future is still pending, shajara cancels it
instead of leaving a dangling handle.

Callback code settles the future; the routine waits for the same result with
`wait(...)`.

## Use Abort Signals at Promise Boundaries

Many promise-based APIs already accept an `AbortSignal`. `abortSignal(...)` returns one
tied to the current scope.

```ts
import { abortSignal, until } from "@shajara/host";

function* loadProfile() {
  const signal = yield* abortSignal();
  const response = yield* until(() => fetch("/api/profile", { signal }));

  return yield* until(() => response.json());
}
```

`yield* abortSignal(...)` is another lifecycle registration. The returned signal observes
the current scope; it does not cancel the scope by itself. When the scope ends, the signal
aborts so the promise API can stop its outside work. If the owning scope closes before
`fetch(...)` finishes, the signal aborts that request.

## Expose a Future as a Promise

Inside a routine, use `promisify(...)` when native Promise code needs to observe a
shajara future.

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

The future still represents work managed by shajara. The native promise exposes that
result at the boundary so ordinary Promise chains can continue from it. Calling
`yield* promisify(profileFuture)` reads the current execution context and exposes that
future as a native promise.

Use promises at the boundary of a routine. Keep the work that needs ownership, joining, and
lifecycle convergence inside shajara routines.
