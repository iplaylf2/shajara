---
title: HTTP 服务中的 Scope
description: 用 createScope() 让 HTTP 路由工作归属于服务模块里的 scope，并在 shutdown 时让这个 scope 收敛。
---

HTTP 服务启动后会持续接收 request。它通常需要一个比单次 route handler 更长的归属边界：
服务运行期间，路由工作从这个边界启动；服务关闭时，这个边界也被一起关闭。
`createScope()` 可以放在 server 模块里，让路由工作归属于一个由 shajara 管理的 scope。

## 在服务模块里创建 scope

下面的服务模块用 Hono 提供 HTTP 路由，同时在模块顶层打开一个长期存在的
`serverScope`。route handler 从这个 scope 启动请求工作；shutdown signal 让顶层代码
离开 `try` block，随后由 `await using` 释放 `serverScope` 和 HTTP server。

```ts
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { CanceledError, createScope, until } from "@shajara/host";

try {
  await using serverScope = createScope();

  const app = new Hono();

  app.get("/reports/:id", async (c) => {
    const reportId = c.req.param("id");

    const report = await serverScope.run(function* handleReportRequest() {
      const response = yield* until(() => fetch(`https://reports.internal/reports/${reportId}`));

      return yield* until(() => response.json());
    });

    return c.json(report);
  });

  await using _server = serve({ fetch: app.fetch, port: 3000 });

  const shutdown = Promise.withResolvers<void>();
  process.once("SIGINT", shutdown.resolve);
  process.once("SIGTERM", shutdown.resolve);

  await Promise.race([shutdown.promise, serverScope.closed]);
} catch (error) {
  if (!(error instanceof CanceledError)) {
    console.error(error);
    process.exitCode = 1;
  }
}
```

## 这个 scope 的生命周期

### `createScope()` 放在哪里

`serverScope` 在服务模块顶层创建，并用 `await using` 管理。它不是每次 request 创建的
临时对象；它代表这个服务进程仍然打开的工作边界。

HTTP app 和 server 都在这个 block 内创建。只要顶层代码还在等待 shutdown signal，
`serverScope` 就保持打开。

### `scope.run(...)` 启动路由工作

route handler 通过 `serverScope.run(...)` 启动一次请求工作，并等待这次工作的 Promise。
HTTP response 仍然由 route handler 返回。

这个 Promise 把这次路由工作的结果带回 handler：成功时返回 `report`；如果 routine 抛出
非取消异常，这个 Promise 会 reject，通常表现为 `ScopeError`。这个失败只属于这一次
`serverScope.run(...)` 启动的工作，不会自动关闭外层的 `serverScope`。route handler
可以把 rejection 交给 HTTP 框架的错误处理，也可以捕获后返回这个接口需要的 HTTP
response。

如果 `serverScope` 在请求工作仍然运行时关闭，仍属于它的路由工作会跟着这个 scope 收敛。

### `using` 管理关闭

收到 shutdown signal 后，`shutdown.promise` 完成，顶层代码离开 `try` block。这个 block
里的两个 `await using` 绑定都会被释放。

HTTP server 也是一个 `await using` 资源。离开 block 时，它的 async disposable 会调用
`server.close()`，让 HTTP 层停止接收新 request，并等待 server 完成关闭。
`serverScope` 的 async disposable 会调用 `scope.cancel()`，关闭这个由 shajara 管理的
scope。

`Promise.race(...)` 同时等待 shutdown signal 和 `serverScope.closed`。如果 scope 先关闭，
它的关闭结果会按原样进入外层 `catch`。关闭一个正常运行的 scope 会以取消结果结束，
所以这段 shutdown 把 `CanceledError` 当作预期结果处理；除此之外的错误仍然应该暴露。
