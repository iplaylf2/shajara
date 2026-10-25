<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="internal/brand/logo/dark.svg">
    <img alt="shajara" src="internal/brand/logo/light.svg" width="96">
  </picture>
</p>

# shajara

[![NPM Version](https://img.shields.io/npm/v/%40shajara%2Fhost)](https://www.npmjs.com/package/%40shajara%2Fhost)
[![zread](https://img.shields.io/badge/Ask_Zread-_.svg?style=flat&color=00b0aa&labelColor=000000&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQuOTYxNTYgMS42MDAxSDIuMjQxNTZDMS44ODgxIDEuNjAwMSAxLjYwMTU2IDEuODg2NjQgMS42MDE1NiAyLjI0MDFWNC45NjAxQzEuNjAxNTYgNS4zMTM1NiAxLjg4ODEgNS42MDAxIDIuMjQxNTYgNS42MDAxSDQuOTYxNTZDNS4zMTUwMiA1LjYwMDEgNS42MDE1NiA1LjMxMzU2IDUuNjAxNTYgNC45NjAxVjIuMjQwMUM1LjYwMTU2IDEuODg2NjQgNS4zMTUwMiAxLjYwMDEgNC45NjE1NiAxLjYwMDFaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00Ljk2MTU2IDEwLjM5OTlIMi4yNDE1NkMxLjg4ODEgMTAuMzk5OSAxLjYwMTU2IDEwLjY4NjQgMS42MDE1NiAxMS4wMzk5VjEzLjc1OTlDMS42MDE1NiAxNC4xMTM0IDEuODg4MSAxNC4zOTk5IDIuMjQxNTYgMTQuMzk5OUg0Ljk2MTU2QzUuMzE1MDIgMTQuMzk5OSA1LjYwMTU2IDE0LjExMzQgNS42MDE1NiAxMy43NTk5VjExLjAzOTlDNS42MDE1NiAxMC42ODY0IDUuMzE1MDIgMTAuMzk5OSA0Ljk2MTU2IDEwLjM5OTlaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik0xMy43NTg0IDEuNjAwMUgxMS4wMzg0QzEwLjY4NSAxLjYwMDEgMTAuMzk4NCAxLjg4NjY0IDEwLjM5ODQgMi4yNDAxVjQuOTYwMUMxMC4zOTg0IDUuMzEzNTYgMTAuNjg1IDUuNjAwMSAxMS4wMzg0IDUuNjAwMUgxMy43NTg0QzE0LjExMTkgNS42MDAxIDE0LjM5ODQgNS4zMTM1NiAxNC4zOTg0IDQuOTYwMVYyLjI0MDFDMTQuMzk4NCAxLjg4NjY0IDE0LjExMTkgMS42MDAxIDEzLjc1ODQgMS42MDAxWiIgZmlsbD0iI2ZmZiIvPgo8cGF0aCBkPSJNNCAxMkwxMiA0TDQgMTJaIiBmaWxsPSIjZmZmIi8%2BCjxwYXRoIGQ9Ik00IDEyTDEyIDQiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgo8L3N2Zz4K&logoColor=ffffff)](https://zread.ai/iplaylf2/shajara)

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
