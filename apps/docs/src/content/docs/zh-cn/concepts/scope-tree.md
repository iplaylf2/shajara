---
title: Scope 树
description: 理解 shajara 如何在 scope 树里放置 child scope 和 process。
---

> 命名来源：`shajara` 取意于“树”。本文讨论的 scope 树，就是这个名字指向的运行时结构。

shajara 的结构化并发运行在一棵 scope 树里。树上的节点是 scope；child scope 挂在创建它的
parent scope 下面。process 不会成为树节点，它在某个 scope 里运行。

scope 树记录 shajara 如何放置 child scope 和 process。routine 代码创建新结构时，位置由
调用发生时所在的 scope 决定。

## Scope 是树节点

`branch(...)` 会在当前 scope 下面创建 child scope。传给 `branch(...)` 的 routine 会作为
这个 child scope 的入口运行。

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

这段代码创建出的运行时结构不是一串普通函数调用，而是一棵 scope 树。每次 `branch(...)`
都会在调用发生时的当前 scope 下面放入一个 child scope。

```text
renderPage scope
├─ renderProfile scope
│  └─ renderAvatar scope
└─ renderTimeline scope
```

## Process 在节点里运行

process 是 scope 为 routine 入口创建的运行时身份。创建 process 时，shajara 会启动作为
入口的 routine。这个 process 归属于创建它的 scope；scope 树记录的正是这种归属。process
本身不会成为树节点。

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

三个 `spawn(...)` 调用都会创建 process，并启动传给它们的 routine。它们使用同一个 API，但
这些调用并不都发生在同一个 scope：`refreshIndex` 和 `writePageMetric` 是 `handlePage`
所在 scope 里的 process；`loadPanelData` 是 `renderPanel` 这个 child scope 里的 process。

`branch(...)` 不只是调用一段 routine。它先创建 child scope，再在这个 child scope 里创建
entry process。传给 `branch(...)` 的 routine 会作为这个 process 的入口运行。等这个
child scope 收敛后，调用 `branch(...)` 的 process 仍在原来的 scope 里继续运行，所以后面的
`writePageMetric` 仍然归入 `handlePage` 所在 scope。

## 位置在创建时确定

创建 child scope 和创建 process 遵循同一条规则：运行时位置在创建动作发生时确定。shajara
会根据调用方 process，以及这个 process 所属的 scope，决定新结构放在哪里。

- 创建 process 的操作，会把 process 放进调用方 process 所属的 scope。`spawn(...)` 是最直接的
  例子。
- 创建 child scope 的操作，会把 child scope 挂在调用方 process 所属的 scope 下面。
  `branch(...)` 是最直接的例子。

同一个 routine 函数可以被不同 process 用作入口。真正决定运行时位置的不是函数定义写在哪里，
而是创建动作发生时，哪一个 process 正在运行这段 routine 代码，以及这个 process 当时属于哪一个
scope。

因此，`spawn(...)` 与 `branch(...)` 的差异不只是返回形状。`spawn(...)` 会把新的 process
放进调用发生时所在的 scope。`branch(...)` 会先创建 child scope，再在其中创建 entry process；
等这个 child scope 结束、`branch(...)` 返回后，调用方 process 仍然在原来的 scope 里继续。
