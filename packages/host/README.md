# @shajara/host

`@shajara/host` is the application-facing package in shajara and the default entry point.

In shajara, structured concurrency is not a set of scattered async helpers. It is a way of organizing concurrent tasks into the same running tree. `@shajara/host` turns that orchestration model into interfaces that can be written directly into JavaScript application code.

## Installation

```sh
npm install @shajara/host
```

## Role in shajara

This package turns structured concurrency orchestration into a generator-style JavaScript API.

It packages host entries, host operations, concurrency primitives, and boundary adapters into interfaces that application code and extension libraries can use directly.

## What this package provides

- host entries: `run`, `createScope`
- host operations: `action`, `feed`, `sleep`, `until`
- concurrency, communication, and control primitives: `@shajara/host/primitives`
- host/kernel adapters: `@shajara/host/boundary`

## Example

```ts
import { run, sleep } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";

// `run(...)` starts a structured concurrency orchestration.
const result = await run(function* loadPage() {
  const header = yield* spawn(function* loadHeader() {
    yield* sleep(50);
    return "header";
  });

  const sidebar = yield* spawn(function* loadSidebar() {
    yield* sleep(80);
    return "sidebar";
  });

  return {
    header: yield* wait(header),
    sidebar: yield* wait(sidebar),
  };
});

console.log(result);
// { header: "header", sidebar: "sidebar" }
```

The point of this code is not just that two async steps run concurrently. The concurrency relationship itself is written into the flow: where branches start and where results join both live in the same piece of code as the main routine.

## When to use this package

Use this package when you want to use shajara directly in application code or build host-level abstractions on top of the same generator surface.

It fits especially well when:

- concurrent tasks need clear ownership
- completion, failure, and cancellation need to converge through the same concurrency tree
- concurrency logic should remain stepwise instead of being scattered across different async interfaces

## Public entries

- `@shajara/host`
- `@shajara/host/primitives`
- `@shajara/host/boundary`
