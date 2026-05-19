---
title: HTTP 服务中的 Scope
description: 用 createScope() 作为 HTTP 路由工作的长期归属边界。
---

HTTP 服务启动后会持续接收 request。它通常需要一个比单次 route handler 更长的归属边界：
服务运行期间，路由工作从这个边界启动；服务关闭时，这个边界也被一起关闭。
`createScope()` 可以放在 server 模块里，让路由工作归属于一个由 shajara 管理的 scope。

## 在服务模块里创建 scope

下面的服务模块用 Hono 提供 HTTP 路由，同时打开一个长期存在的 `serverScope`。route
handler 从这个 scope 启动请求工作。shutdown signal 让顶层代码离开 `try` block，随后由
`await using` 释放 HTTP server 和 shajara scope。

```ts
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { CanceledError, createScope, until } from "@shajara/host";

try {
  await using serverScope = createScope();

  const app = new Hono();

  app.get("/reports/:id", (c) =>
    serverScope.run(function* handleReportRequest() {
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

  await Promise.race([shutdown.promise, serverScope.closed]);
} catch (error) {
  if (!(error instanceof CanceledError)) {
    console.error(error);
    process.exitCode = 1;
  }
}
```

## `createScope()` 放在哪里

`serverScope` 在服务模块顶层创建，并用 `await using` 管理。它不是每次 request 创建的
临时对象；它代表这个服务进程仍然打开的工作边界。

HTTP app 和 server 都在同一个 block 内创建。只要顶层代码还在等待 shutdown signal，
`serverScope` 就保持打开。

## `scope.run(...)` 启动路由工作

route handler 直接返回 `serverScope.run(...)` 的 Promise。routine 是这个 GET handler
的主体：读取路由参数、加载 report，并返回 HTTP response。

`serverScope.run(...)` 不只是把 routine 暴露成 Promise。它也把这次路由工作纳入长期
scope。这次工作遵循结构化并发的收敛语义：如果 routine 让非取消异常逃出，这个
Promise 会 reject，通常表现为 `ScopeError`，同一个失败也会关闭 `serverScope`。这里
没有可以被遗忘的 request 局部失败；它归属的 scope 也会观察到同一个失败。如果
`serverScope` 在请求工作仍然运行时关闭，仍属于它的路由工作会跟着这个 scope 收敛。

## `using` 管理关闭

收到 shutdown signal 后，`shutdown.promise` 完成，顶层代码离开 `try` block。这个 block
里的两个 `await using` 绑定都会被释放。

HTTP server 也是一个 `await using` 资源。离开 block 时，它的 async disposable 会调用
`server.close()`，让 HTTP 层停止接收新 request，并等待 server 完成关闭。`serverScope`
的 async disposable 会调用 `scope.cancel()`；shutdown 中的正常取消会在这个由 shajara
管理的 scope 关闭后 resolve。非取消的关闭失败仍然会 reject。

服务运行期间，`Promise.race(...)` 同时等待 shutdown signal 和 `serverScope.closed`。
如果这个 scope 因为未捕获的路由失败，或其他属于这个长期边界的失败而先关闭，race 会把
这个关闭结果交给外层 `catch`。正常关闭在这里表现为 `CanceledError`，`catch` 会把它当作
预期结果处理；除此之外的错误仍然应该暴露。
