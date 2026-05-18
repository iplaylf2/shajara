---
"@shajara/host": patch
---

Complete the host boundary type surface.

`@shajara/host/boundary` now re-exports `ScopeExitFailure`, the scope-exit failure type
accepted by `fromFailure(...)`. Extension libraries can import the failure type from the
same boundary entry as the mapping helper.
