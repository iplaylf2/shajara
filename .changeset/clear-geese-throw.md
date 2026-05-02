---
"@shajara/host": minor
---

Adapt scoped outcomes into host control flow.

The host package adapts the kernel's scoped outcomes into the generator API used
by application code. `@shajara/host/primitives` now exposes `branch` instead of
`enclose`; scoped primitives return host values directly from the scope or
outcome future that determines their result. `branch`, `autonomy`, and `guard`
wait for their child scopes, `race` waits for the race scope before returning
the winning outcome, and `resumable` returns the recovery outcome.

Because kernel child-scope failures are local to the child scope, the host layer
keeps those failures on the exception path instead of returning future handles
that application code has to remember to observe. `spawn`, `all`, and `resource`
continue to expose future handles because they represent process activity in the
current scope.

Recovery handlers used with `guard` now return `Presence<unknown>`. Return
`[true, value]` to handle a `resumable` failure, return `[false]` to delegate to
an ancestor recovery route, or throw to fail the recovery request.
`ScopeError.cause` now contains the direct underlying failure rather than a
process or scope wrapper.
