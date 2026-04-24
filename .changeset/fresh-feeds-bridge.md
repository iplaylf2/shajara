---
"@shajara/host": minor
---

Align host callback bridges with channel control semantics.

The host package now exposes `feed(capacity, overloadRewrite?)` for
callback-driven inputs. It returns a receiver for coroutine code and host-side
`trySend` and `close` callbacks that use the executor's external channel control
path.

Host channel primitives now follow the explicit close-outcome semantics. Closed
or revoked channel conditions are preserved on `ChannelError.detail`, `action`
callbacks remain safe to destructure before passing to callback APIs, and scope
cancellation now reflects whether a ritual had started before cancellation won.
