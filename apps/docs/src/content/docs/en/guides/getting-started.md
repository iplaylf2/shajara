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

## Continue With the Result

After a promise result returns to the routine, use ordinary JavaScript control
flow around it. Each outside promise boundary stays visible at an `until(...)`
call.

```ts
import { until } from "@shajara/host";
import { loadUserName, saveGreeting } from "./user-data";

function* greetUser() {
  const userName = yield* until(() => loadUserName("user-1"));
  const greeting = `Hello, ${userName}`;

  yield* until(() => saveGreeting("user-1", greeting));

  return greeting;
}
```

This routine waits at each outside promise boundary, continues with the returned
value, and makes the final result explicit.
