---
title: Structured Scope Convergence
description: Understand what a child scope waits for before it returns or fails.
---

Returning from a child scope is not the same as returning from one function. The child
scope may still own processes that must finish before the caller receives the value.

Scope convergence is the step where a scope gathers the work it owns, then gives its final
result to the process waiting for it.

## Wait for the Whole Child Scope

`branch(...)` opens a child scope and waits for that scope to converge. The routine passed
to it becomes the scope's entry process, but it is not the only work the scope may contain.

```ts
import { sleep } from "@shajara/host";
import { branch, spawn } from "@shajara/host/primitives";

function* saveProfile() {
  // Returns "profile saved" after writeAuditTrail has finished.
  return yield* branch(function* saveProfileScope() {
    yield* spawn(function* writeAuditTrail() {
      yield* sleep(30);

      return "audit written";
    });

    yield* sleep(5);

    return "profile saved";
  });
}
```

`saveProfileScope` returns before `writeAuditTrail`, but the child scope still owns that
process. `branch(...)` waits for the owned process before returning the entry process
result.

This is structured convergence: the caller does not manually track every process inside
the child scope. The scope gathers the structure it owns into one result boundary.

## Failure Cascades Cancellation

When routine code waits for a scope, shajara brings the scope result back through ordinary
JavaScript control flow. Success returns a value, and failure throws `ScopeError`.

```ts
import { ScopeError, sleep } from "@shajara/host";
import { branch, spawn } from "@shajara/host/primitives";

function* launchCampaign() {
  try {
    return yield* branch(function* campaignScope() {
      yield* spawn(function* sendEmailBatch() {
        yield* sleep(5);

        console.log("email failed");
        throw new Error("email provider failed");
      });

      yield* spawn(function* refreshAudience() {
        yield* sleep(30);

        console.log("audience refreshed");
        return "audience refreshed";
      });

      yield* sleep(30);

      console.log("campaign launched");
      return "campaign launched";
    });
  } catch (error) {
    if (!(error instanceof ScopeError)) {
      throw error;
    }

    console.log("campaign failed");
    return "campaign failed";
  }
}

// Prints:
// email failed
// campaign failed
```

After `sendEmailBatch` throws, `campaignScope` enters failure convergence. The scope
cancels the other work it owns, so `refreshAudience` and the entry process never reach
their success logs.

The caller sees a `ScopeError` because it observes the whole child scope's failure result,
not just the original error thrown by one process.

## Handle Local Failure Inside a Spawned Routine

`spawn(...)` returns a future, but the process it starts still belongs to the current
scope. If that process fails, the current scope enters failure convergence too.

When spawned work is allowed to fail but that failure should not cancel the rest of the
same scope, handle it inside the routine passed to `spawn(...)` and turn it into an
ordinary result.

```ts
import { sleep } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";

function* launchCampaign() {
  const emailStatusFuture = yield* spawn(function* sendEmailBatch() {
    try {
      yield* sleep(5);

      throw new Error("email provider failed");
    } catch {
      console.log("email failed");

      return "email failed";
    }
  });

  yield* sleep(30);

  console.log("campaign still running");
  const emailStatus = yield* wait(emailStatusFuture);

  return { emailStatus };
}

// Prints:
// email failed
// campaign still running
```

Here, `sendEmailBatch` does not leave the error to cross the process boundary. It decides
its own failure result, the later `wait(emailStatusFuture)` receives an ordinary value,
and the current scope can continue.

If the `try...catch` waits until an outer `wait(emailStatusFuture)`, the process failure
has already driven the current scope into failure convergence.
