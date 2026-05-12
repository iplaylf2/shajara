---
"@shajara/kernel": minor
---

Clarify scope exit recovery semantics.

The kernel now exports `ScopeExitFailure` for the failure side of scope
`exitFuture` results and uses the same contract for recovery requests.
`resumable(...)` recovery now covers child-scope cancellation through the same
route as child-scope failure.

Scope exit convergence also leaves the final result stable. Once a scope
completes, cancels, or fails, later scope activity cannot advance that closed
scope again.
