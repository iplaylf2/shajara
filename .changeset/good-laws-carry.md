---
"@shajara/docs": patch
---

Document managed-scope shutdown and scheduler lifetime.

The `createScope()` guide now explains that an open managed scope keeps a Node.js process
active, while a settled `run(...)` releases scheduler resources. Readers can also see how
asynchronous disposal completes normal shutdown without surfacing expected cancellation.
