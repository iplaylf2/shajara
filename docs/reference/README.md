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
  `ExecutionScopeRef`, entry handles, future observation, external control, pacing, and
  autonomy.
- [host.md](host.md): host adaptation, including the routine and coroutine model, host
  error mapping, host operations, and host-facing primitives.
- [api.md](api.md): public interface, including package export surfaces, entry
  signatures, host operation and primitive return values, and result forms.

A document may restate a rule from the documents to its left when describing its own
boundary. Concepts from documents to its right stay outside its scope.

## Concept Ownership

| Concept                                                         | Owned by       |
| --------------------------------------------------------------- | -------------- |
| `Wisp`, `Ritual`, `Sigil`, echo/resonance                       | `semantics.md` |
| scope tree, process ownership, descriptors                      | `semantics.md` |
| future, context, channel semantics                              | `semantics.md` |
| failure values, scope exit failures, cancellation               | `semantics.md` |
| branch result ownership and recovery routes                     | `semantics.md` |
| execution entries and launch handles                            | `executor.md`  |
| future settlement observation                                   | `executor.md`  |
| external future settlement, channel control, entry cancellation | `executor.md`  |
| `Pacer`, slice progression, scheduler and reaper                | `executor.md`  |
| routine and coroutine model, `Presence`, host error mapping     | `host.md`      |
| host entries, `operations` module                               | `host.md`      |
| package exports, signatures, result forms                       | `api.md`       |

## Core Terms

- **Entry** means a runnable boundary that external code can start, such as `launch(...)`,
  `run(...)`, or `createScope().run(...)`.
- **Routine** means application-supplied code accepted by host entries or host-facing
  primitives and adapted to a kernel `Ritual`.
- **Coroutine** means a running host generator instance produced from a routine and
  advanced through host adaptation.
- **Scope** means the structured concurrency boundary that owns child scopes, processes,
  context, futures, and channels.
- **Process** means the semantic runtime instance of a `Wisp`; each process belongs to
  exactly one scope.
- **Branch** means a child scope created under the current scope.
- **Future** means the observation handle for a result that may settle later.
- **Scoped outcome** means a pair of a scope reference and an outcome future.
- **Convergence** means a process, future, or scope reaching its final result.
- **Lifecycle state** means an observable progress state, such as `open`, `closing`, or
  `closed`.
- **Convergence result** means the final result exposed through `exitFuture`.
- **Failure** means an in-band kernel failure value.
- **Scope exit failure** means the failure side of a scope convergence result: either
  cancellation or scope failure.
- **Scope failure** means a scope converged through its local failure path and reported a
  `ScopeFailure` through `exitFuture`.
- **Cancellation** means convergence along the `canceled` path.
- **Recovery** means failure handling through `resumable`, `guard`, and recovery routes.

Failures are scoped results. A child-scope failure is observed through that child
scope's `exitFuture`, or through a primitive that waits for and interprets that future.
