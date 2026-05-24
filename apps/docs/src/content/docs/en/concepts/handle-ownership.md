---
title: Handles and Scope Ownership
description: Read handle lifetime from the scope that created the runtime object behind it.
---

A handle is a JavaScript value that gives access to shajara runtime state. The scope tree
chooses where that state lives: the call that creates a handle runs in one scope, and
that scope owns the runtime object behind the handle.

After creation, the handle value can move. It can be returned from a child scope, passed to
another routine, or kept by callback code. Moving the value does not move the owner.

## Creation Chooses the Owner

`future(...)` creates a result slot in the current scope. If a child scope creates a
future and returns only its observation handle, the caller receives a handle to a result
slot still owned by that child scope.

```ts
import { branch, future, wait } from "@shajara/host/primitives";

function* readPanelTitle() {
  const panelTitle = yield* branch(function* panelScope() {
    const [title] = yield* future<string>();

    return title;
  });

  // Throws UnfulfilledError because panelScope converged while title was still pending.
  return yield* wait(panelTitle);
}
```

The owner is chosen at `future(...)`. That call runs inside `panelScope`, so
`panelScope` owns the result slot. Returning `title` gives the caller an observation
handle, but it does not move the result slot into the caller's scope.

When `panelScope` converges with the future still pending, that future becomes
unfulfilled. The later `wait(panelTitle)` throws `UnfulfilledError`, observing the final
state chosen by the creating scope.

## Create Where the Lifetime Belongs

When the caller's scope should decide the result slot's lifetime, create the future in the
caller and pass the settlement handle into the child scope.

```ts
import { branch, future, settle, wait } from "@shajara/host/primitives";

function* readPanelTitle() {
  const [panelTitle, publishPanelTitle] = yield* future<string>();

  yield* branch(function* panelScope() {
    yield* settle(publishPanelTitle, "Settings");
  });

  // "Settings"
  return yield* wait(panelTitle);
}
```

The child scope still owns the work inside `panelScope`. It does not own `panelTitle`,
because `future(...)` ran in the caller before the child scope was created. The child
scope can settle the future through `publishPanelTitle`, but the ability to settle it is
not ownership.

Read the creating call as the placement decision: create the handle in the scope whose
convergence should decide the handle's final state.

## Endpoints Do Not Move the Channel

Channel endpoints can also cross a scope boundary. The channel remains owned by the scope
that called `channel(...)`.

```ts
import { branch, channel, send } from "@shajara/host/primitives";

function* sendAfterQueueScopeCloses() {
  const queueSender = yield* branch(function* queueScope() {
    const [, sender] = yield* channel<string, never>(1);

    return sender;
  });

  // Throws ChannelError because queueScope revoked the open channel when it converged.
  yield* send(queueSender, "draft");
}
```

`queueSender` is a live JavaScript value after `branch(...)` returns, but the channel
behind it belonged to `queueScope`. When `queueScope` converges, the open channel is
revoked. A later `send(...)` uses the endpoint and throws `ChannelError`; it does not
attach the channel to the caller's scope.

## Read the Creating Call

To find the owner, look for the call that creates the runtime object:

- `future(...)` and `completer(...)` create futures in the current scope.
- `channel(...)` and `feed(...)` create channels in the current scope.
- `abortSignal(...)` registers a signal with the current scope.
- `resource(...)` creates a future for the provided value and provider work attached to
  the current scope until release.

Calls that use a handle do not choose a new owner. Future calls that observe or settle,
such as `wait(...)` and `settle(...)`, act on an existing future. Channel calls that
send, receive, or close act on an existing channel. Passing an `AbortSignal` to an
external API, exposing a future through `promisify(...)`, or keeping the provided value
from `resource(...)` also uses a relationship that has already been attached to a scope.
The owner is still the scope where the handle was created.
