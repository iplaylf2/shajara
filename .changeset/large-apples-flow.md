---
"@shajara/kernel": minor
---

Clarify kernel entry terminology.

This release aligns the kernel primitive types and parameter names around
entries: the rituals passed to `spawn(...)`, `all(...)`, `race(...)`, and related
helpers are now described consistently as entries.

The runtime behavior, call patterns, and result semantics of these helpers are
unchanged.
