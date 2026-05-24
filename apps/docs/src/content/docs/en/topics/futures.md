---
title: Single-Result Futures
description: Create single-result handles, settle them from routines, and choose where to wait.
---

Some results should not return immediately from the current routine. They may be
provided later by another piece of work in the same scope. A future is the single-result
slot for that shape: one place gets settlement authority, and other routines can observe
the result when they need it.

## Create a Result Slot

`future(...)` returns two handles for the same result. One handle observes the result; the
other settles it.

```ts
import { future, settle, wait } from "@shajara/host/primitives";

function* prepareSummary() {
  const [summary, publishSummary] = yield* future<string>();

  yield* settle(publishSummary, "ready");

  const text = yield* wait(summary);

  return `summary ${text}`;
}
```

`summary` observes the result. `publishSummary` settles it.

The scope that calls `future(...)` owns the result slot. If that scope converges while the
future is still pending, shajara settles the future as unfulfilled instead of leaving a
waiter attached to a result that can no longer be produced.

## Try Without Waiting

Use `poll(...)` when a routine wants to check the current state without waiting. It asks
the future once and returns immediately.

```ts
import type { RiteFuture } from "@shajara/host";
import { poll } from "@shajara/host/primitives";

function* readDisplayNameNow(displayName: RiteFuture<string>) {
  const [hasDisplayName, currentDisplayName] = yield* poll(displayName);

  return hasDisplayName ? currentDisplayName : "Loading";
}
```

`poll(displayName)` returns `[false]` if the future is pending at that moment. If the
future has a successful value, it returns `[true, value]`.

## Settle a Failure

Use `settleError(...)` when a future should settle with a JavaScript failure instead of a
successful value.

```ts
import { future, settleError, wait } from "@shajara/host/primitives";

function* readRequiredTitle() {
  const [title, rejectTitle] = yield* future<string>();

  yield* settleError(rejectTitle, new Error("missing title"));

  // Throws because the future was settled as a failure.
  return yield* wait(title);
}
```

Routine code observes that failure through the same future handle.

## Complete From Callbacks

Use `completer(...)` when a shajara future needs to be settled from an ordinary JavaScript
boundary, such as a callback.

```ts
import { completer } from "@shajara/host";
import { wait } from "@shajara/host/primitives";

function* waitForFileChoice() {
  const { future: selectedFile, resolve } = yield* completer<File>();

  registerFileChoice(resolve);

  return yield* wait(selectedFile);
}
```

`completer(...)` creates the future in the current scope and returns functions that can
be called from that JavaScript boundary. Callback code calls `resolve(...)`, and routine
code observes the result through the returned future.
