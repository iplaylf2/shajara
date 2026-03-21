# 实现状态

当前阶段：**Build — Make it work**。

---

## 当前焦点

当前要收口的问题有两条：

1. 把 `RuntimeScope` 的运行时接线收回到自身构造契约，并为后续 executor 调度接入保留稳定的 `runtime zone` 承载位。
2. 暂时冻结 `scope closing` 的实现表面，并把当前错误实现明确标记出来，为后续重构腾出稳定边界。

其中第一条继续采用 `runtime zone` 作为工作概念：

- 根 scope 在 `create(...)` 时显式承接 zone
- child scope 在 `branch(...)` 时默认继承父 zone，也允许显式换入新 zone
- `RuntimeScope` 现在通过 `ZoneBuilder` 在自身构造过程中产出并持有 zone
- `RuntimeProcess` 现在通过 `RuntimeCellBuilder` 在自身构造过程中产出并持有 cell

第二条目前已经确认的阶段性事实是：

- `halt` 先让触发者 Process 以原始 failure 失败
- `RuntimeScope` 连续级联整棵子树进入 `closing`
- closing 回卷与 `ScopeFailure` 收束的正确实现尚未恢复；当前应显式保留为 `notImplemented(...)`

---

## 当前偏差

当前实现与这两条焦点之间的偏差主要还有四条：

1. `runtime zone` 与 `runtime cell` 的构造关系已经收口，但 `RuntimeProcess` 的大部分运行协议仍明确停留在 `notImplemented(...)`。  
   证据：`packages/kernel/src/interpreter/runtime-process.ts`

2. `Interpreter.observeRunnable(listener)` 目前仍只消费 root zone 里 `trackProcess(process)` 所暴露的 runnable 视图；更完整的 zone/cell 协作语义尚未展开。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`

3. scope closing 当前只保留“进入 closing tree”的固定部分；closing worker 的回卷编排、failure 归并，以及 `ScopeRef.exitFuture` 的 settle 链路都还没有重新建立，目前这里应显式停留在 `notImplemented(...)`。  
   证据：`packages/kernel/src/interpreter/runtime-scope.ts`

4. `packages/kernel/src/interpreter/scope-closing.ts` 已不再承载旧的递归回卷实现；原先那条依赖 `HaltHandler` / `onClosing` 的错误设计已经从解释器主链路中移除。  
   证据：`packages/kernel/src/interpreter/scope-closing.ts`

5. closing failure 的收集与 `scope-failed` 的构造位置仍需要在后续重构中重新定义；在那之前，不应再通过解释器扩展点或 handler 注入去干预关闭路径上的 failure。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`

---

## 下一步

1. 继续补齐 `RuntimeProcess` 的运行协议，决定哪些状态推进应恢复为真实实现，哪些仍保持 `notImplemented(...)`。
2. 明确 `trackProcess(process)` 在 zone/cell 间的长期语义边界。
3. 重新设计 closing 回卷编排，并把 closing worker 的退出结果接到 scope `exitFuture` 的 settle 路径，然后消除当前临时保留的 `notImplemented(...)`。
4. 重新建立 `packages/kernel/src/interpreter/scope-closing.ts` 的职责边界，只在语义重新收束后再恢复其实现。
5. 重新定义 closing failure 的收集语义与 `ScopeFailureBuilder` 的最终接线位置，但不要重新引入 `onClosing` / `HaltHandler` 这类干预点。
6. 继续实现 executor，并在那时确定它与 zone / `observeRunnable` 的最终协作方式。

---

## 验证

建议验证命令：

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```
