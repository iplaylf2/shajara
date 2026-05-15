---
title: 开始使用
description: 启动 shajara routine，并把基于 Promise 的工作纳入其中。
sidebar:
  order: 1
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

## 从一个 routine 启动两段工作

当两段异步工作需要一起产生结果时，可以从同一个 routine 启动它们，并在
需要结果的位置汇合。

```ts
import { until } from "@shajara/host";
import { all, wait } from "@shajara/host/primitives";
import { loadTheme, loadUserName } from "./user-data";

function* loadProfile() {
  const loaded = yield* all([
    function* name() {
      return yield* until(() => loadUserName("user-1"));
    },
    function* theme() {
      return yield* until(() => loadTheme("user-1"));
    },
  ]);

  const [userName, theme] = yield* wait(loaded);

  return { theme, userName };
}
```

这个 routine 启动两段工作，保留代表组合结果的 future，然后在需要值时等待。
随着 routine 继续增长，关键是让工作归属、等待位置和返回结果保持清楚。
