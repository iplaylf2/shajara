---
title: scope 自治
description: 让 child scope 子树按局部推进与关闭策略收敛。
---

长循环在完成一小段同步工作后，也可以主动让出一次推进机会。routine 仍然保持连续的控制流，
当前 scheduler 则可以先推进队列里的其他 process。

`cede()` 就是这个让步点。它不创建新的工作，只把下一步交回当前 scheduler。
如果 `autonomy(...)` 为 child scope 子树设置了 scheduler，同样的让步点会回到这套局部 scheduler。

## 让步点交回当前 scheduler

下面的 routine 每写入一条记录，就留下一个调度边界。

```ts
import { cede } from "@shajara/host/primitives";

function* rebuildIndex(records: readonly string[]) {
  for (const record of records) {
    // ... 同步写入一条索引记录。
    yield* cede();
  }

  return "indexed";
}
```

每条记录的写入仍是普通 JavaScript 同步工作。到达 `cede()` 时，当前 process 把下一步交回
scheduler。默认 scheduler 可以先推进队列里的其他 process，再回到 `rebuildIndex` 的下一条记录。

因此，长循环可以保留连续的 routine 形状，只在记录之间留下调度机会。

## scheduler 分配 process 的下一步

`autonomy(...)` 在调用方当前 scope 下创建 child scope；这棵子树里的可推进 process 会交给它的
scheduler。`assign(process)` 里的 `process` 是 scheduler 看到的运行时身份。routine 内部需要把
局部信息接到这个身份上时，可以用 `self()` 读取当前 process。

```ts
import type { ProcessRef } from "@shajara/host";
import { autonomy, cede, self } from "@shajara/host/primitives";

function* rebuildSearchIndex(records: readonly string[]) {
  const groupByProcess = new Map<ProcessRef<unknown>, "foreground" | "background">();

  return yield* autonomy(
    function* indexSubtree() {
      const { process } = yield* self();

      groupByProcess.set(process, "background");

      for (const record of records) {
        // ... 同步写入一条索引记录。
        yield* cede();
      }

      return "indexed";
    },
    {
      scheduler: {
        assign(process) {
          const group = groupByProcess.get(process) ?? "foreground";

          // ... 根据 process 和 group 选择 processor，并返回给 shajara。
        },
      },
    },
  );
}
```

`self()` 和 `assign(process)` 读到的是同一个 process 引用，但读的位置不同。入口 process 第一次交给
scheduler 时，routine 还没有运行到 `self()`；未登记的 process 可以先走默认分配。登记之后，
`cede()` 产生的后续让步会带着同一个 process 回到 scheduler，`assign(process)` 就能读取已登记的
局部信息。

## reaper 接收关闭中的 scope

自治子树也可以带 reaper。reaper 只处理关闭路径上的 scope 引用：当 shajara 再次检查仍在关闭中的
scope 时，reaper 正常返回表示继续等待；抛出错误会让正在被判断的 scope 失败。

```ts
import type { ScopeRef } from "@shajara/host";
import { autonomy, self } from "@shajara/host/primitives";

function* runPreview() {
  const remainingChecksByScope = new Map<ScopeRef<unknown>, number>();

  return yield* autonomy(
    function* previewEntry() {
      const { scope } = yield* self();

      remainingChecksByScope.set(scope, 2);

      // ... 运行预览工作，清理逻辑也留在这个 child scope 里。
    },
    {
      reaper: function* failAfterCloseBudget(closingScope) {
        const remainingChecks = remainingChecksByScope.get(closingScope);

        if (remainingChecks === undefined) {
          return;
        }

        if (remainingChecks > 0) {
          remainingChecksByScope.set(closingScope, remainingChecks - 1);
          return;
        }

        throw new Error("preview scope did not close");
      },
    },
  );
}
```

`previewEntry` 运行在 `autonomy(...)` 创建的 child scope 里。它通过 `self()` 登记自己的 scope 引用；
如果这个 scope 进入关闭路径，reaper 收到的 `closingScope` 就会读到同一条登记。

登记里还有次数时，reaper 消耗一次并继续等待；次数用尽后抛出错误，让正在被判断的 scope
以这个错误失败。
