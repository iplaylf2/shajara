---
"@shajara/kernel": patch
---

Fix unresolved imports in the kernel's published TypeScript declarations.

The affected declarations now resolve their internal types from files included in the
installed package. Public APIs and generic result types are unchanged.
