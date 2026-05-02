# Public Interface

This document summarizes public exports and observable call results.

## Published Packages

### `@shajara/host`

The root entry is intended for application code. It re-exports:

- `contracts`
- `entries`
- `errors`
- `operations`

Names available from the root entry include:

- host entries: `run`, `createScope`
- host operations: `abortSignal`, `action`, `feed`, `resource`, `sleep`, `until`
- error types: `ShajaraError`, `CanceledError`, `ChannelError`, `ExternalError`,
  `InterruptedError`, `ScopeError`
- host contracts: `RiteRoutine`, `RiteCoroutine`, `RiteFuture`, `RiteFutureSettle`,
  `RiteFutureHandle`, `Presence`
- re-exported kernel contracts: `ContextKey`, `Failure`, `FailureShape`, `FutureKey`,
  `LaunchStatus`, `ScopeRef`, `SelfHandle`, `contextKey`
- other root-level types: `Action`, `Feed`, `ResourceBody`, `ResourceProvide`, `Scope`,
  `ScopeStatus`, `RunOptions`, `StatefulPromise`, `PromiseThunk`, `Disposer`

The subpath `@shajara/host/primitives` exposes:

- concurrency and boundaries: `all`, `autonomy`, `branch`, `guard`, `race`, `resumable`,
  `spawn`
- future primitives: `future`, `poll`, `settle`, `settleError`, `wait`
- channel primitives: `channel`, `close`, `send`, `receive`, `trySend`, `tryReceive`
- context and introspection: `bind`, `lookup`, `self`, `unbind`
- control: `cede`

The subpath `@shajara/host/boundary` exposes host/kernel adapter helpers for extension
libraries:

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

- contracts: `Wisp`, `Ritual`, `ScopeRef`, `ProcessRef`, `ScopeDescriptor`,
  `ProcessDescriptor`, `CompletionMode`, `FutureKey`, `FutureSettleKey`, `FutureHandle`,
  `FutureResult`, `ContextKey`, `contextKey`
- failures: `Failure`, `FailureShape`, `canceledFailure`, `channelFailure`,
  `externalFailure`, `interruptedFailure`, `scopeFailure`
- executor: `createExecutor`, `Executor`, `BindTurn`, `LaunchHandle`, `LaunchResult`,
  `LaunchStatus`, `Pacer`, `Slice`, `ExecutionScopeRef`, `AutonomyOptions`, `Scheduler`,
  `Reaper`, `Processor`
- executor primitives: `autonomy`
- primitives: `Wisp` primitives for concurrency, futures, channels, context, control,
  termination, cleanup, parking, recovery, and introspection

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

The returned value is a Promise with a read-only `status`. The status can be
`open | closing | closed`.

Result:

- resolves with the result value on success
- rejects with `CanceledError` on cancellation
- rejects with `Error` on failure
- structural failures usually surface as `ScopeError`

### `createScope`

```ts
createScope(): Scope
```

The returned scope exposes:

- `run(ritual, options?)`
- `cancel()`
- `status`
- `closed`
- `[Symbol.asyncDispose]()`

Result semantics:

- `cancel()` requests cancellation and waits for the scope's convergence result
- `closed` settles with that same result once the scope reaches `closed`
- cancellation and failure settle as rejections with the corresponding error
- calling `run(...)` on a closed scope throws synchronously

## Host Operations

### `abortSignal`

```ts
yield * abortSignal();
```

Returns an `AbortSignal` tied to the current scope. The signal aborts when that scope
starts closing.

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
yield * feed<Value, Outcome>(capacity);
yield * feed<Value, Outcome>(capacity, overloadRewrite);
```

Returns:

- `receiver`
- `trySend(value)`
- `close(outcome)`

The receiver is consumed by coroutine channel primitives; the callbacks send or close the
channel from host code.

### `resource`

```ts
yield * resource<Value>(body);
```

Returns a `RiteFuture<Value>`. The body receives `provide(value)`, which settles the
returned future and keeps the provider attached to the owning scope until that scope
starts closing.

### `sleep`

```ts
yield * sleep(milliseconds);
```

### `until`

```ts
yield * until(thunk);
```

## Host Operation Return Values

| Operation     | Return value           |
| ------------- | ---------------------- |
| `abortSignal` | `AbortSignal`          |
| `action`      | `Action<Return>`       |
| `feed`        | `Feed<Value, Outcome>` |
| `resource`    | `RiteFuture<Value>`    |
| `sleep`       | `void`                 |
| `until`       | `Return`               |

## Host Primitive Return Values

A `Presence<T>` return value is `[true, value]` when a value is present and `[false]`
when no value is present.

### Concurrency, Scope, and Recovery

| Primitive   | Return value      |
| ----------- | ----------------- |
| `all`       | `RiteFuture<T[]>` |
| `autonomy`  | `T`               |
| `branch`    | `T`               |
| `guard`     | `T`               |
| `race`      | `T`               |
| `resumable` | `T`               |
| `spawn`     | `RiteFuture<T>`   |

### Future Primitives

| Primitive     | Return value                           |
| ------------- | -------------------------------------- |
| `future`      | `[RiteFuture<T>, RiteFutureSettle<T>]` |
| `poll`        | `Presence<T>`                          |
| `settle`      | `void`                                 |
| `settleError` | `void`                                 |
| `wait`        | `T`                                    |

### Channel Primitives

| Primitive    | Return value                                   |
| ------------ | ---------------------------------------------- |
| `channel`    | `[ChannelReceiver<T, O>, ChannelSender<T, O>]` |
| `send`       | `void`                                         |
| `receive`    | `T`                                            |
| `trySend`    | `boolean`                                      |
| `tryReceive` | `Presence<T>`                                  |
| `close`      | `void`                                         |

For channels, `T` is the value type and `O` is the close outcome type.

### Context, Introspection, and Control

| Primitive | Return value  |
| --------- | ------------- |
| `bind`    | `void`        |
| `lookup`  | `Presence<T>` |
| `unbind`  | `void`        |
| `self`    | `SelfHandle`  |
| `cede`    | `void`        |

Host rituals use JavaScript exceptions for current-process termination: throw a
`CanceledError` to cancel, or throw any other value to fail.

## Kernel Primitive Return Values

Kernel APIs preserve runtime state in returned values. Direct kernel callers handle
these values in band; host callers receive JavaScript values, exceptions, or
`Presence<T>` tuples.

### Concurrency, Scope, and Recovery

| Primitive   | Return value       |
| ----------- | ------------------ |
| `all`       | `FutureKey<T[]>`   |
| `autonomy`  | `BranchHandle<T>`  |
| `branch`    | `BranchHandle<T>`  |
| `guard`     | `BranchHandle<T>`  |
| `race`      | `ScopedOutcome<T>` |
| `resumable` | `ScopedOutcome<T>` |
| `spawn`     | `FutureKey<T>`     |

### Result Forms

The common kernel result forms are:

- `FutureKey<T>` for operations that start concurrent or scoped work and return an
  observation handle
- `[FutureKey<T>, FutureSettleKey<T>]` for operations that create a future and expose
  separate observation and settlement authority
- `Either<Failure, T>` for waits or outcome boundaries where success and failure are
  both part of the result domain
- `Option<T>` for non-blocking or optional observations, including context lookup and polling
- channel result unions for send and receive outcomes; closed and revoked channel states
  remain in band
- `BranchHandle<T>` for operations that expose a child scope and its entry process
- `ScopedOutcome<T>` for operations that expose owned scope lifetime separately from the
  chosen outcome future
- `void` for operations that mutate runtime state without producing an observation value
- `never` for termination or indefinite parking paths such as cancellation, halt, and park

Host-facing APIs adapt these forms into JavaScript values, `Presence<T>`, and exceptions.
