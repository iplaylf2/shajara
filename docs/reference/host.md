# Host Adaptation

`@shajara/host` adapts the kernel executor and semantic model into generator-style
JavaScript APIs.

## Host Responsibilities

The host layer has four responsibilities:

- application-facing entries: `run`, `createScope`
- host operations: `abortSignal`, `completer`, `promiser`, `feed`, `resource`,
  `sleep`, `until`
- generator-style primitives from `@shajara/host/primitives`
- mapping between kernel in-band values and JavaScript values or errors

## Ritual Adaptation

The host layer adapts computation through two boundaries:

- `decodeRitual`: `RiteRoutine<T>` -> kernel `Ritual<T>`
- `encodeRitual`: kernel `Ritual<T>` -> `RiteCoroutine<T>`

The corresponding host types are:

```ts
type RiteRoutine<T> = () => RiteCoroutine<T>;
type RiteCoroutine<T> = Generator<Sigil, T, unknown>;
```

In the host layer, `Ritual` means the generator form of the same computation.

When a started coroutine is unwound, generator control flow continues through
`try...finally`. The host `resource(...)` operation uses that same generator cleanup
model for provider work that remains attached to its owning scope until release.

## Result Model

The kernel keeps failure and absence in band. The host layer adapts those values into
application-facing values, `Presence<T>`, and JavaScript errors.

Host optional results use `Presence<T>`:

- `[true, value]`: a value is present
- `[false]`: no value is present

Typical rewrites:

- `wait(future)`: kernel returns `Either<Failure, T>`; host returns `T` and throws on failure.
- `lookup(key)`: kernel returns `Option<T>`; host returns `Presence<T>`.
- `poll(future)`: kernel returns `Option<Either<Failure, T>>`; host returns
  `Presence<T>` and throws when the settled future failed.
- `send(sender, value)`: kernel returns a send result; host returns `void` and throws on
  closed or revoked channels.
- `receive(receiver)`: kernel returns a receive result; host returns `T` and throws on
  closed or revoked channels.
- `trySend(sender, value)`: kernel returns an optional send result; host returns
  `boolean` and throws on terminal channels.
- `tryReceive(receiver)`: kernel returns an optional receive result; host returns
  `Presence<T>` and throws on terminal channels.

Scoped host primitives adapt kernel handles into host-facing values:

- host `branch(entry)` waits for the child scope's `exitFuture` and returns the child value
- host `autonomy(entry, options)` waits for the autonomous child scope and returns its value
- host `guard(entry, recover)` waits for the guarded child scope and returns its value
- host `race(entries)` waits for the race scope, then returns the winning value
- host `resumable(entry)` waits for the recovery outcome future and returns that value

Host APIs that expose independently observed results keep future handles:

- host primitives `all(entries)` and `spawn(entry)` return host futures
- host operation `completer()` returns a host future with completion callbacks
- host operation `resource(body)` returns a host future for the provided value

## Error Mapping

The host layer maps kernel failures into JavaScript error objects.

### Writing into Kernel

The following paths write host-side failures into the kernel:

- throwing from a host ritual, recovery handler, or host integration callback
- `settleError(futureSettle, error)`
- `completer.reject(error)`
- a promise rejection observed by `until(thunk)`

At the ritual boundary, `CanceledError` becomes the kernel `cancel` primitive. Other
thrown values become the kernel `halt` primitive after failure mapping.

### Returning from Kernel

The host layer uses `fromFailure(...)` for unified mapping:

- `canceled` -> `CanceledError`
- `channel` -> `ChannelError`
- `interrupted` -> `InterruptedError`
- `scope` -> `ScopeError`
- `external` -> the original `Error` or `ExternalError`

Separately, host channel primitives throw `ChannelError` when a kernel channel operation
returns a closed or revoked terminal state. In that case, `ChannelError.detail` is
`{ kind: "condition", condition }` and `cause` is `null`. Kernel channel failures use
`{ kind: "cause", cause }`.

`ScopeError` means the caller observes that a scope converged as a failure. The primary
cause is available through `ScopeError.cause`.

If that cause comes from an `external` failure, the original external value is in
`ScopeError.cause.raw`.

## Recovery

Host recovery is built on the kernel `guard` and `resumable` primitives.

`resumable(entry)` runs `entry` as scoped work and waits for the recovery outcome.
`guard(entry, recover)` installs a recovery point for resumable work inside the guarded
entry.

The host recovery handler shape is:

```ts
type RecoveryHandler = (error: ScopeError) => RiteCoroutine<Presence<unknown>>;
```

- return `[true, value]` to handle the recovery request with `value`
- return `[false]` to delegate the request to an ancestor recovery route
- throw to complete the recovery request with that thrown failure

The executor root provides a final recovery anchor. Installing `guard` creates a
deliberate recovery boundary for host code.

## Host Entries

### `run`

`run` connects a host ritual to the long-lived executor and exposes the resulting launch
as a Promise with `status`.

Result semantics:

- resolves with the result value on success
- rejects with `CanceledError` on cancellation
- rejects with `Error` on failure
- structural failures usually surface as `ScopeError`

### `createScope`

`createScope` creates a long-lived managed scope from the executor root entry and exposes:

- `run(...)`
- `cancel()`
- `status`
- `closed`

Convergence semantics:

- `cancel()` requests cancellation and waits for the scope's convergence result
- `closed` settles with that same result once the scope reaches `closed`
- cancellation and failure settle as rejections through the corresponding host error mapping

## Host Operations

### `abortSignal`

`abortSignal()` returns an `AbortSignal` tied to the current scope. The signal is not
aborted while the scope is open; it aborts during that scope's convergence.
It does not provide a way to cancel the scope from host code.

### `completer`

`completer()` exposes a host future with completion callbacks:

- `future`
- `resolve(value)`
- `reject(error)`

If still pending, the future is canceled when the current scope converges.

### `promiser`

`promiser()` exposes a JavaScript promise with completion callbacks:

- `promise`
- `resolve(value)`
- `reject(reason)`

If still pending, the promise rejects with `CanceledError` when the current scope
converges.

### `feed`

`feed(capacity, overloadRewrite?)` exposes channel input capabilities to host code:

- `receiver`
- `trySend(value)`
- `close(outcome)`

The returned receiver stays inside coroutine code, while the callbacks send or close the
channel from host code.

### `resource`

`resource(body)` models provider work that publishes a ready value and then stays owned by
the current scope until release. The operation returns a future for the provided value.

The body receives `provide(value)`. Calling `provide` settles the returned future and
then parks the provider process. During convergence of that scope, the provider is
released through normal generator unwinding, so `try...finally` cleanup in the provider
body runs on the same scope lifecycle.

### `sleep`

`sleep(milliseconds)` uses a host timer to resume a waiting computation.

### `until`

`until(thunk)` writes the result of a promise back into a future through fulfilled and
rejected callbacks.

Together, these operations translate browser or JavaScript host effects and host-owned
lifecycle patterns into future, channel, or process convergence visible to the executor.

## Host Form of Autonomy

The host form of `autonomy(entry, options)` reuses kernel `autonomy`. Scheduler options
use the executor behavior described in `executor.md`, including cancellation when
scheduler assignment throws.

The `reaper` option is adapted into a host coroutine shape:

- `(scope) => RiteCoroutine<void>` is the host reaper shape
- returning normally means "keep waiting"
- throwing means "submit a failure adjudication rooted in that exception"
