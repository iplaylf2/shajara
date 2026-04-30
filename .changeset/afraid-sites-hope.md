---
"@shajara/host": minor
---

Narrow the host API to the generator surface used by application code.

`@shajara/host/primitives` no longer exports `cancel`, `halt`, `defer`, or
`park`. Host rituals now use ordinary JavaScript control flow for termination:
throw `CanceledError` to cancel the current process and throw other errors to
fail it. Cleanup that should remain attached to a scope should be modeled with
`resource(...)`.

This keeps the host package focused on the patterns that application code is
expected to use directly, while leaving lower-level control primitives in
`@shajara/kernel` for integrations that need them.

The package also publishes `@shajara/host/boundary` for extension libraries. It
exposes the same ritual adapters, failure mapping, `Either` unwrapping, and
`Option` to `Presence<T>` conversion helpers that the built-in host primitives
use internally.
