---
title: 句柄与 Scope 归属
description: 理解 shajara 如何决定拥有一个句柄的 scope。
---

scope 树说明 shajara 如何放置 child scope 和 process。对于可以被传递的句柄值，这条放置
规则同样适用：创建句柄的调用运行在哪个 scope，句柄背后的运行时对象就由哪个 scope 拥有。

创建之后，句柄值可以移动。它可以从 child scope 返回，可以传给另一段 routine，也可以被 callback
代码保留。移动这个值，不会移动它的 owner。

## 创建动作决定 owner

`future(...)` 会在当前 scope 中创建一个结果槽。如果 child scope 创建 future 后只返回观察
句柄，调用方拿到的是指向结果槽的句柄；这个结果槽仍然属于那个 child scope。

```ts
import { branch, future, wait } from "@shajara/host/primitives";

function* readPanelTitle() {
  const panelTitle = yield* branch(function* panelScope() {
    const [title] = yield* future<string>();

    return title;
  });

  // 抛出 CanceledError，因为 panelScope 收敛时 title 仍然 pending。
  return yield* wait(panelTitle);
}
```

owner 在 `future(...)` 调用发生时确定。它运行在 `panelScope` 内部，所以 `panelScope`
拥有这个结果槽。返回 `title` 会让调用方拿到观察句柄，但不会把结果槽移动到调用方的 scope。

当 `panelScope` 收敛时，如果这个 future 仍然 pending，它会被 canceled。后续
`wait(panelTitle)` 会抛出 `CanceledError`，观察到的是创建它的 scope 所决定的最终状态。

## 在生命周期所属的位置创建

如果结果槽的生命周期应该由调用方 scope 决定，就在调用方创建 future，再把用于完成 future
的 handle 传进 child scope。

```ts
import { branch, future, settle, wait } from "@shajara/host/primitives";

function* readPanelTitle() {
  const [panelTitle, publishPanelTitle] = yield* future<string>();

  yield* branch(function* panelScope() {
    yield* settle(publishPanelTitle, "Settings");
  });

  // "Settings"
  return yield* wait(panelTitle);
}
```

child scope 仍然拥有 `panelScope` 内部的工作。它不拥有 `panelTitle`，因为 `future(...)` 在
child scope 创建之前就已经运行在调用方 scope 里。child scope 可以通过
`publishPanelTitle` 完成这个 future，但能够完成它不等于拥有它。

把创建调用当作放置决策来读：在哪个 scope 中创建句柄，取决于哪个 scope 的收敛应该决定这个句柄的
最终状态。

## Endpoint 不会移动 channel

channel endpoint 也可以跨过 scope 边界。channel 仍然属于调用 `channel(...)` 的那个 scope。

```ts
import { branch, channel, send } from "@shajara/host/primitives";

function* sendAfterQueueScopeCloses() {
  const queueSender = yield* branch(function* queueScope() {
    const [, sender] = yield* channel<string, never>(1);

    return sender;
  });

  // 抛出 ChannelError，因为 queueScope 收敛时撤销了仍然 open 的 channel。
  yield* send(queueSender, "draft");
}
```

`branch(...)` 返回后，`queueSender` 仍然是一个可持有的 JavaScript 值，但它背后的 channel
属于 `queueScope`。`queueScope` 收敛时，仍然 open 的 channel 会被 revoked。后续
`send(...)` 会使用这个 endpoint，并抛出 `ChannelError`；它不会把 channel 挂到调用方
scope 上。

## 读取创建调用

判断 owner 时，先找创建运行时对象的调用：

- `future(...)` 和 `completer(...)` 会在当前 scope 中创建 future。
- `channel(...)` 和 `feed(...)` 会在当前 scope 中创建 channel。
- `abortSignal(...)` 会把 signal 注册到当前 scope。
- `resource(...)` 会启动 provider work，并让它挂在当前 scope 上直到 release。

使用句柄的调用不会选择新的 owner。`wait(...)`、`poll(...)`、`settle(...)`、`send(...)`、
`receive(...)`、`close(...)` 和 `promisify(...)` 作用于已有的 future 或 channel。把
`AbortSignal` 传给外部 API，或保留 `resource(...)` 提供的值，也是在使用已经绑定到某个
scope 的关系。owner 仍然是创建句柄时所在的 scope。
