---
title: Scope-Owned Handles
description: Keep external async handles inside the scope that owns their work.
---

Routines can start outside work through browser or application APIs. The handle that
represents that work, such as a request, callback future, or resource, should live in the
scope that needs it. While that scope is open, the outside work can continue; when it
closes, shajara has the structure it needs to abort, cancel, or clean up that work.

## Abort Fetch Work With the Scope

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

    // The user closes the panel before this request resolves.
    return request;
  });

  const status = yield* until(() => profileRequest);

  // status is "profile request stopped".
  return status;
}
```

`panelScope` owns the profile request while the panel is open. Returning from
`panelScope` represents the panel closing while the fetch promise is still pending.

When the child scope converges, it aborts the signal. The pending request rejects through
the abort path, and the outer routine observes `"profile request stopped"`.

## Cancel Futures That Outlive Their Scope

`completer(...)` creates a future that JavaScript callbacks can settle. If the scope closes
while that future is still pending, the future is canceled before a later callback can use
it as a live result.

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

`registerFileChoice(resolve)` stands in for a file input callback. If the user chooses a
file, it calls `resolve(file)`. The future belongs to `fileDialogScope`.

If the dialog closes before that callback fires, the scope converges and cancels the
pending future. The caller can still receive that future, but `wait(selectedFile)` observes
that it was canceled and returns `"file dialog closed"`.

## Control a Resource Lifetime

Some outside resources need more than a cancellation signal or a pending future. They need
a setup step, a ready value that the routine can use, and a cleanup step when the owning
scope closes.

`resource(...)` gives that shape directly. The provider opens the resource, calls
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

The provider first opens the room updates socket. Calling `provide(socket)` settles
`updatesSocket`, so `updatesScope` can send the subscription. After `provide(...)`, the
provider stays parked under the same scope.

After `updatesScope` finishes, the child scope releases the provider through normal
generator unwinding. That runs the `finally` block and closes the socket after the room
updates view has closed, which is why `"closed"` prints last.

## Choose the Owning Scope

Create the handle in the scope that decides when the outside work should stop. A panel
scope is the right place for a request tied to that panel. A dialog scope is the right
place for a callback future tied to that dialog. A view scope is the right place for a
socket that should close with that view.

The caller may still receive a promise, a future, or a ready value from that scope. That
does not move ownership. When the creating scope converges, its signal aborts, its pending
future is canceled, or its provider cleanup runs.
