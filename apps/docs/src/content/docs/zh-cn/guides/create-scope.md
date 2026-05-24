---
title: createScope() 的长期边界
description: 在应用入口打开长期 scope，让回调启动的 routine 有共同归属。
---

有些 shajara 工作不是由另一段 routine 启动的，而是由应用入口收到的事件触发：HTTP
服务收到请求，worker 收到消息，UI shell 收到事件。这个入口通常比单次回调
活得更久，因此需要一个可以承接这些 routine 的长期 scope。

`createScope()` 用来在普通应用代码中打开这个边界。外部回调从它启动 routine；入口退出
时，它收拢仍属于自己的工作。

## 在入口处打开 scope

下面的 Hono 服务在启动流程中创建 `serviceScope`。收到请求后，route handler 从这个
scope 启动请求 routine；收到 shutdown signal 后，顶层流程离开等待，`await using`
释放 HTTP server 和 shajara scope。

```ts
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { CanceledError, createScope, until } from "@shajara/host";

try {
  await using serviceScope = createScope();

  const app = new Hono();

  app.get("/reports/:id", (c) =>
    serviceScope.run(function* handleReportRequest() {
      const reportId = c.req.param("id");
      const response = yield* until(() => fetch(`https://reports.internal/reports/${reportId}`));
      const report = yield* until(() => response.json());

      return c.json(report);
    }),
  );

  await using _server = serve({ fetch: app.fetch, port: 3000 });

  const shutdown = Promise.withResolvers<void>();
  process.once("SIGINT", shutdown.resolve);
  process.once("SIGTERM", shutdown.resolve);

  await Promise.race([shutdown.promise, serviceScope.closed]);
} catch (error) {
  if (!(error instanceof CanceledError)) {
    console.error(error);
    process.exitCode = 1;
  }
}
```

`serviceScope` 位于启动流程，而不是 handler 内部。每次 handler 被调用时，都会回到这个
长期 scope。

## 从外部回调启动 routine

`createScope()` 返回的 scope 可以在 routine 外部调用 `run(...)`。route handler 把这个
Promise 返回给 Hono；shajara 则通过同一次 `run(...)` 观察 `handleReportRequest` 的
结果。

```ts
app.get("/reports/:id", (c) =>
  serviceScope.run(function* handleReportRequest() {
    const reportId = c.req.param("id");
    const response = yield* until(() => fetch(`https://reports.internal/reports/${reportId}`));
    const report = yield* until(() => response.json());

    return c.json(report);
  }),
);
```

这次请求工作属于 `serviceScope`。routine 正常返回时，handler 拿到的 Promise 会 resolve
为 `c.json(report)`。如果 routine 让非取消异常逃出，这个 Promise 通常会 reject 为
`ScopeError`，同一个失败也会关闭 `serviceScope`。

当错误只应该影响当前请求时，在 routine 内部把它处理成 HTTP response。让错误逃出
routine，表示这个失败属于拥有它的长期 scope。

## 让 scope 跟随入口

`serviceScope` 和 HTTP server 位于同一个顶层 `try` block。这个 scope 不随单次请求
创建或销毁；顶层流程还在等待时，它保持打开。

```ts
try {
  await using serviceScope = createScope();

  const app = new Hono();

  app.get("/reports/:id", (c) =>
    serviceScope.run(function* handleReportRequest() {
      /* ... */
    }),
  );

  await using _server = serve({ fetch: app.fetch, port: 3000 });

  /* ... */
}
```

`await using` 让 scope 的释放跟随入口生命周期。服务离开 block 时，HTTP server 停止接收
新请求，`serviceScope` 也开始关闭；仍属于它的请求工作会跟着这个 scope 收敛。

## 等待 scope 的关闭结果

`createScope()` 暴露 `closed` Promise，让应用代码可以观察长期 scope 的收敛结果。服务
运行期间，顶层流程既等待 shutdown signal，也等待 `serviceScope.closed`。

```ts
const shutdown = Promise.withResolvers<void>();
process.once("SIGINT", shutdown.resolve);
process.once("SIGTERM", shutdown.resolve);

await Promise.race([shutdown.promise, serviceScope.closed]);
```

收到 shutdown signal 后，顶层代码离开 `try` block，`await using` 释放 HTTP server 和
`serviceScope`。如果 `serviceScope` 因未捕获的请求失败，或其他属于这个长期边界的失败
而先关闭，`Promise.race(...)` 会把关闭结果交给外层 `catch`。

```ts
} catch (error) {
  if (!(error instanceof CanceledError)) {
    console.error(error);
    process.exitCode = 1;
  }
}
```

预期的取消会以 `CanceledError` 进入 `catch`；除此之外的错误仍然应该暴露。
