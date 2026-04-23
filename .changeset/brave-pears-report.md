---
"@shajara/kernel": minor
---

Replace scope-local mailbox messaging with explicit channel primitives.

The kernel now exposes channel handles as paired receiver and sender endpoints.
Consumers can use `channel(capacity)` to create rendezvous, bounded, or
unbounded channels, then exchange values with `send` and `receive`, try
non-blocking operations with `trySend` and `tryReceive`, and close either
endpoint with `close`.

The old `MessageKey` and `messageKey` exports are removed. `send` and `receive`
now operate on channel endpoints rather than scope/message-key pairs.
