# Interpreter 设计

本文档定义 `Interpreter` 的职责、边界与接口语义。

`Interpreter` 处理的是一个封闭解释环境中的 Wisp 演算。它围绕一次入口 `ritual` 建立自己的根 Scope 与根 Process，并在外部驱动下逐步推进该环境的收敛。

---

## 1. 主题

`Interpreter` 提供的是一个可步进的封闭解释环境。

它承接三类事情：

- 维护解释环境中的 Scope、Process、future、上下文与消息状态。
- 解释单个 Process 的当前 Wisp，并推进运行时状态。
- 向外暴露最小的接口面。

它暴露的根引用具有固定含义：

- `scopeRoot`：入口 `ritual` 所创建的根 Scope 引用。
- `processRoot`：入口 `ritual` 所创建的根 Process 引用。

`isClosed` 反映的是这整个解释环境是否已经收敛。

## 2. 运行时边界

解释环境中的运行时对象按职责分为三类：

- `RuntimeScope`：承接 scope 树、mailbox、scope 派生 future、scope descriptor，以及 scope 内部的结构归属与 scope 自身状态。
- `RuntimeProcess`：承接 process descriptor，以及 process 的局部运行态，例如 continuation、等待态、终态收敛与 process 自身状态。
- `RuntimeFuture`：承接 future 的单次收敛状态与观察面。

设计上，runtime object 的事件面由对象自身暴露：

- `RuntimeProcess.observe(...)`：订阅 process 自身的状态变化。
- `RuntimeScope.observe(...)`：订阅 scope 自身的状态变化。

解释环境外的调度或观察逻辑，应建立在这些对象自己的观察面之上，而不是要求 `RuntimeProcess` 再额外持有一个 `cell` 承载位。

`zone` 仍然是 `RuntimeScope` 所持有的结构承接位。它适合描述 scope 级或子树级的组织边界；它不是 process 运行态本身的必要组成，也不应反过来把 `RuntimeProcess` 塑造成依赖 `cell builder` 的对象。

索引对象 `RuntimeIndex` 只负责：

- `registerScope / registerProcess / registerFuture`
- `resolveScope / resolveProcess / resolveFuture / resolveFutureBySettle`

`Interpreter` 通过这些运行时对象推进解释环境。mailbox、future、process 局部运行态，以及 scope / process 自身的观察面分别由对应 runtime object 承接；与 `Scope` / `Process` 一起创建的 descriptor 也由对应 runtime object 持有，解释器读取这些只读声明信息来解释创建、关闭与收敛行为。

### 2.1 `RuntimeScope` 的生命周期职责

`RuntimeScope` 承接 scope 生命周期的编排边界。它的状态设计显式区分“正常运行中”“本地 closing 收敛中”“被级联取消中”“失败传播判定中”“已成功收敛”“已失败收敛”“已取消收敛”这几类阶段。

`RuntimeScopeStatus` 为：

- `running`
- `closing`
- `canceling`
- `failing`
- `completed`
- `failed`
- `canceled`

其中：

- `closing` 表示该 scope 已进入本地收敛过渡态，并在 cleanup 完成后再决定终态是 `completed` 还是 `failed`。
- `canceling` 表示该 scope 自身不是 failure 起点，而是在祖先或外部编排驱动下进入级联取消。
- `failing` 表示该 scope 已完成失败传播判定，并开始汇集失败收敛所需的信息。
- `completed / failed / canceled` 是互斥终态。
- `RuntimeScope.isClosed` 只表达“已进入终态”，不混入 `closing / canceling / failing` 这类过程态。

`RuntimeScope` 的对象设计包含三层职责：

- 持有 scope 自身的状态、descriptor、mailbox、派生 future，以及对父子 scope 的结构归属。
- 监听直系 Process 与子 Scope 的状态变化，并据此驱动 scope 生命周期推进。
- 作为 scope 收敛与级联取消编排的承接点，决定何时进入 `closing` / `canceling` / `failing`，以及何时在所有归属成员退出后收敛到终态。

当 scope 进入 `failing` 时，通过 `ScopeFailureBuilder` 暂存失败收束所需的信息：

- 由 process `failed` 首次触发 `failing` 时，builder 以该 process failure 作为 `cause` 初始化。
- 由 child scope 传播首次触发 `failing` 时，builder 以该 child scope 的 `exitFuture` 所交付的 failure 作为 `cause` 初始化。
- scope 在 `failing` 期间继续观察到其他 process / child scope 的失败时，这些 failure 作为 `suppressedFailures` 追加收集。

`ScopeFailure.cause` 显式建模为 sum type：

- `process`：记录触发 failing 的 process 引用及其 failure。
- `scope`：记录触发 failing 的 child scope 引用及其 failure。

`RuntimeScope` 内部用于追踪归属关系的容器具有明确语义：

- process 按 `completionMode` 分别进入 structural / detached 两组容器；`entryProcess` 也走同一套注册路径。
- `children` 与 process 容器表达 runtime scope 需要追踪的归属成员。
- 成员进入终态后，应从对应容器中移除，不再继续作为活跃成员被追踪。

`RuntimeScope` 不直接承接 `halt(process, failure)` 这类入口。`halt` 是 process 级事件：`Interpreter` 解释到 `Halt` sigil 后，直接调用对应 `RuntimeProcess.halt(failure)`，再由 `RuntimeScope.observe(...)` 与 `RuntimeProcess.observe(...)` 的事件关系去推进本地收敛路径进入 `closing`，其余被波及的 scope 进入 `canceling`，最后分别收敛到对应终态。与之相对，`cancel()` 是 scope 级事件：它取消当前 scope，并使该 scope 子树沿取消路径收敛。

关于级联取消、终态 future settlement，以及成员移除时机，本文档只约束职责落点：这些语义由 `RuntimeScope` 通过事件驱动方式承接。

`RuntimeScope` 的事件驱动规则分成两类：

- 监听 owned process 事件。
- 监听 child scope 事件。

owned process 的状态变化按当前 scope 状态解释：

- `["running", "completed"]`：尝试进入 scope 完成收敛。
- `["running" | "closing" | "canceling" | "failing", "failed"]`：scope 收集 process 的失败，并进入或重进 `failing`。
- `["closing", "completed" | "canceled"]`：尝试进入 scope 本地收敛。
- `["canceling", "completed" | "canceled"]`：尝试进入 scope 取消收敛。
- `["failing", "completed" | "canceled"]`：尝试进入 scope 失败收敛。

child scope 的状态变化按当前 scope 状态解释：

- `["running", "completed" | "failed"]`：尝试进入 scope 的下一阶段收敛。
- `["closing", "completed" | "canceled" | "failed"]`：尝试进入 scope 本地收敛。
- `["canceling", "completed" | "canceled" | "failed"]`：尝试进入 scope 取消收敛。
- `["failing", "completed" | "canceled"]`：尝试进入 scope 失败收敛。
- `["failing", "failed"]`：收集 child 的失败，并尝试进入 scope 失败收敛。
- `["running" | "closing" | "canceling" | "failing", "failing"]`：按 child 的传播决策推动 this 进入或重进 `failing`。

这里的关键区别是：

- `closing` 表示该 scope 已在本地收敛路径上，但 cleanup 完成前终态仍未决；它可能收敛为 `completed`，也可能收敛为 `failed`。
- `canceling` 表示该 scope 的终态目标是 `canceled`。
- `failing` 表示该 scope 的终态目标是 `failed`，也是失败传播已经定型后的结果汇集阶段。
- child scope 是否传播失败，在 child 进入 `failing` 时判定；child 的 `failed` 表示该失败结果已经交付完成。

### 2.2 `RuntimeProcess` 的生命周期职责

`RuntimeProcess` 承接 process 自身的局部运行态。`RuntimeProcessStatus` 为：

- `running`
- `waiting`
- `completed`
- `failed`
- `canceled`

其中：

- `failed` 表示 process 自身因 `halt` 或其他 failure 退出。
- `canceled` 表示 process 因 scope 级联取消而退出。
- `defer` 注册与 cleanup 触发由 `RuntimeProcess` 自身承接；具体时序由 `semantics.md` 定义。
- `halt(failure)` 是 process 进入 `failed` 的公开入口。
- `cancel()` 是当前 scope 进入取消路径的公开入口；被波及的 process 因此收敛到 `canceled`。
- process 终态后的 cleanup 责任通过 `takeCleanups()` 交接给外部编排方。

外部接口始终以 `ScopeRef` / `ProcessRef` 作为边界；`Interpreter` 维持这组引用边界并据此组织解释环境。

## 3. 驱动模型

`Interpreter` 以步进推进为核心模型。

外部通过反复调用 `step(processRef)` 推进单个 Process。这个过程可能伴随：

- 并发分支创建
- future 收敛
- 消息等待与恢复
- scope 关闭与退出

直到整个解释环境收敛。

### 3.1 `step`

`step(processRef)` 表示对目标 Process 执行一次步进解释，并返回该步的 `ProcessStep`。

`ProcessStep` 表达的是本次推进的结果：

- `waiting`
- `ceded`
- `interpreted`
- `resonated`
- `exited`

其中，“解释 sigil”与“执行 `resonate`”是两个可分离的外部可见步骤。

### 3.2 `spawn`

`spawn(scopeRef, worker)` 用于把新的 Process 插入到当前解释环境中。

它表达的是解释环境内部新增并发参与者的入口。

## 4. 接口

### 4.1 `observeRunnable`

`Interpreter` 保留 `observeRunnable(listener)`，它建立在 root scope 所持有的 zone 之上。

它覆盖 runnable process 的观察：

- 当 root zone 追踪到某个 `runnable` process，解释环境会通知订阅者。
- 允许多个订阅同时生效；返回的 `unsubscribe` 只撤销当前订阅。

这条接口是 `Interpreter` 暴露给外部调度方的最小 runnable 观察面；它不等同于 `RuntimeScope` 或 `RuntimeProcess` 自身的观察接口。

### 4.2 只读接口

`Interpreter` 提供一组只读观察接口：

- `lookup(scopeRef, contextKey)`
- `poll(futureKey)`
- `wait(futureKey, onSettled)`

它们读取解释环境中的既有状态，或登记收敛通知。

## 5. Closing 语义

scope 的级联取消、终止 failure 的设置，以及 closing failure 的收集，统一由 kernel 的 closing 协议定义。

`Interpreter` 负责触发并推进这套协议，使 closing 继续保持为解释环境内部的固定语义。

关闭编排的最小顺序为：

1. `Interpreter` 解释到 `Halt` sigil。
2. `Interpreter` 直接调用对应 `RuntimeProcess.halt(failure)`。
3. 本地收敛路径上的 `RuntimeScope` 通过观察到的 process 事件进入 `closing`。
4. 该 scope 的后续 process / child 事件继续驱动它在成员退出后收敛到 `completed` 或 `failed`。
5. 被级联波及的其他 scope 进入 `canceling`。
6. 每个进入 `canceling` 的 scope 继续通过自己的 process / child 事件驱动收敛到 `canceled`。
