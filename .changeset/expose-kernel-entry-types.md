---
"@shajara/kernel": patch
---

Complete the primitive entry tuple type surface.

`AllEntries` and `RaceEntries` are now exported alongside `all(...)` and `race(...)`.
Integrations can import the tuple shapes from the same primitive surface as the functions
that accept them.
