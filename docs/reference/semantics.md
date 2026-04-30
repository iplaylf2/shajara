# Semantic Baseline

This document defines the core semantics.

## Computation

### `Wisp`

`Wisp<T>` is the primary computation carrier.

- `stirring`: carries a `sigil` and waits for the corresponding `echo` to continue
- `resting`: carries the final `relic`

At runtime, the interpreter handles the `sigil`, produces an `echo`, and feeds that `echo` back into `resonate` until the computation reaches `resting`.

### `Ritual`

`Ritual<T>` is `() => Wisp<T>`. It represents a deferred computation entry.

### `Sigil`

`Sigil` is an instruction object interpreted by the runtime. Each sigil declares the shape of its `echo` through its own type witness.

The public sigil kinds include:

- context: `bind`, `lookup`, `unbind`
- control: `cede`
- termination and cleanup: `cancel`, `defer`, `halt`
- concurrency: `branch`, `spawn`
- future: `future`, `poll`, `settle`, `wait`
- channel: `channel`, `close`, `send`, `receive`, `trySend`, `tryReceive`
- introspection: `self`

## Structural Objects

### `Scope`

`Scope` is the structured concurrency boundary that carries:

- process ownership
- context visibility
- future ownership
- failure propagation and cancellation convergence

`ScopeRef<T>` is the control reference for a scope and explicitly carries `exitFuture`.

Each scope is created with a read-only `ScopeDescriptor`. The field relevant to convergence is:

```ts
type FailureMode = "propagate" | "contain";
```

- `propagate`: failures continue upward through the parent chain
- `contain`: the scope itself forms the convergence boundary for failure and cancellation

### `Process`

`Process` is the running instance of a `Wisp`. Each process always belongs to exactly one scope.

`ProcessRef<T>` is the control reference for a process and explicitly carries `exitFuture`.

Each process is created with a read-only `ProcessDescriptor`. The field relevant to completion is:

```ts
type CompletionMode = "structural" | "detached";
```

- `structural`: participates in completion for its enclosing scope
- `detached`: is excluded from completion for its enclosing scope

## Future, Context, and Channel

### `Future`

`FutureKey<T>` and `FutureSettleKey<T>` together identify a single convergence slot:

- `FutureKey<T>` is observation-only
- `FutureSettleKey<T>` is settlement-only

The result domain of a future is fixed to `Either<FailureShape, T>`. Therefore:

- `wait(future)` returns `Either<FailureShape, T>`
- `poll(future)` returns `Option<Either<FailureShape, T>>`
- the same future may be observed repeatedly by multiple waiters

When the owner scope finishes, any unfinished futures converge uniformly as `canceled`.

### `ContextKey`

`ContextKey<T>` is used for binding and lookup along the scope chain. Bindings are recorded on the current scope, and lookups remain visible along the ancestor chain.

### `Channel`

`channel<T, O>(capacity, overloadRewrite?)` creates a channel owned by the current scope and returns a `ChannelHandle<T, O>`:

```ts
type ChannelHandle<T, O> = readonly [receiver: ChannelReceiver<T, O>, sender: ChannelSender<T, O>];
```

The `T` parameter is the value type. The `O` parameter is the explicit close outcome type.

The two endpoints separate read and write authority:

- `ChannelReceiver<T, O>` is accepted by `receive(receiver)` and `tryReceive(receiver)`
- `ChannelSender<T, O>` is accepted by `send(sender, value)` and `trySend(sender, value)`
- either endpoint is accepted by `close(endpoint, outcome)`

Valid capacities define the buffering model:

- `0`: rendezvous channel; send and receive synchronize directly
- finite positive number: bounded channel with that many buffered values
- `Infinity`: unbounded channel

A negative or `NaN` capacity is invalid and halts with a `channel` failure.

On an overloaded finite channel, `overloadRewrite` may rewrite the current buffer before
the incoming value is accepted:

```ts
type OverloadRewrite<T> = (buffer: readonly T[], incoming: T) => readonly T[];
```

The incoming value is accepted only if capacity remains available after the rewrite. The
default rewrite returns `buffer`, which preserves the normal blocking behavior. If
`overloadRewrite` throws, the channel is revoked, the incoming value is not accepted, and
the owning scope enters the failure path with a `channel` failure.

Channel delivery remains:

- FIFO
- single-delivery per value

Send and receive operations each have blocking and non-blocking forms:

- `send(sender, value)` blocks until the value is accepted, then returns `{ kind: "sent" }`
- `trySend(sender, value)` never blocks; it returns `some({ kind: "sent" })`, `none`, or a terminal state wrapped in `some`
- `receive(receiver)` blocks until a value or terminal channel state is available
- `tryReceive(receiver)` never blocks; it returns `some({ kind: "value", value })`, `none`, or a terminal state wrapped in `some`

Terminal channel states are `{ kind: "closed", outcome }` and `{ kind: "revoked" }`.
A successful receive returns `{ kind: "value", value }`.

`close(endpoint, outcome)` closes the channel explicitly. Closed channel results carry
that outcome. A scope that finishes while it still owns open channels
revokes them. Closing and revocation both wake blocked senders and receivers; close
represents an explicit channel operation, while revoke represents owner-scope disposal.

## Failure

There are five failure kinds:

- `canceled`
- `channel`
- `external`
- `interrupted`
- `scope`

Their meanings are:

- `canceled`: convergence along the cancellation path
- `channel`: a channel primitive rejected invalid input, or a runtime channel operation failed
- `external`: an external exception or rejected value mapped into a failure result
- `interrupted`: an out-of-band failure in scheduling or governance interrupted progression
- `scope`: a scope converged structurally as a failure during `closing`

`ScopeFailure` additionally carries:

- `cause`: the root cause came from a process or child scope; its `kind` is `process` or `scope`
- `suppressed`: additional failures captured during convergence

`halt(failure)` makes the current process exit as a failure and drives its enclosing scope into the failure-closing path according to the existing failure convergence rules.

## Convergence

### Scope Lifecycle

The externally observable lifecycle states of a scope are:

- `open`
- `closing`
- `closed`

A scope enters its closing path for the following reasons:

- all structural processes have exited
- a local process failed
- an ancestor cancellation cascaded into it
- a propagating child-scope failure moved upward into it

### `contain` and `propagate`

- `contain` keeps failure and cancellation converging within the local boundary
- `propagate` continues failure upward through the ancestor chain

### cleanup

`defer(cleanup)` registers a cleanup ritual on the current process. The runtime triggers those cleanups after the process exits.

Multiple deferred cleanups run in registration order.

### Forced Failure

In addition to failures initiated by a process, the runtime can also force a scope directly into failure convergence. Forced failure:

- ends blocked processes within that scope
- converges any unfinished futures within that scope
- causes the scope to finish with the given failure

## Stepping

The minimal execution model is stepwise progression. Repeated interpretation of a runnable process may yield:

- `interpreted`
- `resonated`
- `ceded`
- `waiting`
- `exited`

`cede` means cooperative yielding. `waiting` means waiting on a future, channel operation, or another blocking condition.

The FIFO queue is the default minimal scheduling loop. More advanced schedulers build on top of these semantics.
