---
title: Routine 与 Coroutine
description: 区分可复用的 routine 代码，以及 shajara 推进的 coroutine 实例。
---

routine 是在 JavaScript 中书写 shajara 工作的方式。它写成 `function*`，但重点不是先学习
generator 机制。普通 JavaScript 组织工作流程，`yield*` 则是 routine 为了等待、委托或
并发工作而把控制权交给 shajara 的位置。

coroutine 是 routine 的一次运行实例。调用 routine 会创建一条 coroutine；当前 routine 代码
委托给它，或 `spawn(...)` 这类 API 把 routine 用作 process 入口时，shajara 才开始推进它。
routine 仍然是代码形状，coroutine 则是 shajara 推进的那次运行。

## Routine 是可复用的 shajara 工作

TypeScript 类型对应着这个 JavaScript 形式：

```ts
type RiteRoutine<Return> = () => RiteCoroutine<Return>;
type RiteCoroutine<Return> = Generator<Sigil, Return, unknown>;
```

`RiteRoutine<Return>` 是产出 `RiteCoroutine<Return>` 的函数。在应用代码中，`function*`
写出的就是这种形式。routine 可以被命名、传递，并在稍后调用。在某个 API 或另一段 routine
调用它之前，它没有当前位置。

`RiteCoroutine<Return>` 是那次调用产出的 generator 对象。它有当前位置和局部状态，会在运行中
yield 出由 shajara 处理的 `Sigil` 指令，并最终产出一个 `Return` 值。

应用代码通常写 `yield*` 来使用 shajara operation，从而进入 `Sigil` 这一层；它不需要直接构造
指令。公开 API 中的 `Rite` 名称，用于标记 shajara 接受并推进的 routine 与 coroutine 形状。

## Coroutine 是一次运行实例

每次调用 routine 都会产生一条独立的 coroutine 对象。因此，同一段 routine 可以有多次运行，
而这些运行之间不会共享当前位置或局部状态。

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

`loadPanel` 是一段 routine。每次 `loadPanel()` 调用都会从它产生一条新的 coroutine；
`yield*` 会在当前位置委托这条 coroutine。第二次调用会从 `loadPanel` 顶部开始，并不会
继续第一次调用产出的那条 coroutine。

## `yield*` 在当前 process 内委托 coroutine

委托会保留当前 process 作为运行时归属。当前 coroutine 在 `yield*` 表达式处暂停，shajara
推进被委托的 coroutine，返回值再回到同一个表达式。

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

`loadProfile()` 是普通 JavaScript 调用，它从另一段 routine 产生 coroutine。`sleep(...)`
也会返回一条 coroutine。这两种情况下，`yield*` 都是在当前 process 内把 coroutine 交给
shajara，整个表达式的值就是被委托 coroutine 的返回值。

委托本身不会创建一个用于稍后观察的 future。调用方直接在这个表达式处等待。

## Process 入口增加运行时归属

把 routine 传给 `spawn(...)` 这类 API 时，这段 routine 会获得另一个角色。这个 API 会把
它当作入口，shajara 会在合适的 scope 中创建 process，并由这个 process 推进从 routine
产出的 coroutine。

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

`spawn(loadSidebar)` 会把 `loadSidebar` 作为当前 scope 中一个 process 的入口。这个 process
推进从 `loadSidebar` 创建的 coroutine，`sidebarFuture` 则观察这个 process 的结果。
`renderPage` 会继续运行，直到它选择等待这个 future。

如果 `renderPage` 写成 `yield* loadSidebar()`，同一段 routine 就会形成不同的运行时关系：
那会在当前 process 内委托一条 coroutine，而不是创建一个带有独立 future 的新 process。
