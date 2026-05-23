---
title: Scope 退出
description: 把 scope 退出读作 owned work 收敛后由边界报告的结果。
---

scope 既是 scope 树里的放置节点，也是结果边界。scope 退出是这个边界在自己拥有的工作收敛后
报告的结果。

child scope 也是一棵子树的根。它里面可能有 entry process、通过 `spawn(...)` 创建的 process，
也可能有更深一层的 child scope。这棵子树里的工作仍然可以各自有局部结果。当 routine 代码等待这个
scope 时，它等待的是这棵子树里的工作收敛，然后读取这个 scope 报告的结果。

## 退出属于边界

```ts
import { sleep } from "@shajara/host";
import { branch, spawn } from "@shajara/host/primitives";

function* publishListing() {
  return yield* branch(function* listingScope() {
    yield* spawn(function* writeSearchIndex() {
      yield* sleep(5);

      throw new Error("index failed");
    });

    yield* sleep(20);

    return "published";
  }); // 抛出 ScopeError。
}
```

`writeSearchIndex` 是 `listingScope` 里的 process，它抛出了原始错误。`publishListing`
等待的不是这个 process future，而是 `branch(...)` 创建出的 `listingScope` 这个边界。因此，
可见的结果是这个 scope 的失败退出。这个 `ScopeError` 的相关部分可以读成：

```ts
{
  kind: "scope",
  cause: {
    kind: "external",
    raw: new Error("index failed"),
  },
}
```

原始错误没有消失；它仍然附着在 cause 里面，但调用方看到的边界是 scope。

正常退出时，这条读法也一样：scope 自己拥有的工作全部收敛后，scope 报告 entry value。取消时，
同一个边界会在这棵子树里的工作被取消后报告 cancellation。有用的区别不在于列出所有 outcome，而在于
读出当前被观察的边界。

因此，scope 退出不同于等待 future 或使用 channel endpoint。等待 future 读取的是这个 future
的 settlement。向 channel 发送或从 channel 接收，读取的是这个 channel 的 state。观察 scope
读取的是这个边界本身：等待的 routine 收到的是 scope exit，而不是其中每个结果。
