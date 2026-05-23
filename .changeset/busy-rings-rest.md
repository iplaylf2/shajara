---
"@shajara/kernel": minor
---

Settle scope-owned pending futures as unfulfilled.

Future results now use `UnfulfilledFailure` when their owner scope closes before
the future produces a result. The kernel exports `UnfulfilledFailure` and
`unfulfilledFailure()` alongside the other failure variants.
