---
"@shajara/kernel": minor
---

Clarify scope exit recovery semantics.

The kernel now exports `ScopeExitFailure` for the failure side of scope
`exitFuture` results and uses the same contract for recovery requests.
`resumable(...)` recovery now covers child-scope cancellation through the same
route as child-scope failure.

Scope exit convergence also leaves the final result stable. Later scope
activity can no longer advance a scope after it has closed.

The `canceledFailure` export now constructs cancellation failures, aligning it
with the other failure helpers instead of exposing a shared value.
