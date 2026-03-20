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
- `ScopeFailureBuilder` 仍应被视为 halt 发起路径上的单实例聚合器；只有发起者对应的 `unwindScopeClosing(...)` 才应该构造 `scope-failed`
- `packages/kernel/src/interpreter/scope-closing.ts` 的当前编排实现仍然是错误的，不应视为 closing 设计已经稳定

---

## 当前偏差

当前实现与这两条焦点之间的偏差主要还有四条：

1. `runtime zone` 与 `runtime cell` 的构造关系已经收口，但 `RuntimeProcess` 的大部分运行协议仍明确停留在 `notImplemented(...)`。  
   证据：`packages/kernel/src/interpreter/runtime-process.ts`

2. `Interpreter.observeRunnable(listener)` 目前仍只消费 root zone 里 `trackProcess(process)` 所暴露的 runnable 视图；更完整的 zone/cell 协作语义尚未展开。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`

3. scope closing worker 目前已经能被 `spawn` 出来并完成回卷 failure 归并，但它的退出结果还没有自然接到 `ScopeRef.exitFuture` 的 settle 链路上。当前这里仍是显式保留的 `notImplemented(...)` 缺口。  
   证据：`packages/kernel/src/interpreter/runtime-scope.ts`

4. `packages/kernel/src/interpreter/scope-closing.ts` 当前虽然已经形成递归回卷的代码形状，但其 `HaltHandler` failure 语义和 `scope-failed` 的构造位置仍然错误；现阶段应把它视为待重构实现，而不是可继续增量修补的基础。  
   证据：`packages/kernel/src/interpreter/scope-closing.ts`

5. `HaltHandler` 的 failed 结果目前还没有被重新收束清楚。按当前 review 结论，它在 closing 路径上只应面向两类 failure：触发 halt 的 `cause`，以及级联关闭中的 `terminated`；这条语义边界仍需要在后续重构中重新编排。  
   证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/scope-closing.ts`

---

## 下一步

1. 继续补齐 `RuntimeProcess` 的运行协议，决定哪些状态推进应恢复为真实实现，哪些仍保持 `notImplemented(...)`。
2. 明确 `trackProcess(process)` 在 zone/cell 间的长期语义边界。
3. 把 closing worker 的退出结果接到 scope `exitFuture` 的 settle 路径，并消除当前临时保留的 `notImplemented(...)`。
4. 重构 `packages/kernel/src/interpreter/scope-closing.ts`，重新建立 closing ritual 的编排纪律，并停止在当前错误实现上继续追加局部修补。
5. 重新定义 `HaltHandler` 在 closing 回卷中的 failure 语义，只保留 `cause` 与 `terminated` 两条路径，并据此决定 `ScopeFailureBuilder` 的最终接线位置。
6. 继续实现 executor，并在那时确定它与 zone / `observeRunnable` 的最终协作方式。

---

## 验证

建议验证命令：

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```
