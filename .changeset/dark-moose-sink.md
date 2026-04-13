---
"@shajara/host": patch
"@shajara/kernel": patch
---

Align package publishing with the Yarn 4 monorepo workflow.

This release switches package publication back to Yarn workspace publishing,
so the published manifests are prepared through `yarn npm publish` with the
same workspace-aware behavior used by the repository locally.
