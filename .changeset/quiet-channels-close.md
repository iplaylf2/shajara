---
"@shajara/kernel": minor
---

Tighten executor control and channel closure semantics.

Out-of-band executor operations now reconcile through the same interpreter state
path used by running rituals. Future settlement now reports whether the value was
accepted, cancellation ignores invalid or already closed scopes, and settlement
listener failures surface from the synchronous control call.

Channel closure now carries an explicit outcome. `close(endpoint, outcome)`
records that outcome, closed channel results expose it through their `closed`
branch, and the executor can now drive channel `trySend` and `close` operations
from outside the running ritual.
