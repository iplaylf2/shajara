# @shajara/host

`@shajara/host` 是 shajara 面向应用代码的包，也是默认入口。

在 shajara 里，结构化并发不是一组分散的异步 helper，而是一种把并发任务组织进同一棵运行树的编排方式。`@shajara/host` 负责把这套编排方式接成可以直接写进 JavaScript 应用代码的接口。

## 安装

```sh
npm install @shajara/host
```

## 这个包在 shajara 中承担的角色

这个包把结构化并发编排接成 generator 风格的 JavaScript API。

它负责把运行入口、宿主操作、并发原语与错误映射组织成一组可以直接用于应用代码的接口。

## 这个包提供什么

- 运行入口：`run`、`createScope`
- 宿主操作：`action`、`sleep`、`until`
- 并发与生命周期原语：`@shajara/host/primitives`
- JavaScript 错误对象与底层失败结果之间的边界映射

## 示例

```ts
import { run, sleep } from "@shajara/host";
import { spawn, wait } from "@shajara/host/primitives";

// `run(...)` 启动一段结构化并发编排。
const result = await run(function* loadPage() {
  const header = yield* spawn(function* loadHeader() {
    yield* sleep(50);
    return "header";
  });

  const sidebar = yield* spawn(function* loadSidebar() {
    yield* sleep(80);
    return "sidebar";
  });

  return {
    header: yield* wait(header),
    sidebar: yield* wait(sidebar),
  };
});

console.log(result);
// { header: "header", sidebar: "sidebar" }
```

这段代码展示的，不只是“两个异步步骤可以并发跑起来”，而是并发关系本身就写在流程里：分支从哪里启动、结果在哪里汇合，都和主流程处在同一段代码中。

## 何时使用这个包

当你准备直接在应用代码中使用 shajara 时，使用这个包。

它适合这样的情况：

- 并发任务需要有清晰归属
- 完成、失败和取消需要沿同一棵并发树收敛
- 并发逻辑希望保持步骤化，而不是散落在不同异步接口之间

## 公开入口

- `@shajara/host`
- `@shajara/host/primitives`
