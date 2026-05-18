---
title: 开始使用
description: 安装 shajara，启动 routine，并在其中使用已有的 Promise 工作。
---

应用代码通过 `@shajara/host` 进入 shajara。

## 安装

```sh
npm install @shajara/host
```

## 运行一个 routine

shajara routine 使用 generator function 编写。用 `run(...)` 启动 routine；在 routine
内部，shajara 操作用 `yield*` 调用。

```ts
import { run } from "@shajara/host";

const message = await run(function* main() {
  return "ready";
});
```

`run(...)` 会启动这段 routine，并返回结果对应的 Promise。

从这里开始，示例只展示 routine 本身。这段 routine 可以直接传给 `run(...)`，
也可以被另一个 routine 调用。

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

在这个例子里，`yield* until(...)` 是 routine 把控制交给 shajara，并拿回 Promise
结果的位置。

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

  return `Hello, ${userName} from ${workspaceName}`;
}
```

`spawn(...)` 会启动 `loadWorkspaceName`，并把结果句柄返回为 `workspaceNameFuture`。
`greetUser` 会继续执行用户相关工作，再通过 `wait(...)` 取得 `workspaceName`。

父 routine 保留清楚的并发结构：启动工作，继续当前流程，再取得结果。
