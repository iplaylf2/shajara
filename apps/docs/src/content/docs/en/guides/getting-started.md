---
title: Getting Started
description: Start a shajara routine and bring promise-based work into its control flow.
sidebar:
  order: 1
---

`@shajara/host` is the application-facing entry point for shajara.

## Install

```sh
npm install @shajara/host
```

## Start a routine

shajara routines are written as generator functions. Use `run(...)` to start
one; inside the routine, call shajara operations with `yield*`.

```ts
import { run } from "@shajara/host";

const message = await run(function* main() {
  return "ready";
});

console.log(message);
// ready
```

`run(...)` starts the routine and returns a promise for its result.

From here on, examples show the routine itself. The routine can be passed to
`run(...)` directly, or started indirectly by another routine.

## Wait for promise work

Most application code already has functions that return promises. `until(...)`
lets a routine wait for that work.

```ts
import { until } from "@shajara/host";
import { loadUserName } from "./user-data";

function* loadUser() {
  return yield* until(() => loadUserName("user-1"));
}
```

The promise still comes from ordinary JavaScript code; `until(...)` brings its
fulfillment or rejection back into the routine's control flow.

## Start two tasks from one routine

When two pieces of async work should produce one result together, start them
from the same routine and join them where the values are needed.

```ts
import { until } from "@shajara/host";
import { all, wait } from "@shajara/host/primitives";
import { loadTheme, loadUserName } from "./user-data";

function* loadProfile() {
  const loaded = yield* all([
    function* name() {
      return yield* until(() => loadUserName("user-1"));
    },
    function* theme() {
      return yield* until(() => loadTheme("user-1"));
    },
  ]);

  const [userName, theme] = yield* wait(loaded);

  return { theme, userName };
}
```

This routine starts both tasks, keeps the future for their combined result, and
waits when it needs the values. As routines grow, keep clear where work belongs,
where the routine waits, and what it returns.
