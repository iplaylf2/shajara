# Public Interface

This document summarizes the public export surfaces and call results.

## Published Packages

### `@shajara/host`

The root entry is intended for application code and re-exports:

- `contracts`
- `entries`
- `errors`
- `operations`

Names available from the root entry include:

- host entries: `run`, `createScope`
- host operations: `action`, `feed`, `sleep`, `until`
- error types: `ShajaraError`, `CanceledError`, `ChannelError`, `ExternalError`, `InterruptedError`, `ScopeError`
- host contracts: `RiteRoutine`, `RiteCoroutine`, `RiteFuture`, `RiteFutureSettle`, `RiteFutureHandle`, `Presence`
- re-exported kernel contracts: `ContextKey`, `Failure`, `FailureShape`, `FutureKey`, `LaunchStatus`, `ScopeRef`, `SelfHandle`, `contextKey`
- other root-level types: `Action`, `Feed`, `Scope`, `ScopeStatus`, `RunOptions`, `StatefulPromise`, `PromiseThunk`, `Disposer`

The subpath `@shajara/host/primitives` exposes:

- concurrency and boundaries: `all`, `autonomy`, `enclose`, `guard`, `race`, `resource`, `resumable`, `spawn`
- future operations: `future`, `poll`, `settle`, `settleError`, `wait`
- channel operations: `channel`, `close`, `send`, `receive`, `trySend`, `tryReceive`
- context and introspection: `bind`, `lookup`, `self`, `unbind`
- control: `cede`

The subpath `@shajara/host/boundary` exposes host/kernel adapter helpers for extension libraries:

- ritual adapters: `decodeRitual`, `decodeRituals`, `encodeRitual`, `RiteRoutineTuple`
- failure mapping: `toFailure`, `toFailureUnknown`, `fromFailure`
- result adapters: `unwrapEither`, `unwrapOption`

### `@shajara/kernel`

This package is intended for lower-level integrations. Its root entry re-exports:

- `contracts`
- `executor`
- `executor/primitives`
- `failures`
- `primitives`

Names available from the root entry include:

- contracts: `Wisp`, `Ritual`, `ScopeRef`, `ProcessRef`, `FutureKey`, `FutureSettleKey`, `FutureHandle`, `ContextKey`, `contextKey`
- failures: `Failure`, `canceledFailure`, `channelFailure`, `externalFailure`, `interruptedFailure`, `scopeFailure`
- executor: `createExecutor`, `Executor`, `BindTurn`, `LaunchHandle`, `LaunchResult`, `LaunchStatus`, `Pacer`, `Slice`, `ExecutionScopeRef`, `AutonomyOptions`, `Scheduler`, `Reaper`, `Processor`
- executor primitives: `autonomy`
- primitives: `Wisp` primitives for concurrency, futures, channels, context, control, termination, cleanup, parking, and introspection

Public subpaths:

- `@shajara/kernel/sigils`
- `@shajara/kernel/utils`

The `@shajara/kernel/sigils` subpath exposes lower-level sigil constructors:

- context: `bind`, `lookup`, `unbind`
- control: `cede`
- termination and cleanup: `cancel`, `defer`, `halt`
- concurrency: `branch`, `spawn`
- future: `future`, `poll`, `settle`, `wait`
- channel: `channel`, `close`, `send`, `receive`, `trySend`, `tryReceive`
- introspection: `self`

## Host Entries

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

### `feed`

```ts
yield * feed<Value, Outcome>(capacity, overloadRewrite?);
```

Returns:

- `receiver`
- `trySend(value)`
- `close(outcome)`

The receiver is consumed by coroutine channel primitives; the callbacks send or close the channel from host code.

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

| Primitive    | Return value                                   |
| ------------ | ---------------------------------------------- |
| `channel`    | `[ChannelReceiver<T, O>, ChannelSender<T, O>]` |
| `send`       | `void`                                         |
| `receive`    | `T`                                            |
| `trySend`    | `boolean`                                      |
| `tryReceive` | `Presence<T>`                                  |
| `close`      | `void`                                         |

For channels, `T` is the value type and `O` is the close outcome type.

### Context, introspection, and control

| Primitive | Return value  |
| --------- | ------------- |
| `bind`    | `void`        |
| `lookup`  | `Presence<T>` |
| `unbind`  | `void`        |
| `self`    | `SelfHandle`  |
| `cede`    | `void`        |

Host rituals use JavaScript exceptions for current-process termination:
throw a `CanceledError` to cancel, or throw any other value to fail.

## Kernel Result Model

Kernel APIs preserve runtime state in returned values. Callers that consume kernel directly handle these values in band instead of relying on host exceptions or `Presence<T>` tuples.

The common return forms are:

- `FutureKey<T>` for operations that start concurrent or scoped work and return an observation handle.
- `[FutureKey<T>, FutureSettleKey<T>]` for operations that create a future and expose separate observation and settlement authority.
- `Either<Failure, T>` for waits or contained boundaries whose success and failure are both part of the result domain.
- `Option<T>` for non-blocking or optional observations, including context lookup and polling.
- channel result unions for send and receive outcomes; closed and revoked channel states remain explicit values.
- `void` for operations that mutate runtime state without producing an observation value.
- `never` for termination or indefinite parking paths such as cancellation, halt, and park.

Host primitives adapt these forms into JavaScript values, `Presence<T>`, and exceptions.
