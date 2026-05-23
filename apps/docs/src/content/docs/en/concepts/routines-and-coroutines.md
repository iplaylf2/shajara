---
title: Routines and Coroutines
description: Separate reusable routine code from the coroutine instances shajara advances.
---

A routine is how shajara work is written in JavaScript. It uses
`function*`, but the point is not to learn the generator protocol first. Ordinary
JavaScript organizes the workflow, and `yield*` is where the routine hands control to
shajara for waiting, delegation, or concurrent work.

A coroutine is one instance of a routine. Calling a routine creates that coroutine;
shajara starts advancing it when current routine code delegates to it, or when an API
such as `spawn(...)` uses the routine as a process entry. The routine remains the code
shape, and the coroutine is the run shajara advances.

## A Routine Is Reusable Shajara Work

The TypeScript types mirror the JavaScript form:

```ts
type RiteRoutine<Return> = () => RiteCoroutine<Return>;
type RiteCoroutine<Return> = Generator<Sigil, Return, unknown>;
```

`RiteRoutine<Return>` is a function that produces a `RiteCoroutine<Return>`. In
application code, `function*` is how that form is written. A routine can be named, passed
around, and called later. It has no current position until an API or another routine
calls it.

`RiteCoroutine<Return>` is the generator object produced by that call. It has a current
position and local state, yields `Sigil` instructions that shajara handles between
steps, and eventually produces a `Return` value.

Application code usually reaches the `Sigil` layer by yielding shajara operations with
`yield*`; it does not construct instructions directly. The public `Rite` names mark the
routine and coroutine shapes shajara accepts and advances.

## A Coroutine Is One Instance

Each call to a routine produces a separate coroutine object. The same routine can
therefore have several runs without sharing the current position or local state between
those runs.

```ts
import { sleep } from "@shajara/host";

function* loadPanel() {
  yield* sleep(10);

  return "panel";
}

function* renderDashboard() {
  const primaryPanel = yield* loadPanel();
  const secondaryPanel = yield* loadPanel();

  return { primaryPanel, secondaryPanel };
}
```

`loadPanel` is one routine. Each `loadPanel()` call creates a new coroutine from it, and
`yield*` delegates that coroutine at the current position. The second call starts from
the top of `loadPanel`; it does not resume the coroutine created by the first call.

## `yield*` Delegates Inside the Current Process

Delegation keeps the current process as the runtime owner. The current coroutine pauses
at the `yield*` expression, shajara advances the delegated coroutine, and the returned
value comes back to the same expression.

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

`loadProfile()` is an ordinary JavaScript call that produces a coroutine from another
routine. `sleep(...)` also returns a coroutine. In both cases, `yield*` hands that
coroutine to shajara inside the current process, and the expression evaluates to the
delegated coroutine's return value.

The delegation itself does not create a future for later observation. The caller waits
directly at that expression.

## Process Entries Add Runtime Ownership

Passing a routine to an API such as `spawn(...)` gives that routine a different role.
The API uses the routine as an entry, shajara creates a process in the appropriate scope,
and that process drives the coroutine produced from the routine.

```ts
import { sleep } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";

function* loadSidebar() {
  yield* sleep(20);

  return ["guide", "api"];
}

function* renderPage() {
  const sidebarFuture = yield* spawn(loadSidebar);

  const title = "Dashboard";
  const sidebar = yield* wait(sidebarFuture);

  return { sidebar, title };
}
```

`spawn(loadSidebar)` uses `loadSidebar` as the entry for a process in the current scope.
The process drives the coroutine created from `loadSidebar`, and `sidebarFuture` observes
that process result. `renderPage` keeps running until it chooses to wait for that future.

The same routine would have a different runtime relationship if `renderPage` wrote
`yield* loadSidebar()` instead: that would delegate a coroutine inside the current
process instead of creating a new process with its own future.
