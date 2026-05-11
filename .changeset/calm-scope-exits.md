---
"@shajara/kernel": minor
---

Expose scope exit failures in recovery contracts.

The kernel now exports `ScopeExitFailure` for the failure side of scope
`exitFuture` results. Recovery routes use the same contract, so `guard` recovery
can handle child-scope cancellation as well as child-scope failure.
