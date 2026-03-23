# 实现状态

当前阶段：**Build — Make it work**。

---

## 当前焦点

当前要收口的问题有两条：

1. 把运行时状态相关的定义收回到 `RuntimeScope` / `RuntimeProcess` 自身，并去掉 `cell` / `builder` 这类过度设计的中介层。
2. 先把 `RuntimeScope` 的正常收敛表达清楚，把 `halt` / closing / future settlement 这些复杂路径继续冻结在占位边界后面。

其中第一条当前已经明确的方向是：

- `RuntimeProcess` 不需要再引入 `cell` 作为运行态承载位
- `RuntimeProcess` 与 `RuntimeScope` 各自暴露自己的 `observe(...)`
- `zone` 保留为 `RuntimeScope` 的结构承接位，而不是通过 builder 深度嵌入 process/runtime 主链路
- `Interpreter.observeRunnable(listener)` 目前仍通过 root zone 的 `trackProcess(process)` 提供最小 runnable 观察面

第二条目前已经确认的阶段性事实是：

- `RuntimeScope` 通过监听直系 Process 与子 Scope 的状态变化表达正常收敛
- 正常收敛当前只关心入口 process、当前 scope 内的 structural process，以及子 scope 的关闭状态
- `RuntimeScope` 当前设计基线改为 `running / closing / canceling / failing / completed / failed / canceled`；`isClosed` 只表达“已终态”
- `RuntimeProcess` 当前设计基线改为 `running / waiting / completed / failed / canceled`
- `halt` 不再由 `RuntimeScope.halt(process, failure)` 承接；解释器应直接调用 `RuntimeProcess.halt(failure)`，其余收敛通过观察事件推进
- `RuntimeScope` 的事件表已经明确分成 child scope 与 owned process 两条观察链；`closing` 的目标终态是 `completed`，`canceling` 的目标终态是 `canceled`，`failing` 的目标终态是 `failed`
- child scope 的失败传播判定在 child 进入 `failing` 时按 child 自身的 `failureMode` 完成；child 的 `failed` 负责交付失败结果
- `RuntimeScope` 已按 structural process、detached process 与 `children` 分开承接容器语义；成员终态后的移除逻辑仍停留在观察回调后的 `notImplemented(...)`
- scope failure draft 当前已恢复为 `interpreter/` 内部建模；`failures/scope-failed.ts` 只保留 `FailureShape` 契约，以避免重新形成环依赖
- `ScopeFailure` 当前已改成 `cause + suppressedFailures` 形状；`cause` 是 `process | scope` 的 sum type，分别记录触发 failing 的 process 或 child scope 及其 failure
- `RuntimeScope` 当前在 process failed 与 child scope 传播 failing 时初始化 failure draft，并在后续成员失败时把它们作为 `suppressedFailures` 追加收集
- 当前实现中，scope 起因的 draft 只先锚定 child scope ref；对应 failure 要等 child `failed` 后再读取
- `defer` 的设计基线已改为 process 级注册：cleanup 由 `RuntimeProcess` 持有；具体触发时序回到 `semantics.md` 单源定义
- `RuntimeProcess` 的公开承接面当前仍保留 `defer(cleanup)`、`halt(failure)`、`cancel()` 与 `takeCleanups()`；但语义基线已经转向 `cancel()` 由当前 scope 承接，process 的 `canceled` 作为级联结果出现
- `halt`、closing 级联、`ScopeRef.exitFuture`、派生 future 的 settle，以及 closing failure 收束仍未恢复；当前继续留待后续实现

---

## 当前偏差

当前实现与这两条焦点之间的偏差主要还有五条：

1. 当前实现已经移除了 `RuntimeCellBuilder` / `RuntimeCell` 这条旧路径，但 `RuntimeProcess` 的大部分运行协议仍明确停留在 `notImplemented(...)`。  
   证据：`packages/kernel/src/interpreter/runtime-process.ts`

2. `Interpreter.observeRunnable(listener)` 目前仍通过 root zone 的 `trackProcess(process)` 获得 runnable 视图；它还没有与 `RuntimeProcess.observe(...)` / `RuntimeScope.observe(...)` 建立新的统一关系。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`

3. `RuntimeScope` 的事件分派口径已经明确，但“尝试进入完成/失败/取消收敛”的具体判定条件、成员移除时机、`ScopeRef.exitFuture` 的 settle、派生 future 的强制收敛，以及 closing failure 的归并都还没有重新建立。  
   证据：`packages/kernel/src/interpreter/runtime-scope.ts`

4. failure draft 与 `scope-failed` 的基本接线已经恢复，但 closing failure 的最终收束时机、`ScopeRef.exitFuture` 的 settle，以及 suppressed failure 的完整边界仍未补齐。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`

---

## 下一步

1. 继续补齐 `RuntimeProcess` 与 `RuntimeScope` 的运行协议，明确 `halt(failure)` 如何使 process 落到 `failed`，以及 `cancel()` 如何由当前 scope 承接并让级联成员落到 `canceled`。
2. 明确 `RuntimeProcess.observe(...)`、`RuntimeScope.observe(...)` 与 `Interpreter.observeRunnable(...)` 之间的长期边界，避免不同层重复承接同一类事件语义。
3. 继续补全 `RuntimeScope` 的收敛判定，明确“尝试进入完成/失败/取消收敛”各自依赖哪些成员状态，以及何时补回 scope `exitFuture`、派生 future 与 failure 收束的接线。
4. 按新的 `defer` 语义补齐 `RuntimeProcess` 的承接面，明确 `takeCleanups()` 的一次性交接时机，以及 scope cancel 与 process canceled 之间的状态关系。
5. 如果后续仍需要 scope 关闭时机的 cleanup，单独命名并单独定义，不再复用 `defer`。
6. 重新定义 closing failure 的收集语义与 failure draft 的最终接线位置，但不要重新引入 `onClosing` / `HaltHandler` 这类干预点，也不要再把它当成状态驱动主通道。
7. 继续实现 executor，并在那时确定它如何消费这些观察面；`zone` 继续只作为结构组织层来协作。

---

## 验证

建议验证命令：

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```
