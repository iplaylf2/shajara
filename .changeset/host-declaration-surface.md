---
"@shajara/host": minor
---

Add TSDoc to the published host API surface.

Host declarations now include caller-facing TSDoc across root exports,
operations, generator primitives, and boundary adapters. This improves generated
`.d.ts` output and editor hints without changing runtime behavior.
