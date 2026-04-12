# @shajara/kernel

`@shajara/kernel` 是 shajara 的底层包。

在 shajara 里，结构化并发既是一种编排方式，也是一套需要被明确定义和推进的基础模型。`@shajara/kernel` 负责承载这套模型本身。

## 安装

```sh
npm install @shajara/kernel
```

## 这个包在 shajara 中承担的角色

这个包承载基础语义、失败模型、原语与执行环境。

它负责定义“这套并发模型是什么”以及“执行环境如何推进它”，而不是直接组织面向应用代码的宿主 API。

## 这个包提供什么

- 基础契约：`Wisp`、`Ritual`、`ScopeRef`、`ProcessRef`、`FutureKey`
- 失败模型：`Failure` 及各类失败构造
- kernel primitives
- 执行环境：`createExecutor`、`ExecutionScopeRef`、`LaunchHandle`、`Pacer`
- 补充入口：`@shajara/kernel/sigils`、`@shajara/kernel/utils`

这些能力共同定义了 shajara 的基础计算承载、结构化并发边界、失败收敛规则，以及执行环境如何驱动它们。

## 示例

```ts
import { cede, createExecutor } from "@shajara/kernel";

const executor = createExecutor({
  beginSlice: () => ({
    shouldYield: () => false,
  }),
  continueLater(work) {
    queueMicrotask(work);
    return () => {};
  },
});

const launched = executor.launch(executor.scope, cede);
```

这个例子展示的是 `@shajara/kernel` 的使用位置：先提供执行环境，再把一段底层 `Ritual` 接入其中推进。

## 何时使用这个包

当你需要直接操作 shajara 的底层语义与执行环境时，使用这个包。

它更适合这样的工作：

- 构建新的运行时或宿主适配层
- 直接消费 `Wisp`、`Ritual` 或 executor 能力
- 围绕基础语义做实验性集成

## 公开入口

- `@shajara/kernel`
- `@shajara/kernel/sigils`
- `@shajara/kernel/utils`
