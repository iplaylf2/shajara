---
"@shajara/kernel": patch
"@shajara/host": patch
---

Simplify launched scope branching.

Launched scopes now enter the runtime through the interpreter's direct branch
path. This removes an extra internal worker from launch setup and keeps branch
creation aligned with the rest of the scope-control path, while preserving the
public launch API and result semantics.
