---
"@shajara/kernel": minor
"@shajara/host": minor
---

Publish the host and kernel packages as ESM only.

Both packages now publish ESM builds only and no longer provide CommonJS entry points.
Their declarations use explicit `.js` specifiers so TypeScript can resolve them with the
`NodeNext` module mode.

Consumers must load these packages through ESM. Replace `require(...)` calls with
`import` syntax and configure the consuming package for ESM before upgrading.
