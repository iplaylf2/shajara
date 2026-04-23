# Host Adaptation

`@shajara/host` builds a generator-style host layer on top of `Executor` and the semantic baseline.

## Host Responsibilities

The host layer is responsible for three things:

- providing application-facing runtime entries: `run`, `createScope`, `action`, `sleep`, `until`
- providing generator-style primitives: `@shajara/host/primitives`
- mapping kernel failures into JavaScript error objects

## Ritual Adaptation

The host layer adapts kernel execution through two boundaries:

- `decodeRitual`: `RiteRoutine<T>` -> kernel `Ritual<T>`
- `encodeRitual`: kernel `Ritual<T>` -> `RiteCoroutine<T>`

The corresponding types are:

```ts
type RiteRoutine<T> = () => RiteCoroutine<T>;
type RiteCoroutine<T> = Generator<Sigil, T, unknown>;
```

In the host layer, `Ritual` means "how application code expresses the same computation as a generator".

## Result Model

The host layer adapts kernel result values into application-facing values and exceptions.

The host layer represents optional results as `Presence<T>`: `[true, value]` when a value is present and `[false]` when no value is present.

Typical rewrites include:

- kernel `wait(future)` returns `Either<FailureShape, T>`
- host `wait(future)` returns `T` and throws on failure

- kernel `lookup(key)` returns `Option<T>`
- host `lookup(key)` returns `Presence<T>`

- kernel `poll(future)` returns `Option<Either<FailureShape, T>>`
- host `poll(future)` returns `Presence<T>` and throws when the settled future holds a failure

- kernel `enclose(ritual)` returns `Either<FailureShape, T>`
- host `enclose(ritual)` returns `T` and throws on failure

- kernel `send(sender, value)` returns a terminal channel state when the channel is closed or revoked
- host `send(sender, value)` returns `void` and throws on closed or revoked channels

- kernel `receive(receiver)` returns a value or terminal channel state
- host `receive(receiver)` returns the value and throws on closed or revoked channels

- kernel `trySend(sender, value)` returns an optional channel send state
- host `trySend(sender, value)` returns `true` when the value is accepted, `false` when the channel is not ready, and throws on closed or revoked channels

- kernel `tryReceive(receiver)` returns an optional channel receive state
- host `tryReceive(receiver)` returns `Presence<T>` and throws on closed or revoked channels

As a result, `Future`, `Scope`, and `Failure` are exposed on the host side primarily as user-visible results.

## Error Mapping

The host layer maps kernel failures into JavaScript error objects.

### Writing into kernel

The following entries rewrite host-side errors into kernel failures:

- `halt(error)`
- `settleError(futureSettle, error)`
- `action.reject(error)`
- `until(...).catch(...)`

### Returning from kernel

The host layer uses `fromFailure(...)` for unified mapping:

- `canceled` -> `CanceledError`
- `channel` -> `ChannelError`
- `interrupted` -> `InterruptedError`
- `scope` -> `ScopeError`
- `external` -> the original `Error` or `ExternalError`

Here, `ScopeError` means the caller observes the structural fact that a scope converged as a failure with that cause.

The original cause lives at:

- `ScopeError.cause.failure`
- if that cause comes from an `external` failure, the original external value is in `raw`

## Runtime Entries

### `run`

`run` connects a host `ritual` to the long-lived `Executor` and exposes the resulting `LaunchHandle` as a Promise with `status`.

Result semantics:

- resolves with the result value on success
- rejects with `CanceledError` on cancellation
- rejects with `Error` on failure
- structural failures usually surface as `ScopeError`

### `createScope`

`createScope` derives a long-lived managed scope from the `Executor` root entry and exposes:

- `run(...)`
- `cancel()`
- `status`
- `closed`

The focus here is the host-side runtime boundary. Kernel scope internals remain in the semantic baseline.

Closing semantics:

- `cancel()` waits for the closure result of that scope
- `closed` settles when that scope has fully closed
- if the closure result is cancellation or failure, `cancel()` and `closed` reflect the same result

## Host Integration

### `action`

`action()` exposes a set of `future` convergence capabilities to host code:

- `future`
- `resolve(value)`
- `reject(error)`

### `sleep`

`sleep(milliseconds)` uses a host timer to resume a waiting computation.

### `until`

`until(thunk)` writes the result of a promise back into a future through fulfilled and rejected callbacks.

Together, these three entries translate browser or JavaScript host effects into future convergence the `Executor` can observe.

## Host Form of Autonomous Governance

The host form of `autonomy(entry, options)` reuses kernel `autonomy`, but adapts the `reaper` from the host side:

- the host `reaper` shape is `(scope) => RiteCoroutine<void>`
- returning normally means "keep waiting"
- throwing means "submit a failure adjudication rooted in that exception"
