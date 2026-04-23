---
"@shajara/host": minor
---

Add channel primitives and `Presence<T>` results to the host API.

The host package now exposes `channel`, `send`, `receive`, `trySend`,
`tryReceive`, and `close` for channel-based communication. Closed or revoked
channels now surface as `ChannelError`.

Optional host results now use `Presence<T>` tuples. `lookup`, `poll`, and
`tryReceive` return `[true, value]` when a value is present and `[false]` when
no value is available.
