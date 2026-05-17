---
title: Scope 的结构化收敛
description: 理解 child scope 在返回或失败之前会等待哪些工作。
---

从 child scope 返回，不等于从一个 function 返回。child scope 可能还拥有其他 process，
调用方要等这些 process 结束后，才会拿到这个值。

scope 收敛时，会先收拢它拥有的工作，再把最终结果交给等待它的 process。

## 等待整个 child scope

`branch(...)` 会打开 child scope，并等待这个 scope 收敛。传入的 routine 是这个
scope 的 entry process，但它不是 scope 里唯一可能存在的工作。

```ts
import { sleep } from "@shajara/host";
import { branch, spawn } from "@shajara/host/primitives";

function* saveProfile() {
  const result = yield* branch(function* saveProfileScope() {
    yield* spawn(function* writeAuditTrail() {
      yield* sleep(30);

      return "audit written";
    });

    yield* sleep(5);

    return "profile saved";
  });

  // result 是 "profile saved"，并且 writeAuditTrail 已经结束。
  return result;
}
```

`saveProfileScope` 很快返回 `"profile saved"`，但 child scope 还拥有
`writeAuditTrail` process。`branch(...)` 只有在这个 process 也结束之后，才把
entry process 的结果交回 `saveProfile`。

这就是结构化收敛：调用方不需要手动追踪 child scope 里的每个 process。scope 会把
自己拥有的结构收拢到一个结果边界。

## 失败引起级联取消

在 host API 里，等待 scope 会把 scope 结果带回普通 JavaScript 控制流。成功时返回值；
失败时抛出 `ScopeError`。

```ts
import { ScopeError, sleep } from "@shajara/host";
import { branch, spawn } from "@shajara/host/primitives";

function* launchCampaign() {
  try {
    return yield* branch(function* campaignScope() {
      yield* spawn(function* sendEmailBatch() {
        yield* sleep(5);

        console.log("email failed");
        throw new Error("email provider failed");
      });

      yield* spawn(function* refreshAudience() {
        yield* sleep(30);

        console.log("audience refreshed");
        return "audience refreshed";
      });

      yield* sleep(30);

      console.log("campaign launched");
      return "campaign launched";
    });
  } catch (error) {
    if (!(error instanceof ScopeError)) {
      throw error;
    }

    console.log("campaign failed");
    return "campaign failed";
  }
}

// 输出：
// email failed
// campaign failed
```

`sendEmailBatch` 抛出错误后，`campaignScope` 进入失败收敛。这个失败属于 child
scope，所以 `refreshAudience` 和 entry process 都不会走到自己的成功输出。

调用方看到的是 `ScopeError`，因为它观察到的是整个 child scope 的失败结果，而不只是
某个 process 抛出的原始错误。

## 在传给 `spawn` 的 routine 内处理局部失败

`spawn(...)` 返回 future，但它启动的 process 仍然属于当前 scope。如果这个 process
失败，当前 scope 也会进入失败收敛。

当一段由 `spawn(...)` 启动的工作可以失败，但这个失败不应该取消同一个 scope 里的其他
工作时，在传给 `spawn(...)` 的 routine 内部处理它，并把失败转换成普通结果。

```ts
import { sleep } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";

function* launchCampaign() {
  const emailStatusFuture = yield* spawn(function* sendEmailBatch() {
    try {
      yield* sleep(5);

      throw new Error("email provider failed");
    } catch {
      console.log("email failed");

      return "email failed";
    }
  });

  yield* sleep(30);

  console.log("campaign still running");
  const emailStatus = yield* wait(emailStatusFuture);

  return { emailStatus };
}

// 输出：
// email failed
// campaign still running
```

这里的 `sendEmailBatch` 没有把错误留到 process 边界之外。它自己决定失败结果，
`emailStatusFuture` 最后等待到的是普通值，当前 scope 里的后续流程可以继续运行。

如果等到外层 `wait(emailStatusFuture)` 再 `try...catch`，这个 process 的失败已经先让
当前 scope 进入失败收敛。
