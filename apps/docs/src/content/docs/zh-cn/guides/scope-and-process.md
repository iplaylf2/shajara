---
title: Scope 与 Process
description: 从 all 和 race 的返回形状，展开到 process 与 scope 边界。
---

上一篇 guide 从熟悉的 Promise 用法进入，介绍了 `all(...)` 和 `race(...)`。这篇从它们
之间的一个差异继续：`all(...)` 返回 future，而 `race(...)` 返回值。

这个差异可以作为阅读 shajara 运行时形状的入口。future 表示调用方仍然持有一个可以
稍后等待的句柄；值表示 API 已经等待过它创建的边界。

## 从 `all` 和 `race` 开始

省略 routine body 后，这两个调用的形状不同：

```ts
import { all, race, wait } from "@shajara/host/primitives";

function* loadProfilePage() {
  const pageDataFuture = yield* all([loadUserName, loadWorkspaceName]);

  const fastestProfile = yield* race([readCacheProfile, readNetworkProfile]);

  const pageData = yield* wait(pageDataFuture);

  return { fastestProfile, pageData };
}
```

`all(...)` 返回后，`pageDataFuture` 仍然是 future。`loadProfilePage` 可以继续运行，
并在需要 page data 的位置等待它。

`fastestProfile` 已经是值。`race(...)` 已经在自己的 race scope 里运行这些候选
routine，然后才让 `loadProfilePage` 继续执行。

## Future 形状：process

process 是 scope 内正在运行的一段 routine。`spawn(...)` 展示了最直接的 future 返回
形状：它会在当前 scope 里启动一个 process，并返回这个 process 的 exit future。

```ts
import { sleep } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";

function* loadSidebar() {
  const recommendationsFuture = yield* spawn(function* loadRecommendations() {
    yield* sleep(20);

    return ["guide", "api"];
  });

  yield* sleep(5);

  const recommendations = yield* wait(recommendationsFuture);

  return { recommendations };
}
```

`loadRecommendations` 和 `loadSidebar` 属于同一个 scope。`recommendationsFuture`
只是观察句柄；`loadSidebar` 决定什么时候等待它。

`all(...)` 可以沿用同一种读法，只是形状更大：多段 routine 在当前 scope 中启动，
调用方拿到一个 future，之后通过它取得有序结果。

## Value 形状：scope 边界

scope 是运行时的归属边界。`branch(...)` 会为一段 routine 打开 child scope，等待这个
scope，再把 scope 的结果作为值返回。

```ts
import { sleep } from "@shajara/host";
import { branch, spawn } from "@shajara/host/primitives";

function* saveProfile() {
  const result = yield* branch(function* saveProfileScope() {
    yield* spawn(function* writeAuditTrail() {
      yield* sleep(20);
    });

    yield* sleep(5);

    return "saved";
  });

  // child scope 收敛完成后，result 是 "saved"。
  return result;
}
```

传给 `branch(...)` 的 routine 会成为 child scope 里的第一个 process。它还可以在同一个
scope 里启动更多 process。只有当 child scope 里的 `saveProfileScope` process 和
`writeAuditTrail` process 都结束后，调用方才会拿到 `"saved"`。

`race(...)` 可以读成一种专门处理候选 routine 的 scope API：它打开 scope，等到一个
成功结果，取消其余 routine，再返回胜出的值。`branch(...)` 是让一段
routine 在自己的 scope 里运行的通用形式。

## 在另一个 process 中等待

host API 会保持这个区分：打开 child scope 的 API，会在调用它的 process 里等待
这个 scope，然后返回值；在当前 scope 里启动 process 的 API，会返回用于观察这个
process 结果的 future。

如果一段 routine 需要 child scope，但当前 process 应该继续运行，可以把这两种形状
组合起来：

```ts
import { branch, spawn, wait } from "@shajara/host/primitives";

function* saveWithoutWaitingHere() {
  const saveFuture = yield* spawn(function* saveProcess() {
    return yield* branch(saveProfileScope);
  });

  const status = "saving";
  const result = yield* wait(saveFuture);

  return { result, status };
}
```

当前 process 启动 `saveProcess`，并拿到 `saveFuture`。等待 `saveProfileScope` 的是
`saveProcess` 这个 process；调用方可以继续运行，直到需要这个 future 的值。

## 沿用同一种读法

其他接收 routine 的 API 也可以这样读。有些会把 routine 留在当前 scope，并返回
future；有些会让 routine 在 child scope 里运行，并返回值。

```ts
import { resource } from "@shajara/host";
import { autonomy, guard, resumable } from "@shajara/host/primitives";

function* readOtherShapes() {
  // 当前 scope：provider 发布一个值，并以 future 返回。
  const sessionFuture = yield* resource(openSession);

  // Child scope：由这个恢复边界处理 recoverable failure。
  const guardedValue = yield* guard(saveProfile, recover);

  // Child scope：failure 可以被上层 guard 恢复。
  const recoveredValue = yield* resumable(saveProfile);

  // Child scope：scheduler 或 reaper 控制 scope 推进。
  const autonomousValue = yield* autonomy(saveProfile, options);
}
```

仍然先读 routine 参数，再读返回的是 future 还是值，由此判断是当前 scope 还是
child scope。
