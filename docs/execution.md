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
- `RuntimeScope` 已按 structural process、detached process 与 `children` 分开承接容器语义；成员终态后会在观察回调中从对应容器移除
- scope failure draft 当前已恢复为 `interpreter/` 内部建模；`failures/scope-failed.ts` 只保留 `FailureShape` 契约，以避免重新形成环依赖
- `ScopeFailure` 当前已改成 `cause + suppressedFailures` 形状；`cause` 是 `process | scope` 的 sum type，分别记录触发 failing 的 process 或 child scope 及其 failure
- `RuntimeScope` 当前在 process failed 与 child scope 传播 failing 时初始化 failure draft，并在后续成员失败时把它们作为 `suppressedFailures` 追加收集
- 当前实现中，scope 起因的 draft 只先锚定 child scope ref；对应 failure 要等 child `failed` 后再读取
- `RuntimeScope` 的内部生命周期状态当前已收敛成判别联合：`failing` 携带 draft，`failed` 携带最终 failure；公开 `status` 只暴露该内部状态的 tag
- `defer` 的设计基线已改为 process 级注册：用户语义仍是注册 cleanup ritual；但 runtime 内部的长期方向改为由 `RuntimeProcess` 持有 cleanup task，并由 `RuntimeScope` 在 process 关闭路径上触发
- cleanup 触发权与 process 出生权的长期边界已经收口：`RuntimeScope` 负责决定何时触发 cleanup task，`Interpreter` 继续保留统一的 process 出生口，并负责 `RuntimeIndex.registerProcess(...)` 等登记链路
- `RuntimeScope` 当前阶段性把取消路径命名收为 `cancelManaged` / `isQuiet` / `isIdle`，并在 `canceling` / `failing` 时先对 managed processes / children 做 snapshot，再基于 snapshot 执行取消，避免遍历过程中被新成员扰动
- `RuntimeScope.cancel()` 当前在 `failing` 上重入 `enterFailing(existingDraft)`，以继续复用成员取消而不改写 scope 自身的失败终态目标；其他状态仍沿既有 `enterCanceling()` 路径推进，并由既有 `unreachable` 分支兜底非法组合
- `RuntimeScope` 当前已补回 `ScopeRef.exitFuture` 的 `completed / canceled / failed` settlement；派生 future 改为在 scope 确认最终收敛时统一以 canceled settle，并在此时结束本 scope 的追踪
- `RuntimeScope` 当前把 `unreachable` 分支作为状态机门控本体，而不是额外叠加“调用失败”式 fallback；`Branch/Spawn` 在非终态下仍允许发生
- `RuntimeScope` 当前把 membership 的 `add/delete` 聚合回 `registerChildScope / registerOwnedProcess / createFuture` 这些注册函数自身；`driveByChildScope / driveByOwnedProcess` 只承接状态机推进，不再负责容器移除
- `RuntimeScope` 当前在 `notifyObservers()` 完成本轮通知后，若 scope 已进入终态则清空 observer 集合，以避免上层闭包继续滞留在已关闭的下层对象上
- 设计基线当前已进一步明确：cleanup 不应再通过 `Interpreter.registerCleanups(...)` 这种 process observer 的事后副作用触发；它应由 `RuntimeScope` 在 `completed / canceled / failed` 各自的关闭路径里显式触发，但实际的 cleanup process 出生仍复用 `Interpreter` 的统一登记入口
- 设计文档与执行文档的边界重新收回：`semantics.md` / `interpreter.md` 只保留规范性语义；“当前通过 `unreachable` crash 暴露非法状态组合”这类实现口径只记录在本文件

---

## 当前偏差

当前实现与这两条焦点之间的偏差主要还有五条：

1. 当前实现已经移除了 `RuntimeCellBuilder` / `RuntimeCell` 这条旧路径，但 `RuntimeProcess` 的大部分运行协议仍明确停留在 `notImplemented(...)`。  
   证据：`packages/kernel/src/interpreter/runtime-process.ts`

2. `Interpreter.observeRunnable(listener)` 目前仍通过 root zone 的 `trackProcess(process)` 获得 runnable 视图；它还没有与 `RuntimeProcess.observe(...)` / `RuntimeScope.observe(...)` 建立新的统一关系。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`

3. `RuntimeScope` 的事件分派口径已经明确，并且当前阶段性实现已经补回 `ScopeRef.exitFuture` settlement、派生 future 在最终收敛时统一以 canceled settle 并结束追踪、cancel 时的 snapshot 编排，以及 membership add/delete 在注册函数中的局部闭合；但当前代码里的 cleanup 激活仍停留在 `Interpreter.registerCleanups(...)` 的 observer 路径，尚未切到“scope 触发 task、interpreter 统一出生并登记”的新设计。  
   证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`

4. failure draft 与 `scope-failed` 的基本接线已经恢复，但 closing failure 的最终收束时机、cleanup task 的具体 API 形状，以及 `RuntimeScope` 在 `failed / completed / canceled` 各条路径中触发 cleanup 的落点仍未实现。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`

---

## 下一步

1. 继续补齐 `RuntimeProcess` 与 `RuntimeScope` 的运行协议，明确 `halt(failure)` 如何使 process 落到 `failed`，以及 `cancel()` 与 `takeCleanups()` 的最终承接语义。
2. 把 cleanup 新设计落到代码：移除 `Interpreter.registerCleanups(...)` 这条 observer 触发路径，改为由 `RuntimeScope` 在 process 关闭编排里显式触发 cleanup task，同时继续复用 `Interpreter` 的统一 process birth / `registerProcess(...)` 协议。
3. 明确 `RuntimeProcess.observe(...)`、`RuntimeScope.observe(...)` 与 `Interpreter.observeRunnable(...)` 之间的长期边界，避免不同层重复承接同一类事件语义。
4. 继续补全 `RuntimeScope` 的收敛判定，明确“尝试进入完成/失败/取消收敛”各自依赖哪些成员状态，以及派生 future 与 failure 收束的最终接线。
5. 重新定义 closing failure 的收集语义与 failure draft 的最终接线位置，并把 cleanup task 在 `enterFailing(...)` 前后各自允许的触发点写成实现内约束；不要重新引入 `onClosing` / `HaltHandler` 这类干预点，也不要再把它当成状态驱动主通道。
6. 继续实现 executor，并在那时确定它如何消费这些观察面；`zone` 继续只作为结构组织层来协作。

---

## 验证

建议验证命令：

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```
