---
"@shajara/kernel": minor
---

Remove the former `resource` kernel primitive.

`resource(...)` did not add a separate kernel semantic beyond composing existing
primitives, so the kernel package no longer publishes it.
