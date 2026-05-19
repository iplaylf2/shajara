---
"@shajara/kernel": minor
---

Honor staged scope convergence.

Scope shutdown now follows the staged convergence contract consistently.
`Executor.halt(...)` lets integrations fail a registered open scope from outside running
work, and cancellation or failure waits for child scopes before structural work, then
waits for structural work before detached work.

The default round-limit reaper now gives those cleanup cascades more room before
reporting the scope as stuck.
