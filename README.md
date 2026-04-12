# shajara

shajara offers a style of concurrency orchestration that differs from scattered `async`/`await`, timers, and callbacks.

It organizes concurrent work into a bounded tree: each start has an owner, each wait has a place, and completion, failure, and cancellation all converge through structure instead of drifting outside the call graph. Here, structured concurrency means that concurrent tasks belong to a boundary and finish, fail, or cancel with that boundary.

For most users, the entry point is `@shajara/host`. It turns that model into a generator-style JavaScript API where concurrency relationships appear directly in the code structure.

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

The point of this code is not just that two async steps run concurrently. The concurrency relationship itself is written into the flow: where branches start and where results join both live in the same piece of code as the main routine.

## Why use shajara

JavaScript can already do these things, but as concurrent branches multiply, and as failure aggregation and cancellation boundaries start to matter, the relationships often end up scattered across different async interfaces. shajara is not about replacing those basic capabilities. It is about organizing them into a more stable concurrency orchestration.

It is especially useful when:

- concurrent tasks need clear ownership instead of floating independently
- completion, failure, and cancellation all need to converge through the same concurrency tree
- concurrency logic should stay stepwise and readable instead of being split across multiple async objects
- the native async toolset is already usable, but the overall concurrency structure is still hard to express and maintain
