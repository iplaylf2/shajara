# Public Interface

This document summarizes the public export surfaces and call results.

## Published Packages

### `@shajara/host`

This package is intended for application code. Its root entry re-exports:

- `contracts`
- `errors`
- `operations`

Names available from the root entry include:

- runtime entries: `run`, `createScope`
- host operations: `action`, `sleep`, `until`
- error types: `ShajaraError`, `CanceledError`, `ChannelError`, `ExternalError`, `InterruptedError`, `ScopeError`
- host contracts: `RiteRoutine`, `RiteCoroutine`, `RiteFuture`, `RiteFutureSettle`, `RiteFutureHandle`, `Presence`
- re-exported kernel contracts: `ContextKey`, `Failure`, `FailureShape`, `FutureKey`, `LaunchStatus`, `ScopeRef`, `SelfHandle`, `contextKey`
- other root-level types: `Action`, `Scope`, `ScopeStatus`, `RunOptions`, `StatefulPromise`, `PromiseThunk`, `Disposer`

The subpath `@shajara/host/primitives` exposes:

- concurrency and boundaries: `all`, `autonomy`, `enclose`, `guard`, `race`, `resource`, `resumable`, `spawn`
- future operations: `future`, `poll`, `settle`, `settleError`, `wait`
- channel operations: `channel`, `close`, `send`, `receive`, `trySend`, `tryReceive`
- context and introspection: `bind`, `lookup`, `self`, `unbind`
- control and lifecycle: `cancel`, `cede`, `defer`, `halt`, `park`

### `@shajara/kernel`

This package is intended for lower-level integrations. Its root entry re-exports:

- `contracts`
- `executor`
- `failures`
- `primitives`

Names available from the root entry include:

- contracts: `Wisp`, `Ritual`, `ScopeRef`, `ProcessRef`, `FutureKey`, `FutureSettleKey`, `FutureHandle`, `ContextKey`, `contextKey`
- failures: `Failure`, `canceledFailure`, `channelFailure`, `externalFailure`, `interruptedFailure`, `scopeFailure`
- executor: `createExecutor`, `Executor`, `LaunchHandle`, `LaunchResult`, `LaunchStatus`, `Pacer`, `Slice`, `ExecutionScopeRef`, autonomy-related types
- primitives: `Wisp` primitives for concurrency, futures, channels, context, lifecycle, and introspection

Public subpaths:

- `@shajara/kernel/sigils`
- `@shajara/kernel/utils`

The `@shajara/kernel/sigils` subpath exposes lower-level sigil constructors:

- context: `bind`, `lookup`, `unbind`
- lifecycle: `cancel`, `cede`, `defer`, `halt`
- concurrency: `branch`, `spawn`
- future: `future`, `poll`, `settle`, `wait`
- channel: `channel`, `close`, `send`, `receive`, `trySend`, `tryReceive`
- introspection: `self`

## Host Runtime Entries

### `run`

```ts
run<Return>(
  ritual: RiteRoutine<Return>,
  options?: { signal?: AbortSignal },
): StatefulPromise<Return>
```

Return value:

- it is a Promise
- it also carries a read-only `status`
- `status` can be `open | closing | closed`

Result:

- resolves with the result value on success
- rejects with `CanceledError` on cancellation
- rejects with `Error` on failure
- structural failures usually surface as `ScopeError`

### `createScope`

```ts
createScope(): Scope
```

The returned object exposes:

- `run(ritual, options?)`
- `cancel()`
- `status`
- `closed`
- `[Symbol.asyncDispose]()`

Result semantics:

- `cancel()` waits for the scope's closure result
- `closed` represents that same closure result
- if the scope ends in cancellation or failure, `cancel()` and `closed` reject with the corresponding error
- calling `run(...)` on a closed scope throws synchronously

## Host Operations

### `action`

```ts
yield * action<Return>();
```

Returns:

- `future`
- `resolve(value)`
- `reject(error)`

### `sleep`

```ts
yield * sleep(milliseconds);
```

### `until`

```ts
yield * until(thunk);
```

## Host Primitive Return Values

A `Presence<T>` return value is `[true, value]` when a value is present and `[false]` when no value is present.

### Concurrency and boundaries

| Primitive   | Return value       |
| ----------- | ------------------ |
| `spawn`     | `RiteFuture<T>`    |
| `all`       | `RiteFuture<T[]>`  |
| `race`      | `RiteFuture<T>`    |
| `enclose`   | `T`                |
| `resumable` | `RiteFuture<T>`    |
| `guard`     | `RiteFuture<void>` |
| `resource`  | `RiteFuture<T>`    |
| `autonomy`  | `RiteFuture<T>`    |

### `future` primitives

| Primitive     | Return value                           |
| ------------- | -------------------------------------- |
| `future`      | `[RiteFuture<T>, RiteFutureSettle<T>]` |
| `poll`        | `Presence<T>`                          |
| `settle`      | `void`                                 |
| `settleError` | `void`                                 |
| `wait`        | `T`                                    |

### Channel primitives

| Primitive    | Return value                             |
| ------------ | ---------------------------------------- |
| `channel`    | `[ChannelReceiver<T>, ChannelSender<T>]` |
| `send`       | `void`                                   |
| `receive`    | `T`                                      |
| `trySend`    | `boolean`                                |
| `tryReceive` | `Presence<T>`                            |
| `close`      | `void`                                   |

### Context, control, and lifecycle

| Primitive | Return value  |
| --------- | ------------- |
| `bind`    | `void`        |
| `lookup`  | `Presence<T>` |
| `unbind`  | `void`        |
| `self`    | `SelfHandle`  |
| `halt`    | `never`       |
| `cancel`  | `never`       |
| `cede`    | `void`        |
| `defer`   | `void`        |
| `park`    | `never`       |

## Kernel Primitive Result Model

Kernel primitives keep failure and terminal states in explicit return values:

- kernel `wait(future)` returns `Either<FailureShape, T>`
- kernel `poll(future)` returns `Option<Either<FailureShape, T>>`
- kernel `enclose(ritual)` returns `Either<FailureShape, T>`
- kernel `channel(capacity, overloadRewrite?)` returns `[ChannelReceiver<T>, ChannelSender<T>]`
- kernel `send(sender, value)` returns `{ kind: "sent" | "closed" | "revoked" }`
- kernel `receive(receiver)` returns `{ kind: "value"; value: T }`, `{ kind: "closed" }`, or `{ kind: "revoked" }`
- kernel `trySend(sender, value)` returns `Option<{ kind: "sent" | "closed" | "revoked" }>`
- kernel `tryReceive(receiver)` returns `Option<{ kind: "value"; value: T } | { kind: "closed" } | { kind: "revoked" }>`
- kernel `close(endpoint)` returns `void`

When consuming kernel directly, callers handle those values in band.
