---
"@shajara/kernel": minor
"@shajara/host": minor
---

Add channel-based communication primitives.

This release replaces the old scope-local mailbox model with explicit channels
made from paired receiver and sender endpoints. Consumers can now create
rendezvous, bounded, or unbounded channels with `channel(capacity)`, exchange
values with `send` and `receive`, and close either endpoint with `close`.

Closed and revoked channels are reported through each package's normal result
model, and invalid capacities now use channel-specific failure handling.
