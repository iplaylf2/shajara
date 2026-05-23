---
"@shajara/host": minor
---

Surface unfulfilled futures as `UnfulfilledError`.

`wait(...)` and `poll(...)` now throw `UnfulfilledError`, and `promisify(...)` rejects
with the same error, when a future's owner scope closed before it settled.
`fromFailure(...)` maps kernel `unfulfilled` failures to `UnfulfilledError`.
