---
title: Promise Patterns
description: Organize Promise grouping, racing, callbacks, abort signals, and native Promise boundaries in shajara routines.
---

Once promise work is already entering a routine through `until(...)`, the next step is to
organize its ownership, joining, and lifecycle. The examples still start from familiar
Promise patterns, with the focus on how a shajara routine takes responsibility for that
work.

## Group Work Like `Promise.all`

Use `all(...)` when several routines should start together and produce one ordered result.

```ts
import { until } from "@shajara/host";
import { all, wait } from "@shajara/host/primitives";
import { loadPermissions, loadUserName } from "./user-data";

function* loadSession() {
  const session = yield* all([
    function* name() {
      return yield* until(() => loadUserName("user-1"));
    },
    function* permissions() {
      return yield* until(() => loadPermissions("user-1"));
    },
  ]);

  const [userName, permissions] = yield* wait(session);

  return { permissions, userName };
}
```

`all(...)` starts these routines and returns a future. That future keeps the combined
result so the caller can wait where the values are actually needed.

The important shift from `Promise.all(...)` is ownership: `all(...)` registers these
routines in the current scope, and the returned future is the handle used to join their
result later.

## Race Alternatives

Use `race(...)` when a routine needs the first successful result from several alternatives.

```ts
import { until } from "@shajara/host";
import { race } from "@shajara/host/primitives";
import { loadFromCache, loadFromNetwork } from "./user-data";

function* loadFastProfile() {
  const profile = yield* race([
    function* cache() {
      return yield* until(() => loadFromCache("user-1"));
    },
    function* network() {
      return yield* until(() => loadFromNetwork("user-1"));
    },
  ]);

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
import { openUserPicker } from "./user-picker";

function* pickUser() {
  const { future, reject, resolve } = yield* completer<string>();

  openUserPicker({
    onCancel() {
      reject(new Error("No user selected."));
    },
    onSelect(userId) {
      resolve(userId);
    },
  });

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

function* loadJson(url: string) {
  const signal = yield* abortSignal();
  const response = yield* until(() => fetch(url, { signal }));

  return yield* until(() => response.json());
}
```

`yield* abortSignal(...)` is another lifecycle registration. The returned signal observes
the current scope; it does not cancel the scope by itself. When the scope ends, the signal
aborts so the promise API can stop its outside work.

## Expose a Future as a Promise

Inside a routine, use `promisify(...)` when another API needs a native promise for a
shajara future.

```ts
import { promisify, until } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";
import { reportWhenReady } from "./analytics";

function* loadAndReport() {
  const loaded = yield* spawn(function* loadProfile() {
    return yield* until(() => fetch("/api/profile").then((response) => response.json()));
  });

  reportWhenReady(yield* promisify(loaded));

  return yield* wait(loaded);
}
```

The future still represents work managed by shajara; the native promise only lets outside
code observe that result. At `yield* promisify(loaded)`, the routine reads the current
execution context and exposes that future as a native promise.

Use promises at the boundary of a routine. Keep the work that needs ownership, joining, and
lifecycle convergence inside shajara routines.
