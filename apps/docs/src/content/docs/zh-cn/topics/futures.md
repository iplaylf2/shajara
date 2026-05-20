---
title: Future
description: 创建单次结果句柄，从 routine 中完成它，并选择等待结果的位置。
---

有些结果不应该由当前 routine 立刻返回，而是由同一个 scope 里的另一段工作稍后给出。
future 负责这种单次结果：创建一个结果槽，把完成权交给生产方，并让其他 routine 在需要
的位置观察它。

## 创建结果槽

`future(...)` 会返回同一个结果的两个句柄。一个用来观察结果，另一个用来完成结果。

```ts
import { future, settle, wait } from "@shajara/host/primitives";

function* prepareSummary() {
  const [summary, publishSummary] = yield* future<string>();

  yield* settle(publishSummary, "ready");

  const text = yield* wait(summary);

  return `summary ${text}`;
}
```

`summary` 用来观察结果。`publishSummary` 用来完成结果。

调用 `future(...)` 的 scope 拥有这个结果槽。如果这个 scope 收敛时 future 仍然
pending，shajara 会取消这个 future，而不是让等待方继续挂在一个已经不会产出的结果上。

## 试探一次而不等待

当 routine 想检查当前状态但不等待时，使用 `poll(...)`。它只问一次 future，然后立刻
返回。

```ts
import type { RiteFuture } from "@shajara/host";
import { poll } from "@shajara/host/primitives";

function* readDisplayNameNow(displayName: RiteFuture<string>) {
  const [hasDisplayName, currentDisplayName] = yield* poll(displayName);

  return hasDisplayName ? currentDisplayName : "Loading";
}
```

如果这个时刻 future 仍然 pending，`poll(displayName)` 返回 `[false]`。如果 future
已经有成功值，它返回 `[true, value]`。

## 完成失败结果

当一个 future 应该以 JavaScript failure 完成，而不是得到成功值时，使用
`settleError(...)`。

```ts
import { future, settleError, wait } from "@shajara/host/primitives";

function* readRequiredTitle() {
  const [title, rejectTitle] = yield* future<string>();

  yield* settleError(rejectTitle, new Error("missing title"));

  // 这里会抛出，因为这个 future 已经被完成为失败结果。
  return yield* wait(title);
}
```

routine 代码会通过同一个 future 句柄观察到这个失败结果。

## 从 callback 完成 future

当 shajara future 需要从原生 JavaScript 边界完成时，例如从 callback 中完成，使用
`completer(...)`。

```ts
import { completer } from "@shajara/host";
import { wait } from "@shajara/host/primitives";

function* waitForFileChoice() {
  const { future: selectedFile, resolve } = yield* completer<File>();

  registerFileChoice(resolve);

  return yield* wait(selectedFile);
}
```

`completer(...)` 会把 future 留在 shajara 并发边界内，并返回一组可从 JavaScript 边界
调用的完成函数。callback 代码调用 `resolve(...)`，routine 代码通过返回的 future 观察
结果。
