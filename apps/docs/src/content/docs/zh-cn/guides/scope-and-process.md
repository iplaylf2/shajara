---
title: Scope 与 Process
description: 把 future 和直接返回的值读成 process 与 scope 边界。
---

读过几个调用之后，返回形状会比函数名更重要。future 表示 routine 仍然有一个可以等待的
结果；直接返回值，表示这次调用已经穿过一个边界并回来了。

这层形状背后的运行时名称是 process 和 scope。process 是 scope 中正在运行的一段
routine。scope 是拥有 process 并等待它们收敛的边界。

## 一个 process，一个 future

`spawn(...)` 会在当前 scope 里启动一个 process，并返回这个 process 的 exit future。

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

`loadRecommendations` 和 `loadSidebar` 属于同一个 scope。`recommendationsFuture` 是
观察这个 process 结果的句柄。`loadSidebar` 会继续运行，只在需要这个值的位置等待
future。

`all(...)` 可以沿用同一种读法，只是形状更大：多段 routine 在当前 scope 中启动，调用方
拿到一个 future，之后通过它取得有序结果。

## Child scope 返回一个值

`branch(...)` 会为一段 routine 打开 child scope，等待这个 scope，再把 scope 的结果作为
值返回。

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

`race(...)` 是专门处理候选 routine 的 child-scope 形式：它等到一个 routine 成功，
取消其余 routine，再返回胜出的值。`branch(...)` 是让一段 routine 在自己的 scope 里
运行的通用形式。

## 在另一个 process 中等待

如果需要 child scope，但当前 process 应该继续运行，可以把这两种形状组合起来：

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

host API 会保持这个区分：在当前 scope 中启动 process 的 API，会返回用于观察结果的
future；打开 child scope 的 API，会在调用它的 process 里等待这个 scope，然后返回值。
