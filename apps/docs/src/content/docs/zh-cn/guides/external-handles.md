---
title: 外部句柄
description: 在控制生命周期的 scope 中创建外部句柄。
---

外部 API 常会返回比创建语句活得更久的句柄。在 shajara 里，每个句柄都应创建在控制其
生命周期的 scope 中。

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
    // panel 在请求仍然 pending 时关闭。
    return request;
  });

  // "profile request stopped"
  return yield* until(() => profileRequest);
}
```

`panelScope` 创建了请求，也创建了可以停止它的 signal。当这个 scope 收敛时，signal
会 abort。调用方仍然可以拿到这个 Promise，但这次请求的生命周期由 `panelScope`
决定。

因为 `yield* abortSignal()` 运行在 `panelScope` 内部，signal 会登记在拥有请求的
同一个 scope 上。

## 让回调 future 留在 scope 内

`completer(...)` 会创建一个 future，让 JavaScript 回调可以完成它。如果当前 scope
关闭时这个 future 仍然 pending，shajara 会先让它收敛，避免更晚的回调再把结果写入已经
关闭的 scope 所拥有的 future。

```ts
import { completer } from "@shajara/host";
import { branch, wait } from "@shajara/host/primitives";

function* waitForFileChoice() {
  const selectedFile = yield* branch(function* fileDialogScope() {
    const { future, resolve } = yield* completer<File>();

    registerFileChoice(resolve);
    // dialog 先关闭，registerFileChoice 还没调用 resolve。
    return future;
  });

  // 抛出 UnfulfilledError，因为回调完成之前 fileDialogScope 已经关闭。
  const file = yield* wait(selectedFile);

  return file.name;
}
```

`registerFileChoice(resolve)` 代表文件选择回调。如果 dialog 在这个回调到来前关闭，
`fileDialogScope` 会收敛，pending future 会变成 unfulfilled。`wait(selectedFile)`
观察到的是这个状态，而不是继续等待一个已经属于关闭 scope 的回调。

`yield* completer<File>()` 会在 `fileDialogScope` 中创建并登记这个 future，所以 dialog
scope 关闭后，更晚到来的回调不能再完成这个 shajara future。

## 释放 resource provider

有些外部资源需要建立、就绪值，以及所属 scope 关闭时的清理。`resource(...)` 直接提供
这个形状：provider 打开外部资源，在它可用时调用 `provide(value)`，然后继续附着在
当前 scope 上，直到这个 scope 释放它。

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

调用 `provide(socket)` 会完成 `updatesSocket`，所以 `updatesScope` 可以发送订阅。
`provide(...)` 之后，provider 会继续停在同一个 scope 下面。

`updatesScope` 结束后，child scope 会释放这个 provider。`finally` block 会在 room
updates view 关闭之后关闭 socket。

## 选择拥有句柄的 scope

在哪个 scope 里创建句柄，取决于哪个 scope 决定外部工作什么时候停止。绑定到 panel
的请求应该在 panel scope 里创建。绑定到 dialog 的回调 future 应该在 dialog
scope 里创建。应该随 view 关闭的 socket 应该在 view scope 里创建。

调用方仍然可以从这个 scope 拿到 Promise、future 或就绪值，但这不会转移归属。创建它的
scope 仍然控制 signal、future 或 provider 清理。
