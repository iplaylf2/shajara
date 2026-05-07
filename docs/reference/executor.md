# Execution Environment

The execution environment drives the semantic model from a long-lived root scope. This
document covers execution ownership, future observation, and external control; scope and
failure semantics remain in the semantic baseline.

## Executor

`Executor` is a long-lived execution environment object. It provides:

- a stable root execution entry
- the ability to launch new entry rituals under registered execution scopes
- external observation of future settlement
- external control for future settlement, channel operations, and entry cancellation
- scheduler and reaper governance through autonomy

Creation:

```ts
const executor = createExecutor(bindTurn);
```

## Execution Entries

The executor introduces `ExecutionScopeRef` on top of `ScopeRef`.

An `ExecutionScopeRef` is a scope reference that has been registered as an execution
entry and can be used as an external control target. The executor itself exposes one
long-lived root entry:

- `executor.scope`

Subsequent launches begin from an `ExecutionScopeRef`.

## Core Interface

```ts
interface Executor extends LaunchHandle<never> {
  launch<Result>(
    scope: ExecutionScopeRef<unknown>,
    ritual: Ritual<Result>,
  ): Option<LaunchHandle<Result>>;

  onSettled<Result>(
    future: FutureKey<Result>,
    listener: (result: FutureResult<Result>) => void,
  ): Disposer;

  settle<Result>(futureSettle: FutureSettleKey<Result>, result: FutureResult<Result>): boolean;

  trySend<Value, Outcome>(
    sender: ChannelSender<Value, Outcome>,
    value: Value,
  ): Option<SendResult<Outcome>>;

  close<Outcome>(endpoint: ChannelEndpoint<unknown, Outcome>, outcome: Outcome): void;

  cancel(scope: ExecutionScopeRef<unknown>): void;
}
```

`launch(scope, ritual)` branches a new child scope under a registered open execution
scope and returns a `LaunchHandle` for that child. If the target scope is invalid or
closed, it returns `none`.

Each launched entry uses the normal branch semantics from `semantics.md`. The launched
scope has the default scope descriptor `{}`. `LaunchHandle.scope` refers to that
launched child scope.

## Entry Handle

`LaunchHandle<Result>` is the entry handle exposed by the executor:

```ts
interface LaunchHandle<Result> {
  readonly scope: ExecutionScopeRef<Result>;
  readonly status: "open" | "closing" | "closed";
}
```

It identifies:

- the `ExecutionScopeRef` created for the launch
- the current lifecycle state of the entry

The executor itself is also the `LaunchHandle` view of the root scope, so it exposes the
same entry identity and lifecycle state.

## Future Observation

`onSettled(future, listener)` subscribes external code to a future's settlement:

- if the future is already settled, the listener is called synchronously and the returned
  disposer is a no-op
- if the future is pending, the listener is called once when the future settles
- disposing the returned subscription before settlement removes that listener

The listener receives the future's native `FutureResult<Result>`:

- `right(value)` for success
- `left(failure)` for failure or cancellation

A launched child scope owns its convergence result through its `exitFuture`. External
code observes that result by passing the launched scope's `exitFuture` to
`onSettled(...)`.

## External Control

### Future Settlement

`settle(futureSettle, result)` writes a result into a running `future` from outside the
execution environment.

- returns `true`: the injection was accepted
- returns `false`: the `future` already converged, or the environment rejects the injection

### Channel Operations

`trySend(sender, value)` attempts a non-blocking channel send from outside the execution
environment.

- returns `some({ kind: "sent" })`: the value was accepted
- returns `none`: the channel cannot accept the value without blocking
- returns `some({ kind: "closed", outcome })` or `some({ kind: "revoked" })`: the channel
  is terminal

`close(endpoint, outcome)` closes a channel from outside the execution environment.
Blocked senders and receivers resume with `{ kind: "closed", outcome }`.

### Scope Cancellation

`cancel(scope)` requests cancellation for an execution-entry scope from outside the
execution environment.

If the scope is invalid, unregistered, or closed, the request is ignored.

## Recovery Anchor

The executor root runs with a recovery anchor. Recovery requests that reach the root are
resolved through this final route.

## Slice Progression

`Executor` is created through `BindTurn`, then collaborates with the embedding
environment through the returned `Pacer`:

```ts
type BindTurn = (flushTurn: () => void) => Pacer;
```

`flushTurn` is the callback the embedding environment polls on its own turn cadence.

The returned `Pacer` handles slice progression and deferred follow-up work:

```ts
interface Pacer {
  beginSlice(): Slice;
  continueLater(work: () => void): Disposer;
}

interface Slice {
  shouldYield(): boolean;
}
```

- `beginSlice()` starts a new synchronous slice
- `shouldYield()` decides whether the current slice should yield
- `continueLater(work)` posts subsequent work back to the embedding environment

## Autonomy

`autonomy` adds governance capabilities to selected scopes within the executor. Scope
semantics still come from the semantic baseline; autonomy controls scheduling ownership
and adjudication for closing scopes.

### `scheduler`

```ts
interface Scheduler {
  assign(process: ProcessRef<unknown>): Processor;
}
```

The scheduler owns runnable-process placement for the autonomous scope. When a process
becomes runnable, the executor passes its `ProcessRef` to `scheduler.assign(process)` and
routes the process to the returned `Processor`. If `assign` throws, the executor requests
cancellation for that process's owning scope.

### `reaper`

```ts
interface Reaper {
  adjudicate(scope: ScopeRef<unknown>): Wisp<Option<Failure>>;
}
```

When natural convergence stalls for a closing scope, the executor can submit that scope
to a `reaper` for adjudication:

- return `none`: keep waiting for natural convergence
- return `some(failure)`: initiate local failure convergence for the target scope with
  that failure

The reaper makes governance decisions for the adjudicated scope.
