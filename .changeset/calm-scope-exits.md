---
"@shajara/kernel": minor
---

Clarify scope exit recovery semantics.

The kernel now exports `ScopeExitFailure` for the failure side of scope
`exitFuture` results and uses the same contract for recovery requests.
`resumable(...)` recovery now covers child-scope cancellation through the same
route as child-scope failure.

Terminal scope convergence also closes the reconciliation boundary for that
scope. Later queued synchronization for the closed scope is discarded instead of
advancing it again.
