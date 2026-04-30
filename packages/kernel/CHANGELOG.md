# @shajara/kernel

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
