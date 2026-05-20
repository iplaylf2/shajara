---
title: 开始使用
description: 从应用代码启动 shajara，并把已有的 Promise 工作带进 routine。
---

当应用代码需要进入 shajara 时，先使用 `@shajara/host`。普通 JavaScript 代码通过它启动
入口，routine 代码再用 `yield*` 调用 shajara 操作。

## 安装

```sh
npm install @shajara/host
```

## 运行一个 routine

shajara routine 使用 generator function 编写。用 `run(...)` 启动 routine；在 routine
内部，shajara 操作用 `yield*` 调用。

```ts
import { run } from "@shajara/host";

// message 是 "ready"。
const message = await run(function* main() {
  return "ready";
});
```

`run(...)` 是应用代码进入 shajara 的入口。routine 返回后，这个 Promise 会 resolve。

后面的示例只展示 routine 本身。这段 routine 可以直接传给 `run(...)`，也可以被另一个
routine 调用。

## 等待 Promise 工作

应用代码里通常已经在使用会返回 Promise 的 API。`fetch(...)` 就是其中一种。
`until(...)` 用来在 routine 内部等待这类工作。

```ts
import { until } from "@shajara/host";

function* loadUser() {
  const response = yield* until(() => fetch("/api/users/user-1"));

  return yield* until(() => response.json());
}
```

Promise 仍然由普通 JavaScript 代码创建；`until(...)` 负责把它的完成或失败
带回 routine 的控制流。

`yield* until(...)` 是 routine 把控制交给 shajara，并拿回 Promise 结果的位置。

## 启动并发工作并稍后取结果

当某段异步工作可以和当前流程一起推进时，父 routine 可以先启动它，再在需要结果的位置
等待它。

```ts
import { sleep } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";

function* greetUser() {
  const workspaceNameFuture = yield* spawn(function* loadWorkspaceName() {
    yield* sleep(10);

    return "Docs";
  });

  yield* sleep(20);

  const userName = "Ada";
  const workspaceName = yield* wait(workspaceNameFuture);

  // 返回 "Hello, Ada from Docs"。
  return `Hello, ${userName} from ${workspaceName}`;
}
```

`spawn(...)` 会启动 `loadWorkspaceName`，并把结果句柄返回为 `workspaceNameFuture`。
`wait(...)` 是 `greetUser` 观察这个 future 的位置。

父 routine 保留清楚的并发结构：启动工作，继续当前流程，再取得结果。
