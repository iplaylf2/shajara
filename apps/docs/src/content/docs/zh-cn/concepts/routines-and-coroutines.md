---
title: Routine 与 Coroutine
description: 理解 routine 是交给 shajara 的代码，coroutine 是 shajara 推进的一次运行。
---

routine 是交给 shajara 运行的代码。在 JavaScript 中，它写成 `function*`；使用 shajara
时，你不需要先了解 generator 机制。需要记住的是：routine 内部用普通 JavaScript 组织
流程；在需要 shajara 处理等待、并发或边界时，用 `yield*` 把控制交给 shajara。

coroutine 是 routine 启动后的那次运行。shajara 负责创建、暂停、继续和清理 coroutine；
应用代码通常只传递 routine、等待 future 或接收返回值。

## Routine 交给 shajara 运行

应用代码可以通过 `run(...)` 把 routine 交给 shajara：

```ts
import { run } from "@shajara/host";

// "ready"
const message = await run(function* main() {
  return "ready";
});
```

`main` 是 routine。`run(...)` 从应用代码启动它；返回的 Promise 会以 routine 的返回值
resolve。

## Coroutine 是 routine 的一次运行

routine 描述要运行的代码；coroutine 是这段代码的一次运行。同一个 routine 被启动两次时，
shajara 会推进两条不同的 coroutine。每条 coroutine 都有自己的当前位置、局部状态和等待点。

TypeScript 导出的类型可以按这个轮廓理解：

```ts
type RiteRoutine<Return> = () => RiteCoroutine<Return>;
type RiteCoroutine<Return> = Generator<unknown, Return, unknown>;
```

`RiteRoutine<Return>` 是可以交给 shajara 的 routine；`RiteCoroutine<Return>` 是 shajara
会推进并最终产出 `Return` 的一次运行。

`Rite` 前缀用于把 shajara 的公开类型与其他语言或库里的类似 routine、coroutine 概念区分开。

## 在 routine 中组合另一段 routine

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

`loadProfile()` 是普通 JavaScript 调用，它会从这段 routine 产生一条 coroutine。`yield*`
在当前位置委托这条 coroutine，直到它返回；整个 `yield* loadProfile()` 表达式的值，就是
`loadProfile` 产出的返回值。

## `yield*` 标记运行时交接点

在 routine 内部，`yield*` 是把 coroutine 交给运行时的位置。这个 coroutine 可以来自另一段
routine，也可以来自 shajara API。shajara 可以暂停当前 coroutine，推进被委托的
coroutine，并在有结果后把结果送回同一个位置。

```ts
import { until } from "@shajara/host";

function* loadDisplayName(userId: string) {
  const response = yield* until(() => fetch(`/api/users/${userId}`));
  const user = yield* until(() => response.json());

  return user.displayName;
}
```

Promise 工作仍然来自普通 JavaScript API。`until(...)` 返回 coroutine；`yield* until(...)`
是当前 routine 在 shajara 控制流中等待这个 Promise 结果的位置。

这里不能把 `yield*` 简写成 `yield`。`yield` 不会把 coroutine 委托给运行时；当你在
routine 中使用 `until(...)`、`wait(...)`、`spawn(...)` 这类返回 coroutine 的 API 时，
写法应该是 `yield* until(...)` 这样的形式。

## Routine 可以作为 process 入口

当 routine 通过 `yield* spawn(...)` 启动另一段 routine 时，shajara 会在当前 scope 里为
这段工作建立 process，并在这个 process 里推进对应的 coroutine。routine 是 process 的
入口，coroutine 是正在推进的一次运行，process 是由 scope 拥有的运行时身份，让这段工作
有清楚的归属和结果 future。

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

`loadSidebar` 是 routine。`yield* spawn(...)` 会把它作为当前 scope 里一个 process 的
入口，并把用于观察这个 process 结果的 future 交回 `renderPage`。这个 process 会推进从
`loadSidebar` 启动的 coroutine。`renderPage` 会继续运行，直到走到 `wait(...)` 的位置。
