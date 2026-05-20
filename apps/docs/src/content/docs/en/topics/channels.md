---
title: Channels
description: Move repeated values inside shajara concurrency and receive values from JavaScript callbacks.
---

When work needs to hand off a sequence of values, a future's single result is not enough.
A channel is a scope-owned message path for that repeated handoff. It separates receiver
authority from sender authority, so different routines can coordinate through capacity
and waiting rules.

## Move Values Between Routines

`channel(...)` returns a receiver and a sender. The receiver is accepted by
`receive(...)`; the sender is accepted by `send(...)`.

```ts
import { channel, receive, send, spawn } from "@shajara/host/primitives";

function* queueBatches() {
  const [receiver, sender] = yield* channel<string, never>(1);

  yield* spawn(function* writeBatches() {
    const first = yield* receive(receiver); // "draft"
    const second = yield* receive(receiver); // "publish"

    writeBatch(first);
    writeBatch(second);
  });

  yield* send(sender, "draft");
  yield* send(sender, "publish");
}
```

The receiver and sender form the handoff point in this example. `spawn(...)` starts the
consumer in the same scope, and the current routine only needs the sender to hand values
to it.

`send(...)` waits until the channel accepts a value. `receive(...)` waits until a value is
available. Delivered values are FIFO and single-use.

## Choose the Capacity

Capacity decides when `send(...)` can continue before a receiver arrives.

- `0` creates rendezvous delivery: send and receive synchronize directly.
- A finite positive number creates a bounded buffer with that many values.
- `Infinity` creates an unbounded buffer.

Use bounded capacity when the producer should feel backpressure from the consumer. Use
rendezvous capacity when neither side should move past the handoff alone. Use unbounded
capacity only when retaining every queued value is acceptable.

## Try Without Waiting

Use `trySend(...)` and `tryReceive(...)` when a routine should inspect the current channel
state without blocking the process.

```ts
import { channel, tryReceive, trySend } from "@shajara/host/primitives";

function* inspectBatchQueue() {
  const [receiver, sender] = yield* channel<string, never>(1);

  const empty = yield* tryReceive(receiver); // [false]
  const acceptedDraft = yield* trySend(sender, "draft"); // true
  const acceptedPublish = yield* trySend(sender, "publish"); // false
  const next = yield* tryReceive(receiver); // [true, "draft"]

  return { acceptedDraft, acceptedPublish, empty, next };
}
```

`trySend(...)` returns `false` when accepting the value would require waiting.
`tryReceive(...)` returns `[false]` when no value is ready.

## Close or Revoke

A channel reaches a terminal state through explicit close or scope-owned revocation.
`close(...)` accepts either endpoint and closes the channel with an explicit outcome.

```ts
import { ChannelError } from "@shajara/host";
import { channel, close, receive } from "@shajara/host/primitives";

function* readClosedQueue() {
  const [receiver, sender] = yield* channel<string, "complete">(0);

  yield* close(sender, "complete");

  try {
    yield* receive(receiver);
  } catch (error) {
    if (error instanceof ChannelError) {
      // Closed condition with outcome "complete".
      return error.detail;
    }

    throw error;
  }
}
```

The scope that calls `channel(...)` owns the channel. If that scope converges while the
channel is still open, shajara revokes it and wakes blocked senders or receivers.
`send(...)`, `receive(...)`, `trySend(...)`, and `tryReceive(...)` throw `ChannelError`
when they observe a closed or revoked channel.

## Receive From Callbacks

Use `feed(...)` when values arrive at a plain JavaScript boundary, such as a callback or
event handler, and need to enter shajara concurrency. The receiver stays inside routine
code; the returned functions stay near the callback registration.

```ts
import { feed } from "@shajara/host";
import { receive } from "@shajara/host/primitives";

function* takeTwoUploads() {
  const { receiver, trySend } = yield* feed<File, never>(Infinity);

  registerUploadHandler((file) => {
    trySend(file);
  });

  const first = yield* receive(receiver);
  const second = yield* receive(receiver);

  return [first, second];
}
```

`feed(...)` creates the channel inside the current scope. Routine code consumes the
receiver, and callback code can call `trySend(...)` or `close(...)` from that JavaScript
boundary.
