# shajara

[![NPM Version](https://img.shields.io/npm/v/%40shajara%2Fhost)](https://www.npmjs.com/package/%40shajara%2Fhost)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/iplaylf2/shajara)

shajara is a structured concurrency library for JavaScript applications.

It keeps concurrent work inside a bounded tree: each start has an owner, each wait or communication point has a place, and completion, failure, and cancellation converge through structure instead of drifting outside the call graph.

For most users, `@shajara/host` is the entry point. It presents the model as a generator-based JavaScript API, so branch starts, waits, and joins stay visible in the routine that owns the workflow.

This library is inspired by [effection](https://github.com/thefrontside/effection).

## Installation

```sh
npm install @shajara/host
```

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

The important part is not simply that two steps run concurrently. Branches start and results join in the same routine that owns the page load.

## Why use shajara

In JavaScript code, `async`/`await`, promises, timers, and callbacks remain the building blocks. shajara helps when each individual operation is straightforward, but the relationships among them carry the real complexity: which work owns which branch, where failures aggregate, how cancellation crosses a boundary, and where results join.

It is especially useful when:

- concurrent tasks need clear ownership instead of floating independently
- completion, failure, and cancellation all need to converge through the same concurrency tree
- concurrency logic should stay stepwise and readable instead of being split across multiple async objects
- built-in JavaScript async APIs handle the individual operations, but the larger concurrency shape is still hard to express and maintain
