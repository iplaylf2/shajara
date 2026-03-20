# 实现状态

当前阶段：**Build — Make it work**。

---

## 当前焦点

当前要收口的问题是：把 `RuntimeScope` 的运行时接线收回到自身构造契约，并为后续 executor 调度接入保留稳定的 `runtime zone` 承载位。

这条收口现在采用 `runtime zone` 作为工作概念：

- 根 scope 在 `create(...)` 时显式承接 zone
- child scope 在 `branch(...)` 时默认继承父 zone，也允许显式换入新 zone
- `RuntimeScope` 现在通过 `ZoneBuilder` 在自身构造过程中产出并持有 zone
- `RuntimeProcess` 现在通过 `RuntimeCellBuilder` 在自身构造过程中产出并持有 cell

---

## 当前偏差

当前实现与这一焦点之间的偏差主要还有一条：

1. `runtime zone` 与 `runtime cell` 的构造关系已经收口，但 `RuntimeProcess` 的大部分运行协议仍明确停留在 `notImplemented(...)`。  
   证据：`packages/kernel/src/interpreter/runtime-process.ts`

2. `Interpreter.observeRunnable(listener)` 目前仍只消费 root zone 里 `trackProcess(process)` 所暴露的 runnable 视图；更完整的 zone/cell 协作语义尚未展开。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`

---

## 下一步

1. 继续补齐 `RuntimeProcess` 的运行协议，决定哪些状态推进应恢复为真实实现，哪些仍保持 `notImplemented(...)`。
2. 明确 `trackProcess(process)` 在 zone/cell 间的长期语义边界。
3. 继续实现 executor，并在那时确定它与 zone / `observeRunnable` 的最终协作方式。

---

## 验证

建议验证命令：

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```
