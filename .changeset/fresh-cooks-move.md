---
"@shajara/host": minor
---

Rename `action` to `completer` and add `promisify`.

`action()` is now `completer()`. Code that imports `action` or yields `action()` should
update those references; the operation still models host-owned completion of a
scope-bound future.

The host package also exposes `promisify(future)` for observing a `RiteFuture<T>` as a
native `Promise<T>`. The promise resolves with the future's value and rejects when the
future fails or is canceled.

Host operations that need executor services now use the current scope's executor
context. Running those operations outside a launched host routine throws
`OperationContextError`.
