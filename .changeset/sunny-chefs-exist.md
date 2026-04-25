---
"@shajara/kernel": patch
"@shajara/host": patch
---

Tighten runtime scope synchronization semantics.

Runtime scope reconciliation now gives scope state synchronization a clearer
acquire and release lifecycle. This fixes unreliable nested synchronization and
keeps the orchestration inside runtime scopes simpler, while preserving the
existing kernel and host APIs.
