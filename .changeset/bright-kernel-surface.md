---
"@shajara/kernel": minor
---

Refine kernel ownership boundaries.

`resource(...)` did not add a separate kernel semantic beyond composing existing
primitives, so the kernel package no longer publishes it. Scope cancellation and failure
now cancel child scopes before local processes during convergence.
