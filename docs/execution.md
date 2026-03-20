# 实现状态

当前阶段：**Build — Make it work**。

---

## 当前焦点

当前要收口的问题有两条：

1. 把 `RuntimeScope` 的运行时接线收回到自身构造契约，并为后续 executor 调度接入保留稳定的 `runtime zone` 承载位。
2. 让 `RuntimeScope` 承接 scope closing 的级联进入与回卷编排。

其中第一条继续采用 `runtime zone` 作为工作概念：

- 根 scope 在 `create(...)` 时显式承接 zone
- child scope 在 `branch(...)` 时默认继承父 zone，也允许显式换入新 zone
- `RuntimeScope` 现在通过 `ZoneBuilder` 在自身构造过程中产出并持有 zone
- `RuntimeProcess` 现在通过 `RuntimeCellBuilder` 在自身构造过程中产出并持有 cell

第二条目前已经形成的实现骨架是：

- `halt` 先让触发者 Process 以原始 failure 失败
- `RuntimeScope` 连续级联整棵子树进入 `closing`
- closing 回卷通过专用 worker 以叶到根方式运行 `onClosing(...)`
- closing 附加 failure 由单个 `ScopeFailureBuilder` 统一收集

---

## 当前偏差

当前实现与这两条焦点之间的偏差主要还有三条：

1. `runtime zone` 与 `runtime cell` 的构造关系已经收口，但 `RuntimeProcess` 的大部分运行协议仍明确停留在 `notImplemented(...)`。  
   证据：`packages/kernel/src/interpreter/runtime-process.ts`

2. `Interpreter.observeRunnable(listener)` 目前仍只消费 root zone 里 `trackProcess(process)` 所暴露的 runnable 视图；更完整的 zone/cell 协作语义尚未展开。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`

3. scope closing worker 目前已经能被 `spawn` 出来并完成回卷 failure 归并，但它的退出结果还没有自然接到 `ScopeRef.exitFuture` 的 settle 链路上。当前这里仍是显式保留的 `notImplemented(...)` 缺口。  
   证据：`packages/kernel/src/interpreter/runtime-scope.ts`

4. `scope-closing.ts` 与 `scope-failure-builder.ts` 这两个文件当前还没有完成专门 review；现阶段应把它们视为阶段性实现，而不是已经稳定定稿的 closing 设计。  
   证据：`packages/kernel/src/interpreter/scope-closing.ts`、`packages/kernel/src/interpreter/scope-failure-builder.ts`

---

## 下一步

1. 继续补齐 `RuntimeProcess` 的运行协议，决定哪些状态推进应恢复为真实实现，哪些仍保持 `notImplemented(...)`。
2. 明确 `trackProcess(process)` 在 zone/cell 间的长期语义边界。
3. 把 closing worker 的退出结果接到 scope `exitFuture` 的 settle 路径，并消除当前临时保留的 `notImplemented(...)`。
4. 专门 review `scope-closing.ts` 与 `scope-failure-builder.ts`，决定哪些结构应保留，哪些仍需继续收缩。
5. 继续实现 executor，并在那时确定它与 zone / `observeRunnable` 的最终协作方式。

---

## 验证

建议验证命令：

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```
