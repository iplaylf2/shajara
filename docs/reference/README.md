# Reference Index

This directory is the stable reference layer for shajara packages. Each document has a
single responsibility, and dependencies flow left to right.

## Dependency Direction

The dependency direction is:

```text
semantics -> executor -> host -> api
```

- [semantics.md](semantics.md): kernel semantics, including computation, scopes,
  processes, futures, channels, failure, recovery, and convergence.
- [executor.md](executor.md): execution environment, including `Executor`,
  `ExecutionScopeRef`, entry handles, external control, pacing, and autonomy.
- [host.md](host.md): host adaptation, including generator routines, JavaScript errors,
  host operations, and host-facing primitives.
- [api.md](api.md): public interface, including package export surfaces, entry
  signatures, operation and primitive return values, and result shapes.

A document may restate a rule from the documents to its left when describing its own
boundary. Concepts from documents to its right stay outside its scope.

## Concept Ownership

| Concept                                           | Owned by       |
| ------------------------------------------------- | -------------- |
| `Wisp`, `Ritual`, `Sigil`, echo/resonance         | `semantics.md` |
| scope tree, process ownership, descriptors        | `semantics.md` |
| future, context, channel semantics                | `semantics.md` |
| failure values, scope failure, cancellation       | `semantics.md` |
| branch result ownership and recovery routes       | `semantics.md` |
| execution entries, `LaunchHandle`, `LaunchResult` | `executor.md`  |
| external future settlement, channel send, cancel  | `executor.md`  |
| `Pacer`, slice progression, scheduler and reaper  | `executor.md`  |
| generator routines, `Presence`, JavaScript errors | `host.md`      |
| host entries and operations                       | `host.md`      |
| package exports, signatures, return-value tables  | `api.md`       |

## Core Terms

- **Entry** means a runnable boundary that external code can start, such as `launch(...)`,
  `run(...)`, or `createScope().run(...)`.
- **Scope** means the structured concurrency boundary that owns child scopes, processes,
  context, futures, and channels.
- **Branch** means a child scope created under the current scope.
- **Scoped outcome** means a pair of a scope reference and an outcome future.
- **Convergence** means a process, future, or scope reaching its final result.
- **Lifecycle state** means an observable progress state, such as `open`, `closing`, or
  `closed`.
- **Convergence result** means the final branch exposed through `exitFuture` or
  `LaunchResult`, such as success, failure, or cancellation.
- **Failure** means an in-band kernel failure value.
- **Scope failure** means a scope converged through its local failure path and reported a
  `ScopeFailure` through `exitFuture`.
- **Cancellation** means convergence along the `canceled` path.
- **Recovery** means failure handling through `resumable`, `guard`, and recovery routes.

Failures are scoped results. A child-scope failure is observed through that child
scope's `exitFuture`, or through a primitive that waits for and interprets that future.
