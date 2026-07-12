---
"@shajara/host": patch
---

Release scheduler resources after top-level entries settle.

Top-level entries started by `run(...)` and `createScope()` now retain the shared scheduler
for their own lifetimes. The host releases its event-loop resources after the last entry
settles, allowing Node.js processes to exit naturally. An open managed scope continues to
retain those resources so it remains available to launch work.
