---
"@shajara/kernel": minor
---

Move executor settlement observation to futures.

`LaunchHandle` no longer owns settlement listeners. Direct executor users should observe
a launched entry by passing `handle.scope.exitFuture` to `executor.onSettled(...)`,
which reports the future's native `FutureResult`. The `LaunchResult` wrapper has been
removed.

The executor also exposes `currentExecutorKey` for integrations that need to look up the
active executor from scope context. Scope cancellation and failure now drain owned work in
scope order: child scopes first, structural processes next, and detached processes last.
Custom scheduler assignment failures cancel the owning scope.
