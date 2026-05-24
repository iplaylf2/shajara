---
title: scope 与 process
description: 用返回形状区分 process future 和 child scope 返回值。
---

遇到不同 API 返回不同形状时，返回形状会比函数名更重要。future 表示还有一个可以等待的
结果；直接返回值，表示这次调用已经穿过一个边界并回来了。

这层形状背后的运行时名称是 process 和 scope。process 是 scope 为 routine 入口创建的
运行时身份，用来标识这段工作。scope 是拥有 process 并等待它们收敛的边界。

## 一个 process，一个 future

`spawn(...)` 会在当前 scope 里把一段 routine 用作一个 process 的入口，并返回这个
process 的 exit future。

```ts
import { sleep } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";

function* loadSidebar() {
  const recommendationsFuture = yield* spawn(function* loadRecommendations() {
    yield* sleep(20);

    return ["guide", "api"];
  });

  yield* sleep(5);

  // ["guide", "api"]
  const recommendations = yield* wait(recommendationsFuture);

  return { recommendations };
}
```

`loadRecommendations` 会作为 process 启动，并和 `loadSidebar` 属于同一个 scope。
`recommendationsFuture` 是观察这个 process 的句柄。`loadSidebar` 会继续运行，直到来到
这个等待点。

`all(...)` 可以沿用同一种读法，只是形状更大：多段 routine 在当前 scope 中启动，调用方
拿到一个 future，之后通过它取得有序结果。

## child scope 返回一个值

`branch(...)` 会为一段 routine 打开 child scope，等待这个 scope，再把 scope 的结果作为
值返回。

```ts
import { sleep } from "@shajara/host";
import { branch, spawn } from "@shajara/host/primitives";

function* saveProfile() {
  return yield* branch(function* saveProfileScope() {
    yield* spawn(function* writeAuditTrail() {
      yield* sleep(20);
    });

    yield* sleep(5);

    return "saved";
  }); // child scope 收敛后得到 "saved"。
}
```

传给 `branch(...)` 的 routine 会被用作 child scope 的 entry process。它还可以在同一个
scope 里启动更多 process。只有当 child scope 里的两个 process 都结束后，调用方才会拿到
entry process 的结果。

`race(...)` 是专门处理候选 routine 的 child scope 形式：它等到一个 routine 成功，
取消其余 routine，再返回胜出的值。`branch(...)` 是让一段 routine 在自己的 scope 里
运行的通用形式。

## 在另一个 process 中等待

如果需要 child scope，但当前 process 应该继续运行，可以把这两种形状组合起来：

```ts
import { branch, spawn, wait } from "@shajara/host/primitives";

function* saveWithoutWaitingHere() {
  const saveFuture = yield* spawn(function* saveProfileEntry() {
    return yield* branch(function* saveProfileScope() {
      return "saved";
    });
  });

  const status = "saving";
  // "saved"
  const result = yield* wait(saveFuture);

  return { result, status };
}
```

当前 process 启动 `saveProfileEntry`，并拿到 `saveFuture`。为 `saveProfileEntry` 创建的
process 会等待 `saveProfileScope`；调用方可以继续运行，直到来到这个等待点。

这些 API 的返回形状会保持这个区分：在当前 scope 中启动 process 的 API，会返回这段
工作的 future；打开 child scope 的 API，会在调用它的 process 里等待这个 scope，然后返回值。
