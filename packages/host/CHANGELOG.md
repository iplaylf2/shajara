# @shajara/host

## 0.8.0

### Minor Changes

- [#36](https://github.com/iplaylf2/shajara/pull/36) [`4632c43`](https://github.com/iplaylf2/shajara/commit/4632c43233e846a87f28d22276132da219da1af4) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Add TSDoc to the published API surfaces.

  The host and kernel packages now include caller-facing TSDoc across their public
  declarations. This improves generated `.d.ts` output and editor hints without
  changing runtime behavior.

### Patch Changes

- Updated dependencies [[`4632c43`](https://github.com/iplaylf2/shajara/commit/4632c43233e846a87f28d22276132da219da1af4)]:
  - @shajara/kernel@0.8.0

## 0.7.0

### Minor Changes

- [#34](https://github.com/iplaylf2/shajara/pull/34) [`0aed734`](https://github.com/iplaylf2/shajara/commit/0aed7346c02fe4632678c4c7fefccdfe05fe05da) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Expose scope exit errors to host recovery handlers.

  `guard(...)` recovery handlers now receive `ScopeExitError`, covering both
  `ScopeError` and `CanceledError`. This lets `resumable(...)` child cancellation
  recover through the same guard route as child-scope failure.

### Patch Changes

- Updated dependencies [[`0aed734`](https://github.com/iplaylf2/shajara/commit/0aed7346c02fe4632678c4c7fefccdfe05fe05da)]:
  - @shajara/kernel@0.7.0

## 0.6.0

### Minor Changes

- [#29](https://github.com/iplaylf2/shajara/pull/29) [`b8f17b2`](https://github.com/iplaylf2/shajara/commit/b8f17b2e7a78c86d492a879ebaeb3b555aff3601) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Rename `action` to `completer` and add `promisify`.

  `action()` is now `completer()`. Code that imports `action` or yields `action()` should
  update those references; the operation still models host-owned completion of a
  scope-bound future.

  The host package also exposes `promisify(future)` for observing a `RiteFuture<T>` as a
  native `Promise<T>`. The promise resolves with the future's value and rejects when the
  future fails or is canceled.

  Host operations that need executor services now use the current scope's executor
  context. Running those operations outside a launched host routine throws
  `OperationContextError`.

### Patch Changes

- Updated dependencies [[`b8f17b2`](https://github.com/iplaylf2/shajara/commit/b8f17b2e7a78c86d492a879ebaeb3b555aff3601)]:
  - @shajara/kernel@0.6.0

## 0.5.0

### Minor Changes

- [#27](https://github.com/iplaylf2/shajara/pull/27) [`5876ac5`](https://github.com/iplaylf2/shajara/commit/5876ac5d696f40e3757cd8a697aeb2c06a39ab5c) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Move `resource` to host operations and fix provider cleanup.

  `resource(...)` is now exported from the root `@shajara/host` entry with the
  other host operations, and is no longer exported from `@shajara/host/primitives`.
  Resource providers no longer keep their owning scope open after providing a
  value. They remain scope-owned for cleanup and are released during convergence
  of the owning scope.

  The host package also exposes `abortSignal()`, which returns an `AbortSignal`
  tied to the current scope. The signal aborts during that scope's convergence.

### Patch Changes

- Updated dependencies [[`5876ac5`](https://github.com/iplaylf2/shajara/commit/5876ac5d696f40e3757cd8a697aeb2c06a39ab5c)]:
  - @shajara/kernel@0.5.0

## 0.4.0

### Minor Changes

- [#24](https://github.com/iplaylf2/shajara/pull/24) [`6bea430`](https://github.com/iplaylf2/shajara/commit/6bea43011f61985f5ef5ea23b452324e24e1561d) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Adapt scoped outcomes into host control flow.

  The host package adapts the kernel's scoped outcomes into the generator API used
  by application code. `@shajara/host/primitives` now exposes `branch` instead of
  `enclose`; scoped primitives return host values directly from the scope or
  outcome future that determines their result. `branch`, `autonomy`, and `guard`
  wait for their child scopes, `race` waits for the race scope before returning
  the winning outcome, and `resumable` returns the recovery outcome.

  Because kernel child-scope failures are local to the child scope, the host layer
  keeps those failures on the exception path instead of returning future handles
  that application code has to remember to observe. `spawn`, `all`, and `resource`
  continue to expose future handles because they represent process activity in the
  current scope.

  Recovery handlers used with `guard` now return `Presence<unknown>`. Return
  `[true, value]` to handle a `resumable` failure, return `[false]` to delegate to
  an ancestor recovery route, or throw to fail the recovery request.
  `ScopeError.cause` now contains the direct underlying failure rather than a
  process or scope wrapper.

### Patch Changes

- Updated dependencies [[`6bea430`](https://github.com/iplaylf2/shajara/commit/6bea43011f61985f5ef5ea23b452324e24e1561d)]:
  - @shajara/kernel@0.4.0

## 0.3.0

### Minor Changes

- 08bfbdc: Narrow the host API to the generator surface used by application code.

  `@shajara/host/primitives` no longer exports `cancel`, `halt`, `defer`, or
  `park`. Host rituals now use ordinary JavaScript control flow for termination:
  throw `CanceledError` to cancel the current process and throw other errors to
  fail it. Cleanup that should remain attached to a scope should be modeled with
  `resource(...)`.

  This keeps the host package focused on the patterns that application code is
  expected to use directly, while leaving lower-level control primitives in
  `@shajara/kernel` for integrations that need them.

  The package also publishes `@shajara/host/boundary` for extension libraries. It
  exposes the same ritual adapters, failure mapping, `Either` unwrapping, and
  `Option` to `Presence<T>` conversion helpers that the built-in host primitives
  use internally.

### Patch Changes

- Updated dependencies [08bfbdc]
  - @shajara/kernel@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [0d455c0]
  - @shajara/kernel@0.2.1

## 0.2.0

### Minor Changes

- bd357f9: Align host callback bridges with channel control semantics.

  The host package now exposes `feed(capacity, overloadRewrite?)` for
  callback-driven inputs. It returns a receiver for coroutine code and host-side
  `trySend` and `close` callbacks that use the executor's external channel control
  path.

  Host channel primitives now follow the explicit close-outcome semantics. Closed
  or revoked channel conditions are preserved on `ChannelError.detail`, `action`
  callbacks remain safe to destructure before passing to callback APIs, and scope
  cancellation now reflects whether a ritual had started before cancellation won.

- 2f51241: Add channel primitives and `Presence<T>` results to the host API.

  The host package now exposes `channel`, `send`, `receive`, `trySend`,
  `tryReceive`, and `close` for channel-based communication. Closed or revoked
  channels now surface as `ChannelError`.

  Optional host results now use `Presence<T>` tuples. `lookup`, `poll`, and
  `tryReceive` return `[true, value]` when a value is present and `[false]` when
  no value is available.

### Patch Changes

- Updated dependencies [2f51241]
- Updated dependencies [bd357f9]
- Updated dependencies [0f7c29a]
  - @shajara/kernel@0.2.0

## 0.1.1

### Patch Changes

- da8f8bc: Align package publishing with the Yarn 4 monorepo workflow.

  This release switches package publication back to Yarn workspace publishing,
  so the published manifests are prepared through `yarn npm publish` with the
  same workspace-aware behavior used by the repository locally.

- Updated dependencies [da8f8bc]
  - @shajara/kernel@0.1.1

## 0.1.0

### Minor Changes

- 99e73f4: Prepare the first public release of `@shajara/kernel` and `@shajara/host`.

  This release publishes the initial package surfaces for the kernel runtime,
  structured concurrency primitives, and the host-layer operations API.

### Patch Changes

- Updated dependencies [99e73f4]
  - @shajara/kernel@0.1.0
