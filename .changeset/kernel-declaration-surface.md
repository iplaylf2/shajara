---
"@shajara/kernel": minor
---

Add TSDoc to the published kernel API surface.

Kernel declarations now include caller-facing TSDoc across public contracts,
executor hooks, primitives, sigils, failures, and utility exports. This improves
generated `.d.ts` output and editor hints without changing runtime behavior.
