# Reference Index

## Reference Roles

| Document                     | Role                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [semantics.md](semantics.md) | Semantic baseline. Defines `Wisp`, `Sigil`, `Scope`, `Process`, `Future`, channel, failure, and convergence. |
| [executor.md](executor.md)   | Execution environment. Covers `Executor`, `ExecutionScopeRef`, external control, `Pacer`, and autonomy.      |
| [host.md](host.md)           | Host adaptation. Covers the generator-style API in `@shajara/host`, result mapping, and host integration.    |
| [api.md](api.md)             | Public interface reference. Covers exports, import paths, result shapes, and public entry points.            |

## Dependency Direction

The documents depend on one another in this direction:

```text
semantics -> executor -> host -> api
```

- [semantics.md](semantics.md) establishes the core concepts.
- [executor.md](executor.md) builds on `semantics.md`.
- [host.md](host.md) builds on `semantics.md` and `executor.md`.
- [api.md](api.md) summarizes public interfaces and observable results.

## Concept Placement

The same concept appears in different documents from different angles:

- In `semantics.md`, concepts appear as semantic definitions.
- In `executor.md`, concepts appear as execution-environment and governance concerns.
- In `host.md`, concepts appear as host adaptation and boundary behavior.
- In `api.md`, concepts appear as public interfaces and call results.

## Core Terms

The glossary is grouped by the model layer that owns each term.

### Runtime Boundary

- "Entry" means a runnable boundary that can be started from the outside, such as `launch(...)`, `run(...)`, or `createScope().run(...)`.

### Communication

- "Channel" means an explicit runtime communication object with receiver and sender endpoints.

### Convergence and Lifecycle

- "Convergence" means a future or scope reaching its final result.
- "Closing" names the scope lifecycle path that moves from `open` through `closing` to `closed`.

### Failure

- "Failure" means a failure result or failure convergence.
- "Forced failure" means directly pushing a scope into failure convergence.
- "Cancellation" names convergence along the `canceled` path.

### Governance

- "Adjudication" means the governance decision a `reaper` makes over a scope in the `closing` state.
