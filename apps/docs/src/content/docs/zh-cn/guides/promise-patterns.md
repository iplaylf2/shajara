---
title: Promise 常见用法
description: 在 shajara routine 里组织 Promise 组合、竞速、callback、AbortSignal，以及原生 Promise 边界。
---

当 Promise 工作已经能通过 `until(...)` 进入 routine 之后，下一步是组织它们的
归属、汇合和生命周期。接下来的例子仍然从熟悉的 Promise 用法进入，展示 shajara
routine 如何承接这些工作。

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

  const [userName, permissions] = yield* wait(sessionFuture);

  // userName 是 "Ada"；permissions 是 ["read", "write"]。
  return { permissions, userName };
}
```

`all(...)` 启动这些 routine，并返回一个 future。这个 future 保留组合结果，调用方
可以在真正需要值的位置再等待它。

和 `Promise.all(...)` 相比，关键变化是工作归属：`all(...)` 把这组 routine 登记
在当前 scope 里，返回的 future 是之后汇合这些结果的句柄。

## 竞速多个候选 routine

当 routine 需要从多个候选 routine 中取得第一个成功结果时，使用 `race(...)`。

```ts
import { sleep } from "@shajara/host";
import { race } from "@shajara/host/primitives";

function* loadFastProfile() {
  const profile = yield* race([
    function* cache() {
      yield* sleep(30);

      return "cached profile";
    },
    function* network() {
      yield* sleep(5);

      return "network profile";
    },
  ]);

  // profile 是 "network profile"。
  return profile;
}
```

一个 routine 胜出后，`race(...)` 会取消其余 routine，然后把胜出的值交回调用方。

这不是 `Promise.race(...)` 那种“返回第一个 settled promise”的语义。`race(...)`
会直接返回胜出的值，是因为它已经在竞速 scope 里取消未胜出的 routine；调用方
拿到值时，未胜出的 routine 不会继续空悬。

## 读返回值形状

这两个示例的差异不只在控制流里，也体现在返回值上。`all(...)` 返回 future，
表示这些工作仍属于当前 scope，由调用方决定何时汇合；`race(...)` 直接返回结果，
表示它已经替调用方走完中间 scope 的竞速过程。

## 从 callback 创建 future

普通 JavaScript 里会用 `new Promise(...)` 或 `Promise.withResolvers(...)` 包装
callback 时，在 shajara 里可以用 `completer(...)` 创建 future，并从 callback
里完成它。

```ts
import { completer } from "@shajara/host";
import { wait } from "@shajara/host/primitives";

function* locateUser() {
  const { future, reject, resolve } = yield* completer<GeolocationPosition>();

  navigator.geolocation.getCurrentPosition(resolve, reject);

  return yield* wait(future);
}
```

`yield* completer(...)` 不只是调用语法。它会把 future 登记到当前 scope 的
生命周期里：如果 scope 结束时这个 future 仍未完成，shajara 会取消它，而不是留下
空悬的句柄。

callback 一侧完成 future，routine 一侧用 `wait(...)` 等待同一个结果。

## 在 Promise 边界使用 AbortSignal

很多基于 Promise 的 API 已经接受 `AbortSignal`。`abortSignal(...)` 会返回一个
绑定到当前 scope 的 signal。

```ts
import { abortSignal, until } from "@shajara/host";

function* loadProfile() {
  const signal = yield* abortSignal();
  const response = yield* until(() => fetch("/api/profile", { signal }));

  return yield* until(() => response.json());
}
```

`yield* abortSignal(...)` 也是一次生命周期登记。返回的 signal 会观察当前 scope；
它本身不会取消 scope。当 scope 结束时，signal 会 abort，让 Promise API 停止外部工作。
如果所属 scope 在 `fetch(...)` 完成前关闭，signal 会 abort 这次 request。

## 把 future 暴露成 Promise

在 routine 内部，如果原生 Promise 代码需要观察一个 shajara future，使用
`promisify(...)`。

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

future 仍然代表 shajara 管理的工作。原生 Promise 在边界处暴露这个结果，让普通
Promise 链可以继续处理它。调用 `yield* promisify(profileFuture)` 时，routine 会读取
当前执行上下文，并把这个 future 暴露成原生 Promise。

把 Promise 放在 routine 的边界使用。需要工作归属、结果汇合和生命周期收敛的部分，
留在 shajara routine 内部。
