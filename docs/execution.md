# 实现状态

当前阶段：**Build — Make it work**。

---

## 当前焦点

当前要收口的问题是：把 `RuntimeScope` 的运行时接线收回到自身构造契约，并为后续 executor 调度接入保留稳定的 `runtime zone` 承载位。

这条收口现在采用 `runtime zone` 作为工作概念：

- 根 scope 在 `create(...)` 时显式承接 zone
- child scope 在 `branch(...)` 时默认继承父 zone，也允许显式换入新 zone
- 当前阶段先只登记和传递 zone，暂不在 `RuntimeScope` 里正式消费它

---

## 当前偏差

当前实现与这一焦点之间的偏差主要还有一条：

1. `runtime zone` 目前只进入了 `RuntimeScope` 的构造契约与分支继承路径，尚未正式接入 runnable 发布、wait 恢复或 closing 治理。  
   证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`

2. `Interpreter.observeRunnable(listener)` 目前仍是 root 级订阅接口；它保留了接入点，但还没有与 `RuntimeScope` 内部的 zone 行为真正贯通。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`

---

## 下一步

1. 明确 `RuntimeZone` 的职责命名与边界，决定它到底承接 runnable 发布、调度通知还是别的治理语义。
2. 在语义明确后，再把 `RuntimeScope` 中对应运行路径逐步接回 zone。
3. 继续实现 executor，并在那时确定它与 zone / `observeRunnable` 的最终协作方式。

---

## 验证

建议验证命令：

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```
