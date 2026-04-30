# @shajara/host

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
