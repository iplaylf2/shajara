---
title: Scope 退出
description: 理解 scope 退出是 scope 拥有的工作收敛后对外报告的结果。
---

scope 树说明 shajara 如何放置 child scope 和 process。scope 退出则是一个 scope 拥有的工作
变成一个可观察结果的位置。

一个 child scope 里面可能有 entry process、通过 `spawn(...)` 创建的 process、child scope、
future 和 channel。这些内部对象仍然可以各自 settle，或到达自己的 terminal state。当 routine
代码等待这个 scope 时，它不是在读取每个内部结果，而是在读取这个 scope 在自己拥有的工作收敛后报告的
结果。

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

`writeSearchIndex` 是抛出原始错误的 process。`publishListing` 等待的不是这个 process
future，而是 `listingScope`。因此，可见的结果是这个 child scope 的失败退出。这个
`ScopeError` 的相关部分可以读成：

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
它报告 cancellation。有用的区别不在于列出所有 outcome，而在于读出当前被观察的边界。

因此，scope 退出不同于等待 future 或使用 channel endpoint。等待 future 读取的是这个 future
的 settlement。向 channel 发送或从 channel 接收，读取的是这个 channel 的 state。观察 scope
读取的是这个边界本身；这个边界决定未完成工作和它拥有的对象如何结束。
