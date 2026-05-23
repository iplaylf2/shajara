---
title: Scope Exit
description: Understand scope exit as the result a scope reports after owned work converges.
---

The scope tree explains where shajara places child scopes and processes. Scope exit is
where the work owned by a scope becomes one observable result.

A child scope may contain an entry process, processes created by `spawn(...)`, child
scopes, futures, and channels. Those inner objects can still settle or reach terminal
states on their own. When routine code waits for that scope, it is not reading every
inner result. It is reading the result the scope reports after its owned work converges.

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

`writeSearchIndex` is the process that throws the original error. `publishListing` is
not waiting on that process future; it is waiting on `listingScope`. The visible result
is therefore the child scope's failed exit. The relevant part of the thrown `ScopeError`
has this shape:

```ts
{
  kind: "scope",
  cause: {
    kind: "external",
    raw: new Error("index failed"),
  },
}
```

The original error remains attached inside the cause, but the boundary seen by the
caller is the scope.

For a normal exit, the same reading applies: after all owned work converges, the scope
reports the entry value. For cancellation, it reports cancellation. The useful distinction
is not the list of outcomes; it is the boundary being observed.

Scope exit is therefore different from waiting on a future or using a channel endpoint.
Waiting on a future reads that future's settlement. Sending to or receiving from a
channel reads that channel's state. Observing a scope reads the boundary itself, and
that boundary decides how unfinished work and owned objects end.
