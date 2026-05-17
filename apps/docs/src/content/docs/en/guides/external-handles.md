---
title: External Handles
description: Keep requests, callback futures, and resources tied to the scope that owns them.
---

Outside APIs often give you a handle that outlives the line of code that created it. In
shajara, create that handle in the scope whose lifetime should bound it.

## Abort Promise Work With the Scope

`abortSignal(...)` creates an `AbortSignal` tied to the current scope. Pass it to promise
APIs such as `fetch(...)` when outside work should stop with that scope.

```ts
import { abortSignal, until } from "@shajara/host";
import { branch } from "@shajara/host/primitives";

function* loadProfilePanel(userId: string) {
  const profileRequest = yield* branch(function* panelScope() {
    const signal = yield* abortSignal();

    const request = fetch(`/api/users/${userId}/profile`, { signal }).then(
      () => "profile loaded",
      (error) => {
        if (signal.aborted) {
          return "profile request stopped";
        }

        throw error;
      },
    );

    // The panel closes while this request is still pending.
    return request;
  });

  const status = yield* until(() => profileRequest);

  // status is "profile request stopped".
  return status;
}
```

`panelScope` creates the request and the signal that can stop it. When that scope
converges, the signal aborts. The caller may still receive the promise, but the request's
lifetime was decided by `panelScope`.

The placement matters: `yield* abortSignal()` runs inside `panelScope`, so the signal is
registered with the same scope that owns the request.

## Cancel Callback Futures

`completer(...)` creates a future that JavaScript callbacks can settle. If the current
scope closes while that future is still pending, the future is canceled before a later
callback can use it as a live result.

```ts
import { CanceledError, completer } from "@shajara/host";
import { branch, wait } from "@shajara/host/primitives";

function* waitForFileChoice() {
  const selectedFile = yield* branch(function* fileDialogScope() {
    const { future, resolve } = yield* completer<File>();

    registerFileChoice(resolve);

    // The dialog closes before registerFileChoice calls resolve.
    return future;
  });

  try {
    const file = yield* wait(selectedFile);

    return file.name;
  } catch (error) {
    if (!(error instanceof CanceledError)) {
      throw error;
    }

    return "file dialog closed";
  }
}
```

`registerFileChoice(resolve)` stands in for a file input callback. If the dialog closes
before that callback fires, `fileDialogScope` converges and cancels the pending future.
`wait(selectedFile)` then observes cancellation instead of waiting for a callback owned by
a closed scope.

Here, `yield* completer<File>()` creates and registers the future in `fileDialogScope`, so
the later callback does not own a live shajara result after the dialog scope closes.

## Release Resource Providers

Some outside resources need setup, a ready value, and cleanup when the owning scope
closes. `resource(...)` gives that shape directly: the provider opens the resource, calls
`provide(value)` when it is ready, then stays attached to the current scope until that
scope releases it.

```ts
import { resource } from "@shajara/host";
import { branch, wait } from "@shajara/host/primitives";

function* watchRoomUpdates(roomId: string) {
  yield* branch(function* updatesScope() {
    const updatesSocket = yield* resource<WebSocket>(function* openUpdates(provide) {
      const socket = openRoomSocket(roomId);
      console.log("connected");

      try {
        yield* provide(socket);
      } finally {
        socket.close();
        console.log("closed");
      }
    });

    const socket = yield* wait(updatesSocket);

    socket.send(JSON.stringify({ kind: "subscribe" }));
    console.log("subscribed");

    // The room updates view closes here.
  });
}

// Prints:
// connected
// subscribed
// closed
```

Calling `provide(socket)` settles `updatesSocket`, so `updatesScope` can send the
subscription. After `provide(...)`, the provider stays parked under the same scope.

When `updatesScope` finishes, the child scope releases the provider through normal
generator unwinding. The `finally` block closes the socket after the room updates view has
closed.

## Choose the Owning Scope

Create the handle in the scope that decides when the outside work should stop. A panel
scope is the right place for a request tied to that panel. A dialog scope is the right
place for a callback future tied to that dialog. A view scope is the right place for a
socket that should close with that view.

The caller may receive a promise, a future, or a ready value from that scope. That does
not move ownership. When the creating scope converges, its signal aborts, its pending
future is canceled, or its provider cleanup runs.
