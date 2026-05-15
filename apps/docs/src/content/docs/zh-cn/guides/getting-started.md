---
title: 开始使用
description: 启动 shajara routine，并把基于 Promise 的工作纳入其中。
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

## 拿到结果后继续执行

Promise 结果回到 routine 之后，就可以继续使用普通 JavaScript 控制流。每个外部
Promise 边界都保留在一个 `until(...)` 调用上。

```ts
import { until } from "@shajara/host";
import { loadUserName, saveGreeting } from "./user-data";

function* greetUser() {
  const userName = yield* until(() => loadUserName("user-1"));
  const greeting = `Hello, ${userName}`;

  yield* until(() => saveGreeting("user-1", greeting));

  return greeting;
}
```

这个 routine 在每个外部 Promise 边界等待，拿到值后继续执行，并清楚地返回最终
结果。
