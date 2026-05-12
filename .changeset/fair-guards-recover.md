---
"@shajara/host": minor
---

Expose scope exit errors to host recovery handlers.

`guard(...)` recovery handlers now receive `ScopeExitError`, covering both
`ScopeError` and `CanceledError`. This lets `resumable(...)` child cancellation
recover through the same guard route as child-scope failure.
