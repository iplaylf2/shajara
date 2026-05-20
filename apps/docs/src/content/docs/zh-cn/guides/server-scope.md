---
title: HTTP 服务中的 Scope
description: 用 createScope() 作为 HTTP 路由工作的长期归属边界。
---

HTTP 服务启动后会持续接收 request。单次 route handler 结束时，服务进程还在运行，所以
请求工作通常需要一个比 handler 更长的归属边界。`createScope()` 可以放在 server 模块的
启动流程里：handler 从这个 scope 启动 routine；服务退出时，这个 scope 也负责收拢仍在
运行的请求工作。

## 在服务启动流程中创建 scope

下面的 Hono 服务在顶层流程里打开一个长期存在的 `serverScope`。handler 使用它运行请求
routine；shutdown signal 结束顶层等待，随后 `await using` 释放 HTTP server 和 shajara
scope。

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

## 让 scope 跟随服务生命周期

`serverScope` 和 HTTP server 位于同一个顶层 `try` block。handler 注册在这个 block 里，
每次 request 到达 handler 时，都从同一个 `serverScope` 启动工作。

```ts
try {
  await using serverScope = createScope();

  const app = new Hono();

  app.get("/reports/:id", (c) =>
    serverScope.run(function* handleReportRequest() {
      /* ... */
    }),
  );

  await using _server = serve({ fetch: app.fetch, port: 3000 });

  /* ... */
}
```

这个 scope 不随单次 request 创建或销毁。顶层流程还在等待时，它保持打开；服务离开
block 时，`await using` 会释放它。`serverScope` 的生命周期跟随 HTTP server，而不是
某一次 handler 调用。

## 从 handler 进入 routine

handler 返回 `serverScope.run(...)` 的 Promise。Hono 通过这个 Promise 取得 HTTP
response，shajara 则把 `handleReportRequest` 作为属于 `serverScope` 的工作运行。

```ts
app.get("/reports/:id", (c) =>
  serverScope.run(function* handleReportRequest() {
    const reportId = c.req.param("id");
    const response = yield* until(() => fetch(`https://reports.internal/reports/${reportId}`));
    const report = yield* until(() => response.json());

    return c.json(report);
  }),
);
```

routine 正常返回时，handler 拿到的 Promise 会 resolve 为 `c.json(report)`。如果 routine
让非取消异常逃出，这个 Promise 通常会 reject 为 `ScopeError`，同一个失败也会关闭
`serverScope`。

当某个错误只应该影响当前 request 时，在 routine 内部把它处理成 HTTP response。让错误
逃出 routine，表示这个失败属于服务级 scope。

## 退出时等待 scope 收敛

服务运行期间，顶层流程等待 shutdown signal，也等待 `serverScope.closed`。

```ts
const shutdown = Promise.withResolvers<void>();
process.once("SIGINT", shutdown.resolve);
process.once("SIGTERM", shutdown.resolve);

await Promise.race([shutdown.promise, serverScope.closed]);
```

收到 shutdown signal 后，`shutdown.promise` 完成，顶层代码离开 `try` block。随后
`await using` 释放 HTTP server 和 `serverScope`：HTTP server 停止接收新 request，并等待
server 完成关闭；`serverScope` 被取消，仍属于它的路由工作会跟着这个 scope 收敛。

如果 `serverScope` 因未捕获的路由失败，或其他属于这个长期边界的失败而先关闭，
`Promise.race(...)` 会把关闭结果交给外层 `catch`。

```ts
} catch (error) {
  if (!(error instanceof CanceledError)) {
    console.error(error);
    process.exitCode = 1;
  }
}
```

正常关闭在这里表现为 `CanceledError`，`catch` 会把它当作预期结果处理；除此之外的错误
仍然应该暴露。
