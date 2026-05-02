---
"@shajara/kernel": minor
---

Separate scoped work from process work in kernel primitives.

The kernel package now makes ownership explicit in its low-level primitive
contracts. Primitives that create child scopes return values that expose those
scopes: `branch`, `guard`, and `autonomy` return `BranchHandle`, while `race`
and `resumable` return `ScopedOutcome`. This lets integrations observe scope
lifetime separately from the selected outcome future.

Process-level primitives still keep lightweight future handles. `spawn`, `all`,
and `resource` run work in the current scope rather than creating a child scope,
so an uncaught failure still fails the current scope.

Scope failure boundaries are local now. `ScopeDescriptor` no longer carries
`failureMode`, and child-scope failures settle the child scope instead of
propagating through the parent chain. Direct kernel callers should observe the
returned scope or outcome handle rather than relying on parent-scope failure
propagation. `enclose` has been removed because `branch` now covers explicit
scoped work.

`ScopeFailure` now records the direct primary failure in `cause` and keeps
additional failures in `suppressed`. Recovery routing now uses routes installed
by `guard`, with delegation to ancestor routes and an executor root recovery
anchor.
