---
"@shajara/host": minor
---

Move `resource` to host operations and fix provider cleanup.

`resource(...)` is now exported from the root `@shajara/host` entry with the
other host operations, and is no longer exported from `@shajara/host/primitives`.
Resource providers no longer keep their owning scope open after providing a
value. They remain scope-owned for cleanup and are released when the owning
scope starts closing.

The host package also exposes `abortSignal()`, which returns an `AbortSignal`
tied to the current scope. The signal aborts when that scope starts closing.
