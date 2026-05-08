# @shajara/kernel

## 0.6.0

### Minor Changes

- [#29](https://github.com/iplaylf2/shajara/pull/29) [`b8f17b2`](https://github.com/iplaylf2/shajara/commit/b8f17b2e7a78c86d492a879ebaeb3b555aff3601) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Move executor settlement observation to futures.

  `LaunchHandle` no longer owns settlement listeners. Direct executor users should observe
  a launched entry by passing `handle.scope.exitFuture` to `executor.onSettled(...)`,
  which reports the future's native `FutureResult`. The `LaunchResult` wrapper has been
  removed.

  The executor also exposes `currentExecutorKey` for integrations that need to look up the
  active executor from scope context. Scope cancellation and failure now drain owned work in
  scope order: child scopes first, structural processes next, and detached processes last.
  Custom scheduler assignment failures cancel the owning scope.

## 0.5.0

### Minor Changes

- [#27](https://github.com/iplaylf2/shajara/pull/27) [`5876ac5`](https://github.com/iplaylf2/shajara/commit/5876ac5d696f40e3757cd8a697aeb2c06a39ab5c) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Refine kernel ownership boundaries.

  `resource(...)` did not add a separate kernel semantic beyond composing existing
  primitives, so the kernel package no longer publishes it. Scope cancellation and failure
  now cancel child scopes before local processes during convergence.

## 0.4.0

### Minor Changes

- [#24](https://github.com/iplaylf2/shajara/pull/24) [`6bea430`](https://github.com/iplaylf2/shajara/commit/6bea43011f61985f5ef5ea23b452324e24e1561d) Thanks [@iplaylf2](https://github.com/iplaylf2)! - Separate scoped work from process work in kernel primitives.

  The kernel package now makes ownership explicit in its low-level primitive
  contracts. Primitives that create child scopes return values that expose those
  scopes: `branch`, `guard`, and `autonomy` return `BranchHandle`, while `race`
  and `resumable` return `ScopedOutcome`. This lets integrations observe scope
  lifetime separately from the selected outcome future.

  Process-level primitives still keep lightweight future handles. `spawn`, `all`,
  and `resource` run work in the current scope rather than creating a child scope,
  so an uncaught failure still fails the current scope.

  Scope failure boundaries are local now. `ScopeDescriptor` no longer carries
  `failureMode`, and child-scope failures settle the child scope instead of
  propagating through the parent chain. Direct kernel callers should observe the
  returned scope or outcome handle rather than relying on parent-scope failure
  propagation. `enclose` has been removed because `branch` now covers explicit
  scoped work.

  `ScopeFailure` now records the direct primary failure in `cause` and keeps
  additional failures in `suppressed`. Recovery routing now uses routes installed
  by `guard`, with delegation to ancestor routes and an executor root recovery
  anchor.

## 0.3.0

### Minor Changes

- 08bfbdc: Clarify kernel entry terminology.

  This release aligns the kernel primitive types and parameter names around
  entries: the rituals passed to `spawn(...)`, `all(...)`, `race(...)`, and related
  helpers are now described consistently as entries.

  The runtime behavior, call patterns, and result semantics of these helpers are
  unchanged.

## 0.2.1

### Patch Changes

- 0d455c0: Tighten runtime scope synchronization semantics.

  Runtime scope reconciliation now gives scope state synchronization a clearer
  acquire and release lifecycle. This fixes unreliable nested synchronization and
  keeps the orchestration inside runtime scopes simpler, while preserving the
  existing kernel and host APIs.

## 0.2.0

### Minor Changes

- 2f51241: Replace scope-local mailbox messaging with explicit channel primitives.

  The kernel now exposes channel handles as paired receiver and sender endpoints.
  Consumers can use `channel(capacity)` to create rendezvous, bounded, or
  unbounded channels, then exchange values with `send` and `receive`, try
  non-blocking operations with `trySend` and `tryReceive`, and close either
  endpoint with `close`.

  The old `MessageKey` and `messageKey` exports are removed. `send` and `receive`
  now operate on channel endpoints rather than scope/message-key pairs.

- bd357f9: Tighten executor control and channel closure semantics.

  Out-of-band executor operations now reconcile through the same interpreter state
  path used by running rituals. Future settlement now reports whether the value was
  accepted, cancellation ignores invalid or already closed scopes, and settlement
  listener failures surface from the synchronous control call.

  Channel closure now carries an explicit outcome. `close(endpoint, outcome)`
  records that outcome, closed channel results expose it through their `closed`
  branch, and the executor can now drive channel `trySend` and `close` operations
  from outside the running ritual.

### Patch Changes

- 0f7c29a: Simplify launched scope branching.

  Launched scopes now enter the runtime through the interpreter's direct branch
  path. This removes an extra internal worker from launch setup and keeps branch
  creation aligned with the rest of the scope-control path, while preserving the
  public launch API and result semantics.

## 0.1.1

### Patch Changes

- da8f8bc: Align package publishing with the Yarn 4 monorepo workflow.

  This release switches package publication back to Yarn workspace publishing,
  so the published manifests are prepared through `yarn npm publish` with the
  same workspace-aware behavior used by the repository locally.

## 0.1.0

### Minor Changes

- 99e73f4: Prepare the first public release of `@shajara/kernel` and `@shajara/host`.

  This release publishes the initial package surfaces for the kernel runtime,
  structured concurrency primitives, and the host-layer operations API.
