---
title: Routines and Coroutines
description: Understand routines as code handed to shajara and coroutines as individual runs shajara advances.
---

A routine is code handed to shajara. In JavaScript, it is written with `function*`; when
using shajara, you do not need to know the generator protocol first. The important part
is that ordinary JavaScript organizes the flow, and `yield*` hands control to shajara
when the routine needs waiting, concurrency, or a boundary.

A coroutine is one run of a routine. shajara creates, suspends, resumes, and cleans up
coroutines; application code usually passes routines, waits on futures, or receives
returned values.

## A Routine Is Handed to Shajara

Application code can hand a routine to shajara with `run(...)`:

```ts
import { run } from "@shajara/host";

// "ready"
const message = await run(function* main() {
  return "ready";
});
```

`main` is a routine. `run(...)` starts it from application code; the returned Promise
resolves with the value the routine returns.

## A Coroutine Is One Run of a Routine

A routine describes code to run; a coroutine is one execution of that code. If the same
routine starts twice, shajara advances two different coroutines. Each coroutine has its
own current position, local state, and wait point.

You can read the exported TypeScript types by this outline:

```ts
type RiteRoutine<Return> = () => RiteCoroutine<Return>;
type RiteCoroutine<Return> = Generator<unknown, Return, unknown>;
```

`RiteRoutine<Return>` is a routine that can be handed to shajara. `RiteCoroutine<Return>`
is one run that shajara advances until it produces `Return`.

The `Rite` prefix distinguishes shajara's public types from similar routine and coroutine
concepts in other languages or libraries.

## Compose One Routine Inside Another

```ts
import { sleep } from "@shajara/host";

function* loadProfile() {
  yield* sleep(10);

  return { displayName: "Ada" };
}

function* loadGreeting() {
  const profile = yield* loadProfile();

  return `Hello, ${profile.displayName}`;
}
```

`loadProfile()` is an ordinary JavaScript call that produces a coroutine from that
routine. `yield*` delegates that coroutine at the current position until it returns. This
means the whole `yield* loadProfile()` expression evaluates to the return value produced
by `loadProfile`.

## `yield*` Marks a Runtime Hand-Off

Inside a routine, `yield*` is where a coroutine is handed to the runtime. That coroutine
can come from another routine or from a shajara API. shajara can suspend the current
coroutine, advance the delegated coroutine, and send the result back to the same
position.

```ts
import { until } from "@shajara/host";

function* loadDisplayName(userId: string) {
  const response = yield* until(() => fetch(`/api/users/${userId}`));
  const user = yield* until(() => response.json());

  return user.displayName;
}
```

The Promise work still belongs to ordinary JavaScript APIs. `until(...)` returns a
coroutine; `yield* until(...)` is where the current routine waits for that Promise result
inside shajara control flow.

Do not replace `yield*` with `yield`. `yield` does not delegate a coroutine to the
runtime; when a routine uses an API such as `until(...)`, `wait(...)`, or `spawn(...)`
that returns a coroutine, write it in the form `yield* until(...)`.

## A Routine Can Be a Process Entry

When the current routine starts another routine through `yield* spawn(...)`, shajara
creates a process for that work in the current scope and drives the resulting coroutine
inside that process. The routine is the process entry, the coroutine is the run being
advanced, and the process is the scope-owned runtime identity that gives the work a clear
owner and result future.

```ts
import { sleep } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";

function* renderPage() {
  const sidebarFuture = yield* spawn(function* loadSidebar() {
    yield* sleep(20);

    return ["guide", "api"];
  });

  const title = "Dashboard";
  const sidebar = yield* wait(sidebarFuture);

  return { sidebar, title };
}
```

`loadSidebar` is a routine. `yield* spawn(...)` uses it as the entry for a process in the
current scope and returns a future to `renderPage` for observing that process result. That
process drives the coroutine created from `loadSidebar`. `renderPage` keeps running until
it reaches the `wait(...)` point.
