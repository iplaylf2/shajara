# Documentation Index

## Document Roles

| Document                     | Role                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| [semantics.md](semantics.md) | Semantic baseline. Defines `Wisp`, `Sigil`, `Scope`, `Process`, `Future`, failure, and convergence.      |
| [executor.md](executor.md)   | Execution environment. Covers `Executor`, `ExecutionScopeRef`, `launch(...)`, `Pacer`, and autonomy.     |
| [host.md](host.md)           | Host adaptation. Covers the generator-style API in `@shajara/host`, error mapping, and host integration. |
| [api.md](api.md)             | Public interface reference. Covers exports, import paths, result shapes, and public entry points.        |

## Dependency Direction

The documents depend on one another in this direction:

```text
semantics -> executor -> host -> api
```

- [semantics.md](semantics.md) establishes the core concepts.
- [executor.md](executor.md) builds on `semantics.md`.
- [host.md](host.md) builds on `semantics.md` and `executor.md`.
- [api.md](api.md) summarizes public interfaces and observable results.

## Reading Order

1. [semantics.md](semantics.md)
2. [executor.md](executor.md)
3. [host.md](host.md)
4. [api.md](api.md)

## Concept Placement

The same concept appears in different documents from different angles:

- In `semantics.md`, concepts appear as semantic definitions.
- In `executor.md`, concepts appear as execution-environment and governance concerns.
- In `host.md`, concepts appear as host adaptation and boundary behavior.
- In `api.md`, concepts appear as public interfaces and call results.

## Core Terms

The following terms distinguish concepts that are close to each other but not identical:

- "Entry" means a runnable boundary that can be started from the outside, such as `launch(...)`, `run(...)`, or `createScope().run(...)`.
- "Convergence" means a future or scope reaching its final result.
- "Closing" is only used for scope lifecycle and the `open`, `closing`, and `closed` states.
- "Failure" means a failure result or failure convergence. "Forced failure" only means directly pushing a scope into failure convergence.
- "Cancellation" only refers to the `canceled` path.
- "Adjudication" only refers to the governance decision a `reaper` makes over a scope in the `closing` state.
