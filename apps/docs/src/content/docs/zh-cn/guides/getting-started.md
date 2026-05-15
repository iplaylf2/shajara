---
title: 开始使用
description: 启动 shajara routine，等待 Promise 工作，并在稍后汇合 routine 工作。
---

`@shajara/host` 是 shajara 面向应用代码的入口。

## 安装

```sh
npm install @shajara/host
```

## 启动一个 routine

shajara routine 使用 generator function 编写。用 `run(...)` 启动 routine；
在 routine 内部，shajara 操作用 `yield*` 调用。

```ts
import { run } from "@shajara/host";

const message = await run(function* main() {
  return "ready";
});

console.log(message);
// ready
```

`run(...)` 会启动这段 routine，并返回结果对应的 Promise。

从这里开始，示例只展示 routine 本身。它可以直接传给 `run(...)`，也可以被
其他 routine 间接启动。

## 等待 Promise 工作

应用代码里通常已经有返回 Promise 的函数。`until(...)` 用来在 routine
内部等待这类工作。

```ts
import { until } from "@shajara/host";
import { loadUserName } from "./user-data";

function* loadUser() {
  return yield* until(() => loadUserName("user-1"));
}
```

Promise 仍然由普通 JavaScript 代码创建；`until(...)` 负责把它的完成或失败
带回 routine 的控制流。

## 启动并发工作并稍后汇合

当异步步骤已经封装成更小的 routine，父 routine 可以启动一段能和当前流程一起
推进的工作，再在需要结果的位置汇合。

```ts
import { spawn, wait } from "@shajara/host/primitives";
import { loadUserName, loadWorkspaceName, saveGreeting } from "./user-routines";

function* greetUser() {
  const workspaceNameFuture = yield* spawn(function* loadWorkspace() {
    return yield* loadWorkspaceName("workspace-1");
  });

  const userName = yield* loadUserName("user-1");
  const workspaceName = yield* wait(workspaceNameFuture);
  const greeting = `Hello, ${userName} from ${workspaceName}`;

  yield* saveGreeting("user-1", greeting);

  return greeting;
}
```

`spawn(...)` 会启动 `loadWorkspace`，并把结果句柄返回为 `workspaceNameFuture`。
`greetUser` 会继续执行 `loadUserName(...)`，再通过 `wait(...)` 取得 `workspaceName`。

导入的 routine 负责各自的内部细节。父 routine 保留清楚的并发结构：启动工作，
继续当前流程，再汇合结果。
