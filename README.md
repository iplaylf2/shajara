# shajara

shajara 提供一种不同于“到处散落的 `async`/`await`、定时器与回调”的并发编排方式。

它把一段并发工作组织成有边界的树：启动有归属，等待有位置，失败与取消沿结构收敛，而不是在调用链之外漂移。这里的结构化并发，指的就是这种“并发任务属于某个边界，并随边界一起完成、失败或取消”的组织方式。

对使用者来说，入口就是 `@shajara/host`。它把这套编排方式接成 generator 风格的 JavaScript API，让并发关系直接落在代码结构里。

这个库受 [effection](https://github.com/thefrontside/effection) 启发。

## 安装

```sh
npm install @shajara/host
```

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

## 为什么使用 shajara

JavaScript 原本也能完成这些事，但当并发分支变多、失败要汇总、取消要有边界时，关系很容易散落到不同的异步接口之间。shajara 关注的不是替代这些基础能力，而是把它们组织成更稳定的并发编排。

它特别适合这样的情况：

- 并发任务需要有清晰归属，而不是各自悬空
- 完成、失败和取消都需要沿同一棵并发树收敛
- 并发逻辑需要保持步骤化和可读性，而不是拆散在多个异步对象之间
- 原生异步能力已经足够可用，但整体并发结构仍然难以表达和维护
