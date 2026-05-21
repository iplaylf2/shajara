# @shajara/host

`@shajara/host` is the application-facing package in shajara and the usual entry point
for JavaScript applications.

It gives application code a generator-based surface for structured concurrency: start
concurrent work, wait for results, and keep that coordination in one visible workflow.

## Installation

```sh
npm install @shajara/host
```

## Role in shajara

This package is the boundary where ordinary JavaScript application code enters shajara.

It exposes host entries, host operations, concurrency primitives, and boundary adapters
through interfaces that application code and extension libraries can use directly.

## What this package provides

- host entries: `run`, `createScope`
- host operations: `abortSignal`, `completer`, `feed`, `promisify`, `resource`,
  `sleep`, `until`
- concurrency, communication, and control primitives: `@shajara/host/primitives`
- boundary adapters for extension libraries: `@shajara/host/boundary`

## Example

```ts
import { run, sleep } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";

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
}); // { header: "header", sidebar: "sidebar" }
```

The important part is not simply that two steps run concurrently. Both pieces of work
start inside the workflow that owns the page load, and their results are collected there.

## When to use this package

Use this package when you want to use shajara directly in application code or build
host-level abstractions on top of the same generator surface.

It fits especially well when:

- concurrent tasks need clear ownership
- completion, failure, and cancellation need to converge through the same concurrency tree
- concurrency logic should remain stepwise instead of being scattered across several
  async interfaces

## Public entries

- `@shajara/host`
- `@shajara/host/primitives`
- `@shajara/host/boundary`

## Documentation

Read the docs at [iplaylf2.github.io/shajara](https://iplaylf2.github.io/shajara).
