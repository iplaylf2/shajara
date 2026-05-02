---
"@shajara/host": minor
---

Move `resource` to host operations and fix provider cleanup.

`resource(...)` is now exported from the root `@shajara/host` entry with the
other host operations, and is no longer exported from `@shajara/host/primitives`.
Resource providers no longer keep their owning scope open after providing a
value. They remain scope-owned for cleanup, so the scope can still release
provider work when it closes or is canceled.

The host package also exposes `abortSignal()`, which returns an `AbortSignal`
tied to the current scope. The signal aborts when that scope closes, fails, or
is canceled.
