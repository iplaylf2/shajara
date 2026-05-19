---
"@shajara/host": minor
---

Honor managed-scope ownership for launched work.

`Scope.run(...)` now treats launched work as owned by the managed scope.
Non-cancellation failures close that scope, cancellation remains local to the launched
work, and `Scope.cancel()` resolves after expected shutdown.

Abort-driven convergence follows the same ownership boundary. Cancellation-style abort
reasons cancel the launch, other reasons fail it, and `abortSignal()` preserves the scope
close reason on `AbortSignal.reason`.
