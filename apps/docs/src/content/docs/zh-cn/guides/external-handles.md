---
title: 外部句柄
description: 让 request、callback future 和 resource 绑定到拥有它们的 scope。
---

外部 API 常常会给你一个句柄，而这个句柄会活得比创建它的那一行代码更久。在 shajara
里，应该在负责约束它生命周期的 scope 里创建这个句柄。

## 让 Promise 工作随 scope 中止

`abortSignal(...)` 会创建一个绑定到当前 scope 的 `AbortSignal`。当外部工作应该跟着这个
scope 停止时，把它传给 `fetch(...)` 这类 Promise API。

```ts
import { abortSignal, until } from "@shajara/host";
import { branch } from "@shajara/host/primitives";

function* loadProfilePanel(userId: string) {
  const profileRequest = yield* branch(function* panelScope() {
    const signal = yield* abortSignal();

    const request = fetch(`/api/users/${userId}/profile`, { signal }).then(
      () => "profile loaded",
      (error) => {
        if (signal.aborted) {
          return "profile request stopped";
        }

        throw error;
      },
    );
    // panel 在 request 仍然 pending 时关闭。
    return request;
  });

  // 返回 "profile request stopped"。
  return yield* until(() => profileRequest);
}
```

`panelScope` 创建了 request，也创建了可以停止它的 signal。当这个 scope 收敛时，signal
会 abort。调用方仍然可以拿到这个 Promise，但这次 request 的生命周期由 `panelScope`
决定。

这个位置很重要：`yield* abortSignal()` 运行在 `panelScope` 内部，所以 signal 会登记在
拥有 request 的同一个 scope 上。

## 取消 callback future

`completer(...)` 会创建一个 future，让 JavaScript callback 可以完成它。如果当前 scope
关闭时这个 future 仍然 pending，它会在更晚的 callback 到来之前被取消。

```ts
import { CanceledError, completer } from "@shajara/host";
import { branch, wait } from "@shajara/host/primitives";

function* waitForFileChoice() {
  const selectedFile = yield* branch(function* fileDialogScope() {
    const { future, resolve } = yield* completer<File>();

    registerFileChoice(resolve);
    // dialog 先关闭，registerFileChoice 还没调用 resolve。
    return future;
  });

  try {
    const file = yield* wait(selectedFile);

    return file.name;
  } catch (error) {
    if (!(error instanceof CanceledError)) {
      throw error;
    }

    return "file dialog closed";
  }
}
```

`registerFileChoice(resolve)` 代表 file input callback。如果 dialog 在这个 callback
到来前关闭，`fileDialogScope` 会收敛并取消 pending future。`wait(selectedFile)` 观察到
的是取消，而不是继续等待一个已经属于关闭 scope 的 callback。

这里的 `yield* completer<File>()` 会在 `fileDialogScope` 中创建并登记这个 future，所以
dialog scope 关闭后，更晚到来的 callback 不再拥有一个 live 的 shajara 结果。

## 释放 resource provider

有些外部资源需要 setup、ready value，以及所属 scope 关闭时的 cleanup。`resource(...)`
直接提供这个形状：provider 打开外部资源，在它可用时调用 `provide(value)`，然后继续
附着在当前 scope 上，直到这个 scope 释放它。

```ts
import { resource } from "@shajara/host";
import { branch, wait } from "@shajara/host/primitives";

function* watchRoomUpdates(roomId: string) {
  yield* branch(function* updatesScope() {
    const updatesSocket = yield* resource<WebSocket>(function* openUpdates(provide) {
      const socket = openRoomSocket(roomId);
      console.log("connected");

      try {
        yield* provide(socket);
      } finally {
        socket.close();
        console.log("closed");
      }
    });

    const socket = yield* wait(updatesSocket);

    socket.send(JSON.stringify({ kind: "subscribe" }));
    console.log("subscribed");
    // room updates view 在这里关闭。
  });
}

// 输出：
// connected
// subscribed
// closed
```

调用 `provide(socket)` 会完成 `updatesSocket`，所以 `updatesScope` 可以发送
subscription。`provide(...)` 之后，provider 会继续停在同一个 scope 下面。

`updatesScope` 结束后，child scope 会通过正常的 generator unwinding 释放 provider。
`finally` block 会在 room updates view 关闭之后关闭 socket。

## 选择拥有句柄的 scope

在哪个 scope 里创建句柄，取决于哪段 scope 决定外部工作什么时候停止。绑定到 panel
的 request 应该在 panel scope 里创建。绑定到 dialog 的 callback future 应该在 dialog
scope 里创建。应该随 view 关闭的 socket 应该在 view scope 里创建。

调用方仍然可以从这个 scope 拿到 Promise、future 或 ready value，但这不会转移归属。
创建它的 scope 收敛时，signal 会 abort，pending future 会被取消，provider cleanup
会运行。
