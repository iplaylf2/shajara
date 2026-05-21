---
title: Promise 常见用法
description: 把 Promise 形状的协作方式对应到 shajara routine 工作和 Promise 边界。
---

Promise 代码常见的形状包括组合工作、竞速候选项、包装 callback，以及把值交回 Promise
链。在 shajara routine 里，关键是看一次调用是直接给 routine 一个值，还是给它一个可以
稍后等待的句柄。

## 像 `Promise.all` 一样组合工作

当多段 routine 应该一起启动，并按顺序产出一个组合结果时，使用 `all(...)`。

```ts
import { sleep } from "@shajara/host";
import { all, wait } from "@shajara/host/primitives";

function* loadSession() {
  const sessionFuture = yield* all([
    function* loadUserName() {
      yield* sleep(20);

      return "Ada";
    },
    function* loadPermissions() {
      yield* sleep(10);

      return ["read", "write"];
    },
  ]);

  // userName: "Ada"; permissions: ["read", "write"]
  const [userName, permissions] = yield* wait(sessionFuture);

  return { permissions, userName };
}
```

`all(...)` 会启动这些 routine，并返回一个 future，里面保留它们的有序结果。调用方可以
在这组工作启动后继续运行，并在需要这些值的位置调用 `wait(...)`。

这和 `Promise.all(...)` 的结果形状接近，但等待结果的位置在 routine 里保持显式。启动
这组 routine 和等待它们的结果，是两个独立动作。

## 像 `Promise.race` 一样竞速候选 routine

当 routine 需要从多个候选 routine 中取得第一个成功结果时，使用 `race(...)`。

```ts
import { sleep } from "@shajara/host";
import { race } from "@shajara/host/primitives";

function* loadFastProfile() {
  // "network profile"
  return yield* race([
    function* cache() {
      yield* sleep(30);

      return "cached profile";
    },
    function* network() {
      yield* sleep(5);

      return "network profile";
    },
  ]);
}
```

`network` 胜出后，`race(...)` 会先取消剩下的 routine，再让 `loadFastProfile` 继续。

这不同于 `Promise.race(...)` 那种取得第一个 settled Promise 的语义。`race(...)`
会在 shajara 处理完未胜出的 routine 之后，才返回胜出的值。

## 读 `all` 和 `race` 的返回形状

`all(...)` 返回 future，表示调用方仍然可以决定在哪里等待这组有序结果。`race(...)`
返回值，表示调用方会在这些候选 routine 已经收敛成一个结果后继续。

可以按接口形状来读：future 表示稍后等待；值表示这个 API 已经等待过它启动的 routine。

## 从 callback 创建 future

普通 JavaScript 里会用 `new Promise(...)` 或 `Promise.withResolvers(...)` 包装 callback
时，在 shajara 里可以用 `completer(...)` 创建 future，并从 callback 里完成它。

```ts
import { completer } from "@shajara/host";
import { wait } from "@shajara/host/primitives";

function* locateUser() {
  const { future, reject, resolve } = yield* completer<GeolocationPosition>();

  navigator.geolocation.getCurrentPosition(resolve, reject);

  return yield* wait(future);
}
```

callback 一侧完成 future，routine 一侧用 `wait(...)` 等待同一个结果。

`yield* completer(...)` 会在当前 scope 中创建这个 future，并返回用于完成这个 future 的
callback 函数。如果 scope 结束时 future 仍然 pending，shajara 会取消它，而不是留下空悬
的句柄。

## 在 Promise 边界使用 AbortSignal

很多基于 Promise 的 API 已经接受 `AbortSignal`。`abortSignal(...)` 会返回一个登记到
当前 scope 的 signal。

```ts
import { abortSignal, until } from "@shajara/host";

function* loadProfile() {
  const signal = yield* abortSignal();
  const response = yield* until(() => fetch("/api/profile", { signal }));

  return yield* until(() => response.json());
}
```

`yield* abortSignal(...)` 会把这个 signal 登记到当前 scope。返回的 signal 本身不会取消
routine；scope 开始关闭时，Promise API 会通过这个原生句柄收到取消信号。

## 把 future 暴露成 Promise

在 routine 内部，如果 Promise 代码需要观察一个 shajara future，使用 `promisify(...)`。

```ts
import { promisify, sleep, until } from "@shajara/host";
import { spawn } from "@shajara/host/primitives";

function* loadAndReport() {
  const profileFuture = yield* spawn(function* loadProfile() {
    yield* sleep(10);

    return "Ada";
  });

  const profilePromise = yield* promisify(profileFuture);

  yield* until(() =>
    profilePromise.then((name) =>
      fetch("/api/profile-report", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    ),
  );
}
```

future 仍然代表一个 shajara process 的结果。返回的 Promise 在边界处暴露这个结果，让
Promise 链可以继续处理它。
