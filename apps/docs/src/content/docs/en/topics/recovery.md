---
title: Recovery
description: Recover a failed child scope at a guard boundary and deliver the recovery result to the resumable wait point.
---

Some child-scope failures should not be decided immediately by the routine waiting for
them. They should be offered to an outer boundary first. Recovery lets that boundary
decide what the wait point sees next: a substitute value, a thrown error, or the original
scope exit error returned unchanged.

## Return a Recovery Value

Use `resumable(...)` on the child scope that may need recovery. Put `guard(...)` around
the routine that owns the recovery policy.

```ts
import type { RiteCoroutine } from "@shajara/host";
import { guard, resumable } from "@shajara/host/primitives";

function* scanPhotosWithRecovery() {
  // "manual approval"
  return yield* resumable(function* scanPhotos(): RiteCoroutine<string> {
    throw new Error("scanner offline");
  });
}

function* publishListing() {
  return yield* guard(
    function* reviewListing() {
      const approval = yield* scanPhotosWithRecovery();

      return `publish with ${approval}`;
    },
    function* approveManually() {
      // Recovery value: "manual approval".
      return [true, "manual approval"];
    },
  );
}
```

`scanPhotos` fails inside the child scope created by `resumable(...)`. The handler's
`[true, value]` becomes the value returned through `scanPhotosWithRecovery()`, so
`reviewListing` continues from that wait point.

The recovery value belongs to `resumable(...)`. The return value of `guard(...)` is still
the result of the guarded entry.

## Delegate to an Ancestor

A recovery handler can decline a recovery request by returning `[false]`. The same
request then moves to the next visible guard boundary.

```ts
import type { RiteCoroutine, ScopeExitError } from "@shajara/host";
import { CanceledError } from "@shajara/host";
import { guard, resumable } from "@shajara/host/primitives";

function* scanPhotosWithRecovery() {
  // After delegation: "manual approval".
  return yield* resumable(function* scanPhotos(): RiteCoroutine<string> {
    throw new Error("scanner offline");
  });
}

function* publishWithManualFallback() {
  return yield* guard(
    function* reviewListing() {
      return yield* scanPhotosWithRecovery();
    },
    function* handleCancellationOnly(error: ScopeExitError) {
      if (error instanceof CanceledError) {
        return [true, "scan canceled"];
      }

      // Delegate to an ancestor guard.
      return [false];
    },
  );
}

function* publishWithPolicy() {
  return yield* guard(
    function* publishWithManualPolicy() {
      return yield* publishWithManualFallback();
    },
    function* approveManually() {
      // Delegated recovery value: "manual approval".
      return [true, "manual approval"];
    },
  );
}
```

The inner recovery handler handles child cancellation locally. For the scope failure from
`scanPhotos`, it returns `[false]`, so the outer guard receives the same scope exit error
and supplies the manual approval value. If every visible recovery handler returns
`[false]`, the original scope exit error returns unchanged to the `resumable(...)` wait
point.

## Throw a Recovery Error

A recovery handler does not have to express recovery as a successful value. It can throw
an error instead, making the waiting `resumable(...)` throw that error from the original
wait point.

```ts
import type { RiteCoroutine } from "@shajara/host";
import { guard, resumable } from "@shajara/host/primitives";

function* scanPhotosWithRecovery() {
  // Throws Error("manual approval unavailable").
  return yield* resumable(function* scanPhotos(): RiteCoroutine<string> {
    throw new Error("scanner offline");
  });
}

function* publishListing() {
  return yield* guard(
    function* reviewListing() {
      const approval = yield* scanPhotosWithRecovery();

      return `publish with ${approval}`;
    },
    function* requireManualApproval(): RiteCoroutine<never> {
      // Recovery result: thrown Error.
      throw new Error("manual approval unavailable");
    },
  );
}
```

`requireManualApproval` expresses recovery as a thrown `Error` rather than as
`[true, value]`. Both results return to the same `resumable(...)` wait point:
`[true, value]` makes the wait return `value`, while throwing makes the wait throw that
error.

Recovery is for the point where a child scope has exited and the waiting caller should
receive a substitute result. That substitute can be a returned value or a thrown error.
