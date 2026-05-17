---
title: Scope 拥有的外部句柄
description: 让外部异步句柄留在拥有这段工作的 scope 生命周期内。
---

routine 可以通过浏览器或应用 API 启动外部工作。代表这段工作的句柄，比如 request、
callback future 或 resource，应该留在需要它的 scope 里。scope 打开时，外部工作可以
继续；scope 关闭时，shajara 就有足够的结构去 abort、取消或清理那段工作。

## 让 fetch 工作随 scope abort

`abortSignal(...)` 会创建一个绑定到当前 scope 的 `AbortSignal`。当外部工作应该跟着
这个 scope 停止时，把它传给 `fetch(...)` 这类 Promise API。

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

    // 用户在 request 完成前关闭了这个 panel。
    return request;
  });

  const status = yield* until(() => profileRequest);

  // status 是 "profile request stopped"。
  return status;
}
```

panel 打开期间，`panelScope` 拥有这次 profile request。从 `panelScope` 返回，
表示 panel 在 fetch promise 仍然 pending 时关闭了。

child scope 收敛时会 abort 这个 signal。仍然 pending 的 request 会沿着 abort 路径
reject，外层 routine 观察到 `"profile request stopped"`。

## 取消超出 scope 的 future

`completer(...)` 会创建一个 future，让 JavaScript callback 可以完成它。如果 scope
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

`registerFileChoice(resolve)` 代表 file input callback。用户选择文件时，它会调用
`resolve(file)`。这个 future 属于 `fileDialogScope`。

如果 dialog 在这个 callback 到来前关闭，scope 会收敛并取消 pending future。调用方
仍然可以拿到这个 future，但 `wait(selectedFile)` 会观察到它已经被取消，并返回
`"file dialog closed"`。

## 明确控制资源生命周期

有些外部资源不只是需要一个取消 signal，或者一个 pending future。它们需要先 setup，
再把 ready value 交给 routine 使用，最后在所属 scope 关闭时 cleanup。

`resource(...)` 直接提供这个形状。provider 打开外部资源，在它可用时调用
`provide(value)`，然后继续附着在当前 scope 上，直到这个 scope 释放它。

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

provider 先打开 room updates socket。调用 `provide(socket)` 会完成 `updatesSocket`，
所以 `updatesScope` 可以发送 subscription。`provide(...)` 之后，provider 不会结束；
它会继续停在同一个 scope 下面。

`updatesScope` 结束后，child scope 会通过正常的 generator unwinding 释放 provider。
这会运行 `finally` block，在 room updates view 关闭之后关闭 socket，所以 `"closed"`
最后输出。

## 选择拥有句柄的 scope

在哪个 scope 里创建句柄，取决于哪段 scope 决定外部工作什么时候停止。绑定到 panel
的 request 应该在 panel scope 里创建。绑定到 dialog 的 callback future 应该在 dialog
scope 里创建。应该随 view 关闭的 socket 应该在 view scope 里创建。

调用方仍然可以从这个 scope 拿到 promise、future 或 ready value，但这不会转移归属。
创建它的 scope 收敛时，signal 会 abort，pending future 会被取消，provider cleanup
会运行。
