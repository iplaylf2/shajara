---
title: Guard 边界与失败恢复
description: 在 guard 边界恢复失败的 child scope，并把恢复结果交回 resumable 的等待点。
---

有些 child scope 的失败不应该立刻由等待它的 routine 决定结果，而是应该先交给外层
边界。recovery 让边界决定这个等待点接下来看到什么：替代值、抛出的错误，或者原样
交回的 scope exit error。

## 返回恢复值

把 `resumable(...)` 放在可能需要恢复的 child scope 上。把 `guard(...)` 放在拥有恢复
策略的 routine 外层。

```ts
import type { RiteCoroutine } from "@shajara/host";
import { guard, resumable } from "@shajara/host/primitives";

function* scanPhotosWithRecovery() {
  // "manual approval"
  return yield* resumable(function* scanPhotos(): RiteCoroutine<string> {
    throw new Error("scanner offline");
  });
}

function* publishListing() {
  return yield* guard(
    function* reviewListing() {
      const approval = yield* scanPhotosWithRecovery();

      return `publish with ${approval}`;
    },
    function* approveManually() {
      // 恢复值："manual approval"。
      return [true, "manual approval"];
    },
  );
}
```

`scanPhotos` 在 `resumable(...)` 创建的 child scope 中失败。handler 返回的
`[true, value]` 会通过 `scanPhotosWithRecovery()` 返回，所以 `reviewListing` 会从这个
等待点继续。

恢复值属于 `resumable(...)`。`guard(...)` 的返回值仍然是 guarded entry 的结果。

## 委托给祖先边界

recovery handler 可以返回 `[false]`，拒绝处理当前恢复请求。这个请求会继续交给下一个
可见的 guard 边界。

```ts
import type { RiteCoroutine, ScopeExitError } from "@shajara/host";
import { CanceledError } from "@shajara/host";
import { guard, resumable } from "@shajara/host/primitives";

function* scanPhotosWithRecovery() {
  // "manual approval"
  return yield* resumable(function* scanPhotos(): RiteCoroutine<string> {
    throw new Error("scanner offline");
  });
}

function* publishWithManualFallback() {
  return yield* guard(
    function* reviewListing() {
      return yield* scanPhotosWithRecovery();
    },
    function* handleCancellationOnly(error: ScopeExitError) {
      if (error instanceof CanceledError) {
        return [true, "scan canceled"];
      }

      // 继续交给祖先 guard。
      return [false];
    },
  );
}

function* publishWithPolicy() {
  return yield* guard(
    function* publishWithManualPolicy() {
      return yield* publishWithManualFallback();
    },
    function* approveManually() {
      // 恢复值："manual approval"。
      return [true, "manual approval"];
    },
  );
}
```

内层 recovery handler 只在本地处理 child cancellation。对于 `scanPhotos` 产生的 scope
failure，它返回 `[false]`，所以外层 guard 会收到同一个 scope exit error，并提供
`"manual approval"`。如果可见的 recovery handler 都返回 `[false]`，原来的 scope exit
error 会原样交回 `resumable(...)` 等待点。

## 抛出恢复错误

recovery handler 不一定要把恢复表达成成功值。它也可以抛出错误，让等待中的
`resumable(...)` 在原来的等待点抛出这个错误。

```ts
import type { RiteCoroutine } from "@shajara/host";
import { guard, resumable } from "@shajara/host/primitives";

function* scanPhotosWithRecovery() {
  // 抛出 Error("manual approval unavailable")。
  return yield* resumable(function* scanPhotos(): RiteCoroutine<string> {
    throw new Error("scanner offline");
  });
}

function* publishListing() {
  return yield* guard(
    function* reviewListing() {
      const approval = yield* scanPhotosWithRecovery();

      return `publish with ${approval}`;
    },
    function* requireManualApproval(): RiteCoroutine<never> {
      // 恢复结果：抛出 Error。
      throw new Error("manual approval unavailable");
    },
  );
}
```

`requireManualApproval` 没有把恢复表示成 `[true, value]`，而是把它表示成抛出的
`Error`。两种结果都会回到同一个 `resumable(...)` 等待点：`[true, value]` 让等待点返回
`value`，抛错让等待点抛出这个 `Error`。

Recovery 用在 child scope 已经退出、等待它的调用方应该得到一个替代结果的场景。这个
替代结果可以是返回值，也可以是被抛出的错误。
