# @shajara/kernel

`@shajara/kernel` is the low-level package in shajara.

It defines the structured concurrency model and executor machinery used to build higher
level runtime and integration layers.

## Installation

```sh
npm install @shajara/kernel
```

## Role in shajara

This package owns the semantic baseline, failure model, primitives, and execution
environment. It stays at the computation and executor layer that runtime and integration
layers build on.

## What this package provides

- core contracts: `Wisp`, `Ritual`, `ScopeRef`, `ProcessRef`, `FutureKey`
- failure model: `Failure` and its failure constructors
- concurrency, communication, control, termination, and cleanup primitives
- execution environment: `createExecutor`, `ExecutionScopeRef`, `LaunchHandle`, `Pacer`
- supplemental entries: `@shajara/kernel/sigils`, `@shajara/kernel/utils`

Together, these capabilities define shajara's computation carrier, structured concurrency
boundaries, failure convergence rules, and the execution environment that drives them.

## Example

```ts
import { cede, createExecutor } from "@shajara/kernel";

const executor = createExecutor((flushTurn) => {
  globalThis.setInterval(flushTurn, 0);

  return {
    beginSlice: () => ({
      shouldYield: () => false,
    }),
    continueLater(work) {
      queueMicrotask(work);
      return () => {};
    },
  };
});

executor.launch(executor.scope, cede);
```

This example shows where `@shajara/kernel` sits: first provide an execution environment,
then launch a lower-level `Ritual` into it.

## When to use this package

Use this package when you need direct access to shajara's underlying semantics and
execution environment.

It fits better for work such as:

- building a new runtime or adaptation layer
- consuming `Wisp`, `Ritual`, or executor capabilities directly
- experimenting with integrations around the semantic baseline

## Public entries

- `@shajara/kernel`
- `@shajara/kernel/sigils`
- `@shajara/kernel/utils`

## Documentation

Read the docs at [iplaylf2.github.io/shajara](https://iplaylf2.github.io/shajara).
