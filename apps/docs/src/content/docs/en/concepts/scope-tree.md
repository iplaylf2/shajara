---
title: Scope Tree
description: Understand how shajara places child scopes and processes in the scope tree.
---

> Naming: `shajara` is named for a tree. The scope tree described here is the runtime
> structure behind that name.

shajara's structured concurrency runs inside a scope tree. The tree nodes are scopes, and
each child scope is attached under the parent scope that created it. A process does not
become a tree node. It runs inside a scope.

The scope tree records where shajara places child scopes and processes. When routine code
creates new structure, placement is decided by the scope where the call runs.

## Scopes Are Tree Nodes

`branch(...)` creates a child scope under the current scope. The routine passed to
`branch(...)` runs as the entry for that child scope.

```ts
import { sleep } from "@shajara/host";
import { branch } from "@shajara/host/primitives";

function* renderPage() {
  const profile = yield* branch(function* renderProfile() {
    const avatar = yield* branch(function* renderAvatar() {
      yield* sleep(5);

      return "avatar";
    });

    return `profile with ${avatar}`;
  });

  const timeline = yield* branch(function* renderTimeline() {
    yield* sleep(10);

    return "timeline";
  });

  return { profile, timeline };
}
```

The runtime structure created by this code is not a sequence of ordinary function calls.
It is a scope tree. Each `branch(...)` places a child scope under the current scope when
that call runs.

```text
renderPage scope
├─ renderProfile scope
│  └─ renderAvatar scope
└─ renderTimeline scope
```

## Processes Run Inside Nodes

A process is the runtime identity a scope creates for a routine entry. When shajara
creates a process, it starts the routine used as that entry. That process belongs to the
scope that created it. The scope tree records that ownership; the process itself does not
become a tree node.

```ts
import { sleep } from "@shajara/host";
import { branch, spawn } from "@shajara/host/primitives";

function* handlePage() {
  yield* spawn(function* refreshIndex() {
    yield* sleep(20);

    return "index refreshed";
  });

  const panel = yield* branch(function* renderPanel() {
    yield* spawn(function* loadPanelData() {
      yield* sleep(10);

      return "panel data";
    });

    return "panel";
  });

  yield* spawn(function* writePageMetric() {
    return "metric written";
  });

  return panel;
}
```

Each of the three `spawn(...)` calls creates a process and starts the routine passed to it.
They use the same API, but the calls do not all run in the same scope: `refreshIndex`
and `writePageMetric` are processes in the scope running `handlePage`. `loadPanelData` is
a process in the `renderPanel` child scope.

`branch(...)` does more than call a routine. It first creates a child scope, then creates
an entry process inside that child scope. The routine passed to `branch(...)` starts in
that process as its entry. After that child scope converges, the process that called
`branch(...)` continues in its original scope, so `writePageMetric` still belongs to the
scope running `handlePage`.

## Placement Is Decided at Creation

Creating child scopes and creating processes follow the same rule: runtime position is
decided when the creation action runs. shajara uses the calling process, and the scope
that process belongs to, to decide where to place the new structure.

- An operation that creates a process places that process in the calling process's scope.
  `spawn(...)` is the most direct example.
- An operation that creates a child scope attaches that child scope under the calling
  process's scope. `branch(...)` is the most direct example.

The same routine function can be used as the entry for different processes. Its runtime
position is not decided by where the function is defined. It is decided when the creation
action runs: which process is running this routine code, and which scope that process
belongs to at that moment.

Therefore, the difference between `spawn(...)` and `branch(...)` is more than a return
shape. `spawn(...)` places a new process in the scope where the call runs. `branch(...)`
creates a child scope first, then creates an entry process inside it. After that child
scope ends and `branch(...)` returns, the caller's process continues in its original scope.
