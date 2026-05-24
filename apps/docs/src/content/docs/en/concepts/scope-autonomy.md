---
title: Scope Autonomy
description: Let a child scope subtree converge under local progression and closing policy.
---

After a small slice of synchronous work, a long loop can give the current scheduler a
chance to advance another queued process. The routine stays in one continuous control
flow.

`cede()` is that yield point. It does not create new work; it only hands the next step
back to the current scheduler. If `autonomy(...)` sets a scheduler for a child scope
subtree, the same yield point returns to that local scheduler.

## Yield Points Return to the Current Scheduler

The routine below leaves a scheduling boundary after each record write.

```ts
import { cede } from "@shajara/host/primitives";

function* rebuildIndex(records: readonly string[]) {
  for (const record of records) {
    // ... write one index record synchronously.
    yield* cede();
  }

  return "indexed";
}
```

Each record write is still ordinary synchronous JavaScript. At `cede()`, the current
process hands its next step back to the scheduler. The default scheduler can advance other
queued processes before returning to the next record in `rebuildIndex`.

The long loop keeps one continuous routine shape, with scheduling opportunities between
records.

## Schedulers Assign Process Steps

`autonomy(...)` creates a child scope under the caller's current scope; runnable processes
in that subtree go to its scheduler. The `process` in `assign(process)` is the runtime
identity seen by the scheduler. When routine code needs to attach local information to
that identity, it can use `self()` to read the current process.

```ts
import type { ProcessRef } from "@shajara/host";
import { autonomy, cede, self } from "@shajara/host/primitives";

function* rebuildSearchIndex(records: readonly string[]) {
  const groupByProcess = new Map<ProcessRef<unknown>, "foreground" | "background">();

  return yield* autonomy(
    function* indexSubtree() {
      const { process } = yield* self();

      groupByProcess.set(process, "background");

      for (const record of records) {
        // ... write one index record synchronously.
        yield* cede();
      }

      return "indexed";
    },
    {
      scheduler: {
        assign(process) {
          const group = groupByProcess.get(process) ?? "foreground";

          // ... choose a processor from process and group, then return it to shajara.
        },
      },
    },
  );
}
```

`self()` and `assign(process)` see the same process reference, but at different
points. The entry process reaches the scheduler before the routine reaches `self()`, so
an unregistered process can use the default assignment. After registration, later yields
from `cede()` return to the scheduler with the same process, and `assign(process)` can
read the registered local information.

## Reapers Receive Closing Scope Refs

An autonomous subtree can also carry a reaper. Reapers only handle scope refs on the
closing path: when shajara checks a scope that is still closing, the reaper returns
normally to keep waiting or throws to fail the scope being judged.

```ts
import type { ScopeRef } from "@shajara/host";
import { autonomy, self } from "@shajara/host/primitives";

function* runPreview() {
  const remainingChecksByScope = new Map<ScopeRef<unknown>, number>();

  return yield* autonomy(
    function* previewEntry() {
      const { scope } = yield* self();

      remainingChecksByScope.set(scope, 2);

      // ... run preview work and keep cleanup inside this child scope.
    },
    {
      reaper: function* failAfterCloseBudget(closingScope) {
        const remainingChecks = remainingChecksByScope.get(closingScope);

        if (remainingChecks === undefined) {
          return;
        }

        if (remainingChecks > 0) {
          remainingChecksByScope.set(closingScope, remainingChecks - 1);
          return;
        }

        throw new Error("preview scope did not close");
      },
    },
  );
}
```

`previewEntry` runs in the child scope created by `autonomy(...)`. It uses `self()` to
register its own scope reference; if that scope enters the closing path, the reaper's
`closingScope` reads the same registration.

When that registration still has checks left, the reaper consumes one and keeps waiting.
Once the budget is exhausted, it throws, failing the scope being judged with that error.
