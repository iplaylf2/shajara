---
title: Channel
description: 在 shajara 并发边界内传递连续值，并从 JavaScript callback 接收值。
---

当工作需要交接一串值时，future 的单次结果不够用。channel 提供一条由 scope 拥有的
消息路径，把发送方和接收方分开，让不同 routine 可以按容量和等待规则重复交接值。

## 在 routine 之间传递值

`channel(...)` 会返回一个 receiver 和一个 sender。receiver 传给 `receive(...)`，
sender 传给 `send(...)`。

```ts
import { channel, receive, send, spawn } from "@shajara/host/primitives";

function* queueBatches() {
  const [receiver, sender] = yield* channel<string, never>(1);

  yield* spawn(function* writeBatches() {
    const first = yield* receive(receiver); // "draft"
    const second = yield* receive(receiver); // "publish"

    writeBatch(first);
    writeBatch(second);
  });

  yield* send(sender, "draft");
  yield* send(sender, "publish");
}
```

这里的交接点是 receiver 和 sender。`spawn(...)` 在同一个 scope 里启动消费方，当前
routine 只需要持有 sender，把值交给它。

`send(...)` 会等到 channel 接受值。`receive(...)` 会等到值可用。已送达的值遵循
FIFO，并且每个值只送达一次。

## 选择容量

容量决定接收方到来之前，`send(...)` 可以在什么时候继续。

- `0` 创建 rendezvous 传递：发送和接收直接同步。
- 有限正数创建有界缓冲区，可以保存对应数量的值。
- `Infinity` 创建无界缓冲区。

当生产方应该感受到消费方的背压时，使用有界容量。当任意一侧都不应独自越过交接点时，
使用 rendezvous 容量。只有当保留所有排队值是可接受的，才使用无界容量。

## 试探一次而不等待

当 routine 只想检查当前 channel 状态，而不阻塞当前 process 时，使用 `trySend(...)`
和 `tryReceive(...)`。

```ts
import { channel, tryReceive, trySend } from "@shajara/host/primitives";

function* inspectBatchQueue() {
  const [receiver, sender] = yield* channel<string, never>(1);

  const empty = yield* tryReceive(receiver); // [false]
  const acceptedDraft = yield* trySend(sender, "draft"); // true
  const acceptedPublish = yield* trySend(sender, "publish"); // false
  const next = yield* tryReceive(receiver); // [true, "draft"]

  return { acceptedDraft, acceptedPublish, empty, next };
}
```

如果接受这个值需要等待，`trySend(...)` 返回 `false`。如果当前没有值可取，
`tryReceive(...)` 返回 `[false]`。

## 关闭或撤销

channel 会通过显式 close 或拥有它的 scope 撤销进入终态。`close(...)` 接受任一端点，
并用一个显式 outcome 关闭 channel。

```ts
import { ChannelError } from "@shajara/host";
import { channel, close, receive } from "@shajara/host/primitives";

function* readClosedQueue() {
  const [receiver, sender] = yield* channel<string, "complete">(0);

  yield* close(sender, "complete");

  try {
    yield* receive(receiver);
  } catch (error) {
    if (error instanceof ChannelError) {
      return error.detail; // 已关闭的 condition，outcome 是 "complete"。
    }

    throw error;
  }
}
```

调用 `channel(...)` 的 scope 拥有这个 channel。如果这个 scope 收敛时 channel 仍然
open，shajara 会撤销它，并唤醒阻塞中的发送方或接收方。`send(...)`、`receive(...)`、
`trySend(...)` 和 `tryReceive(...)` 观察到已关闭或已撤销的 channel 时，会抛出
`ChannelError`。

## 从 callback 接收值

当值来自普通 JavaScript 边界，例如 callback 或事件处理器，并且需要进入 shajara 并发
边界时，使用 `feed(...)`。receiver 留在 routine 代码中；返回的函数放在注册 callback
的位置使用。

```ts
import { feed } from "@shajara/host";
import { receive } from "@shajara/host/primitives";

function* takeTwoUploads() {
  const { receiver, trySend } = yield* feed<File, never>(Infinity);

  registerUploadHandler((file) => {
    trySend(file);
  });

  const first = yield* receive(receiver);
  const second = yield* receive(receiver);

  return [first, second];
}
```

`feed(...)` 在当前 scope 中创建 channel。routine 代码消费 receiver，callback 代码可以
从这个 JavaScript 边界调用 `trySend(...)` 或 `close(...)`。
