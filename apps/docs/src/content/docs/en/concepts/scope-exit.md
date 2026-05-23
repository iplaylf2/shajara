---
title: Scope Exit
description: Understand scope exit as the result a scope reports after owned work converges.
---

The scope tree explains where shajara places child scopes and processes. Scope exit is
where one node of that tree reports a result.

A child scope is also the root of a subtree. It may contain an entry process, processes
created by `spawn(...)`, and further child scopes. Work inside that subtree can still
have local results. When routine code waits for that scope, it waits for the work in the
subtree to converge, then reads the result reported by the scope.

## Exit Belongs to the Boundary

```ts
import { sleep } from "@shajara/host";
import { branch, spawn } from "@shajara/host/primitives";

function* publishListing() {
  return yield* branch(function* listingScope() {
    yield* spawn(function* writeSearchIndex() {
      yield* sleep(5);

      throw new Error("index failed");
    });

    yield* sleep(20);

    return "published";
  }); // Throws ScopeError.
}
```

`writeSearchIndex` is a process inside `listingScope`, and it throws the original error.
`publishListing` is not waiting on that process future. It is waiting on `listingScope`,
the boundary created by `branch(...)`. The visible result is therefore that scope's failed
exit. The relevant part of the thrown `ScopeError` has this shape:

```ts
{
  kind: "scope",
  cause: {
    kind: "external",
    raw: new Error("index failed"),
  },
}
```

The original error remains attached inside the cause, but the boundary seen by the caller
is the scope.

For a normal exit, the same reading applies: after all owned work converges, the scope
reports the entry value. For cancellation, the same boundary reports cancellation after
the work in that subtree has been canceled. The useful distinction is not the list of
outcomes; it is the boundary being observed.

Scope exit is therefore different from waiting on a future or using a channel endpoint.
Waiting on a future reads that future's settlement. Sending to or receiving from a
channel reads that channel's state. Observing a scope reads the boundary itself: the
waiting routine receives the scope's exit, not every result inside it.
