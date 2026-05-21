# shajara

[![NPM Version](https://img.shields.io/npm/v/%40shajara%2Fhost)](https://www.npmjs.com/package/%40shajara%2Fhost)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/iplaylf2/shajara)

shajara is a structured concurrency library for JavaScript applications.

It gives async workflows structure, so concurrent work has a clear owner from the
moment it starts until it completes, fails, or is canceled.

Most applications enter shajara through `@shajara/host`. It lets you write
structured-concurrency routines as JavaScript generator functions. A routine can start
concurrent work, wait for results, and keep that coordination in one visible workflow.

This library is inspired by [effection](https://github.com/thefrontside/effection).

## Installation

```sh
npm install @shajara/host
```

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

## Why use shajara

In JavaScript code, `async`/`await`, Promises, timers, and callbacks remain the building
blocks. shajara helps when each individual operation is straightforward, but the
relationships among them carry the real complexity: where each piece of concurrent work
belongs, where failures aggregate, how cancellation crosses a boundary, and where results
are collected.

It is especially useful when:

- concurrent tasks need clear ownership instead of floating independently
- completion, failure, and cancellation need to converge through the same concurrency tree
- concurrency logic should stay stepwise instead of being split across several async objects
- built-in JavaScript async APIs handle the individual operations, but the larger
  workflow shape is still hard to express and maintain

## Documentation

Read the docs at [iplaylf2.github.io/shajara](https://iplaylf2.github.io/shajara).
