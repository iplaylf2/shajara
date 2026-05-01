# Semantic Baseline

This document defines the kernel model.

## Computation

### `Wisp`

`Wisp<T>` is the primary computation carrier.

- `stirring`: carries a `sigil` and waits for the corresponding `echo` to continue
- `resting`: carries the final `relic`

The interpreter handles each `sigil`, produces an `echo`, and feeds that `echo` back into
`resonate` until the computation reaches `resting`.

### `Ritual`

`Ritual<T>` is `() => Wisp<T>`. It represents a deferred computation entry.

### `Sigil`

`Sigil` is an instruction object interpreted by the runtime. Each sigil declares the
shape of its `echo` through its own type witness.

The public sigil kinds are:

- context: `bind`, `lookup`, `unbind`
- control: `cede`
- termination and cleanup: `cancel`, `defer`, `halt`
- concurrency: `branch`, `spawn`
- future: `future`, `poll`, `settle`, `wait`
- channel: `channel`, `close`, `send`, `receive`, `trySend`, `tryReceive`
- introspection: `self`

## Runtime Identity

### `Scope`

`Scope` is the structured concurrency boundary. A scope owns:

- child scopes
- structural and detached processes
- context bindings
- futures created inside the scope
- channels created inside the scope
- its own convergence result through `exitFuture`

`ScopeRef<T>` is the control reference for a scope and carries `exitFuture`.

Each scope is created with a read-only `ScopeDescriptor`:

```ts
type ScopeDescriptor = Readonly<UnknownRecord>;
```

`ScopeDescriptor` carries scope metadata.

### `Process`

`Process` is the running instance of a `Wisp`. Each process belongs to exactly one scope.

`ProcessRef<T>` is the control reference for a process and carries `exitFuture`.

Each process is created with a read-only `ProcessDescriptor`:

```ts
type CompletionMode = "structural" | "detached";

interface ProcessDescriptor extends Readonly<UnknownRecord> {
  readonly completionMode: CompletionMode;
}
```

- `structural`: participates in the enclosing scope's completion condition
- `detached`: is excluded from that completion condition and is canceled when the scope
  starts closing

### `BranchHandle`

`branch(entry, descriptor?)` creates a child scope under the current scope and returns:

```ts
interface BranchHandle<T, Descriptor extends ScopeDescriptor = ScopeDescriptor> {
  readonly scope: ScopeRef<T, Descriptor>;
  readonly process: ProcessRef<T>;
}
```

The child scope is a normal child in the scope tree. Its result belongs to
`scope.exitFuture`; parent code observes it by waiting on that future or by using a
primitive that waits for it.

### `ScopedOutcome`

Some composed primitives return a scoped outcome:

```ts
type ScopedOutcome<T> = readonly [scope: ScopeRef<unknown>, outcome: FutureKey<T>];
```

The scope reference controls or observes the lifetime of the owned work. The outcome
future carries the result chosen by the primitive.

## Future, Context, and Channel

### `Future`

`FutureKey<T>` and `FutureSettleKey<T>` together identify a single convergence slot:

- `FutureKey<T>` is observation-only
- `FutureSettleKey<T>` is settlement-only

The result domain of a future is fixed to `Either<Failure, T>`. Therefore:

- `wait(future)` returns `Either<Failure, T>`
- `poll(future)` returns `Option<Either<Failure, T>>`
- the same future may be observed repeatedly by multiple waiters

When the owner scope closes, any unfinished futures owned by that scope converge as
`canceled`.

### `ContextKey`

`ContextKey<T>` is used for binding and lookup along the scope chain. Bindings are
recorded on the current scope, and lookups remain visible along the ancestor chain unless
a nearer binding shadows them.

### `Channel`

`channel<T, O>(capacity, overloadRewrite?)` creates a channel owned by the current scope
and returns a `ChannelHandle<T, O>`:

```ts
type ChannelHandle<T, O> = readonly [receiver: ChannelReceiver<T, O>, sender: ChannelSender<T, O>];
```

The `T` parameter is the value type. The `O` parameter is the explicit close outcome type.

The endpoints separate read and write authority:

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
default rewrite returns the existing buffer, preserving normal blocking behavior. If
`overloadRewrite` throws, the channel is revoked, the incoming value is not accepted, and
the owning scope enters the failure path with a `channel` failure.

Channel delivery is FIFO and single-delivery per value.

Send and receive operations each have blocking and non-blocking forms:

- `send(sender, value)` blocks until the value is accepted, then returns `{ kind: "sent" }`
- `trySend(sender, value)` never blocks; it returns `some({ kind: "sent" })`, `none`, or
  a terminal state wrapped in `some`
- `receive(receiver)` blocks until a value or terminal channel state is available
- `tryReceive(receiver)` never blocks; it returns `some({ kind: "value", value })`,
  `none`, or a terminal state wrapped in `some`

Terminal channel states are `{ kind: "closed", outcome }` and `{ kind: "revoked" }`.

`close(endpoint, outcome)` closes the channel explicitly. A scope that closes while it
still owns open channels revokes them. Closing and revocation both wake blocked senders
and receivers; close represents an explicit channel operation, while revoke represents
owner-scope disposal.

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
- `interrupted`: runtime progression was interrupted by an out-of-band failure
- `scope`: a scope converged through its local failure path

`ScopeFailure` carries:

- `cause`: the primary failure that drove the scope into failure convergence
- `suppressed`: additional failures captured while the scope was already failing

`halt(failure)` makes the current process exit as that failure and drives its enclosing
scope into the local failure path.

## Scope Convergence

### Observable Lifecycle

The externally observable lifecycle states of a scope are:

- `open`
- `closing`
- `closed`

Internally, `closing` covers normal completion, cancellation, and failure convergence.

### Normal Completion

A scope can begin normal closing when all structural processes and all child scopes have
closed. During normal closing, detached processes are canceled. Once the scope is idle, it
settles `exitFuture` with the entry process result.

### Cancellation

`cancel()` enters the current scope's cancellation path. Cancellation cancels structural
processes, detached processes, and child scopes owned by that scope. When the scope is
idle, it settles `exitFuture` with `canceled`.

Cancellation is scoped to owned work and cascades through child scopes.

### Failure

A scope enters its failure path after a process failure, a channel owner failure, or a
runtime control action. Failure cancels structural processes, detached processes, and
child scopes owned by that scope. When the scope is idle, it settles `exitFuture` with a
`ScopeFailure`.

A child-scope failure closes the child scope and settles the child's `exitFuture`. The
parent waits for child scope closure as part of structured concurrency, then continues
according to its own processes and wait operations.

### Recovery Routes

Recovery uses routes stored in scope context.

- `resumable(entry)` runs `entry` in a child scope and returns a `ScopedOutcome<T>`.
- If that child scope succeeds, the outcome future succeeds with the child result.
- If that child scope fails, the failure is sent to the current recovery route.
- `guard(entry, handler)` installs a recovery route for work inside its child scope.
- A recovery handler can return a handled result, return `none` to delegate to an
  ancestor route, or return a failure result.

Recovery routes are context bindings. A recovery request goes to the nearest route and
may continue to an ancestor route.

### Cleanup

`defer(cleanup)` registers a cleanup ritual on the current process. The runtime triggers
those cleanups after the process exits.

Multiple deferred cleanups run in registration order.

### Forced Failure

The runtime can force a scope directly into failure convergence. Forced failure affects
the target scope:

- it ends blocked processes within that scope
- it converges any unfinished futures owned by that scope when the scope closes
- it settles the target scope with a `ScopeFailure` caused by the given failure

## Stepping

The minimal execution model is stepwise progression. Repeated interpretation of a
runnable process may yield:

- `interpreted`
- `resonated`
- `ceded`
- `waiting`
- `exited`

`cede` means cooperative yielding. `waiting` means waiting on a future, channel operation,
or another blocking condition.

The FIFO queue is the default minimal scheduling loop. More advanced execution loops
build on top of these semantics.
