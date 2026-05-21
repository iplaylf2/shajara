# Host Adaptation

`@shajara/host` adapts the kernel executor and semantic model into an
application-facing routine API. Application routines are written as JavaScript generator
functions and use `yield*` to call shajara operations and primitives.

## Host Responsibilities

The host layer has four responsibilities:

- application-facing entries: `run`, `createScope`
- host operations: `abortSignal`, `completer`, `feed`, `promisify`, `resource`,
  `sleep`, `until`
- host primitives from `@shajara/host/primitives` for routine code
- mapping between kernel in-band values and host-facing JavaScript values or thrown errors

## Ritual Adaptation

The host layer adapts computation between application routines and kernel `Ritual`s
through two boundaries:

- `decodeRitual`: `RiteRoutine<T>` -> kernel `Ritual<T>`
- `encodeRitual`: kernel `Ritual<T>` -> `RiteCoroutine<T>`

The corresponding host types are:

```ts
type RiteRoutine<T> = () => RiteCoroutine<T>;
type RiteCoroutine<T> = Generator<Sigil, T, unknown>;
```

`RiteRoutine<T>` is the runnable routine shape accepted by host entries and primitives.
Application code normally supplies that shape with a JavaScript `function*`.
`RiteCoroutine<T>` is the generator object produced when the routine is called.

When a started `RiteCoroutine` is unwound, JavaScript generator control flow continues
through `try...finally`. The host `resource(...)` operation uses that same cleanup model
for provider work that remains attached to its owning scope until release.

## Result Model

The kernel keeps failure and absence in band. The host layer presents those outcomes as
JavaScript values, `Presence<T>`, and thrown errors.

Host optional results use `Presence<T>`:

- `[true, value]`: a value is present
- `[false]`: no value is present

Typical rewrites:

- `wait(future)`: kernel returns `Either<Failure, T>`; host returns `T` and throws on
  failure.
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

- `branch(entry)` waits for the child scope's `exitFuture` and returns the child value
- `autonomy(entry, options)` waits for the autonomous child scope and returns its value
- `guard(entry, recover)` waits for the guarded child scope and returns its value
- `race(entries)` waits for the race scope, then returns the winning value
- `resumable(entry)` waits for the recovery outcome future and returns that value

Host APIs that expose independently observed results keep future handles:

- host primitives `all(entries)` and `spawn(entry)` return `RiteFuture`s
- host operation `completer()` returns a `RiteFuture` with completion callbacks
- host operation `resource(body)` returns a `RiteFuture` for the provided value

## Error Mapping

The host layer maps errors thrown by application code into kernel failures at the
`Ritual` boundary and maps kernel failures back into thrown errors at host-facing
observation points.

### Writing into Kernel

The following paths convert JavaScript failures into kernel failures:

- throwing from a routine, recovery handler, operation, or integration callback
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

`ScopeError` means the caller observes that a scope converged as a failure. The primary
cause is available through `ScopeError.cause`. `CanceledError` and `ScopeError` together
form `ScopeExitError`, the host error surface for scope exit failures.

If that cause comes from an `external` failure, the original external value is in
`ScopeError.cause.raw`.

## Recovery

Host recovery is built on the kernel `guard` and `resumable` primitives.

`resumable(entry)` runs `entry` as scoped work and waits for the recovery outcome.
`guard(entry, recover)` installs a recovery point for resumable work inside the guarded
entry.

Host recovery receives a child scope exit failure after host error mapping, so the
handler shape is:

```ts
type RecoveryHandler = (error: ScopeExitError) => RiteCoroutine<Presence<unknown>>;
```

- return `[true, value]` to handle the recovery request with `value`
- return `[false]` to delegate the request to an ancestor recovery route
- throw to complete the recovery request with that thrown failure

The executor root provides a final recovery anchor. Installing `guard` creates a
deliberate recovery boundary for routine code.

## Host Entries

Host entries start work from the executor root and expose host-facing promises for
observing launched work or managed scope convergence.

### `run`

`run` connects a routine to the long-lived executor and exposes the resulting launch as a
Promise with `status`. An optional abort signal converges that launched work according to
its abort reason.

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

`run(...)` starts work owned by the managed scope and returns the direct observation
Promise for that work. The launched work follows the same result mapping as `run(...)`.
A non-cancellation failure from that work also settles the managed scope; cancellation
remains local unless the managed scope is canceled.

Calling `cancel()` requests cancellation and waits until the scope reaches `closed`.
Expected cancellation resolves the `cancel()` Promise; non-cancellation close failures
reject through the corresponding host error mapping. `closed` remains the direct
observation point for scope convergence, so cancellation and failure settle there as
rejections through the same mapping.

## Host Operations

Host operations are routine helpers. They run inside routines and translate browser APIs,
promises, callbacks, and other application effects into future, channel, or process
convergence visible to the executor. Operations that need executor services read the
current executor from scope context; if that context is missing, they throw
`OperationContextError`.

### `abortSignal`

`abortSignal()` returns an `AbortSignal` tied to the current scope. The signal stays open
with the scope, aborts during scope convergence, and carries the corresponding error as
`AbortSignal.reason` when the scope is canceled or fails. It does not provide a way to
cancel the scope from application code.

### `completer`

`completer()` exposes a `RiteFuture` with completion callbacks:

- `future`
- `resolve(value)`
- `reject(error)`

If still pending, the future is canceled when the current scope converges.

### `feed`

`feed(capacity, overloadRewrite?)` exposes channel input capabilities to application code:

- `receiver`
- `trySend(value)`
- `close(outcome)`

The returned receiver stays inside routine code, while the callbacks send or close the
channel from application code.

### `promisify`

`promisify(future)` exposes a `RiteFuture` as a `Promise`. The promise resolves with the
future's value and rejects when the future fails or is canceled.

### `resource`

`resource(body)` models provider work that publishes a ready value and then stays owned by
the current scope until release. The operation returns a future for the provided value.

The body receives `provide(value)`. Calling `provide` settles the returned future and
then parks the provider process. During convergence of that scope, the provider routine
is unwound, so `try...finally` cleanup in the provider body runs on the same scope
lifecycle.

### `sleep`

`sleep(milliseconds)` uses a timer to resume a waiting computation.

### `until`

`until(thunk)` writes the result of a promise back into a future through fulfilled and
rejected callbacks.

## Host Form of Autonomy

The host form of `autonomy(entry, options)` reuses kernel `autonomy`. Scheduler options
use the executor behavior described in `executor.md`, including cancellation when
scheduler assignment throws.

The `reaper` option is adapted into the host routine model:

- `(scope) => RiteCoroutine<void>` is the host reaper shape
- returning normally means "keep waiting"
- throwing means "submit a failure adjudication rooted in that exception"
