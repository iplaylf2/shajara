# Interpreter 设计

本文档定义 `Interpreter` 的职责、边界与接口语义。

`Interpreter` 处理一个封闭解释环境中的 Wisp 演算。它围绕一次入口 `ritual` 建立根 Scope 与根 Process，并在外部驱动下逐步推进该环境的收敛。

---

## 1. 主题

`Interpreter` 提供一个可步进的封闭解释环境。

它承接三类职责：

- 维护解释环境中的 Scope、Process、future、上下文与消息状态。
- 解释单个 Process 的当前 Wisp，并推进运行时状态。
- 向外暴露最小接口面。

它暴露的根引用具有固定含义：

- `scopeRoot`：入口 `ritual` 所创建的根 Scope 引用。
- `processRoot`：入口 `ritual` 所创建的根 Process 引用。

`isClosed` 表达整个解释环境是否已经收敛。

## 2. 运行时边界

解释环境中的运行时对象分为三类：

- `RuntimeScope`：承接 scope 树、scope mailbox、scope 派生 future、scope descriptor、成员归属与 scope 自身状态。
- `RuntimeProcess`：承接 process descriptor、局部执行状态、等待状态、终态收束与 process 自身状态。
- `RuntimeFuture`：承接 future 的单次收敛状态与观察面。

每个 runtime object 暴露自己的观察面：

- `RuntimeProcess.observe(...)`：订阅 process 自身状态变化。
- `RuntimeScope.observe(...)`：订阅 scope 自身状态变化。

`zone` 是 `RuntimeScope` 持有的结构承接位，用于表达 scope 级或子树级的组织边界。

`RuntimeIndex` 只承接索引职责：

- `registerScope / registerProcess / registerFuture`
- `resolveScope / resolveProcess / resolveFuture / resolveFutureBySettle`

`Interpreter` 通过这些运行时对象推进解释环境。mailbox、future、process 局部运行态，以及 scope / process 自身的观察面分别由对应 runtime object 承接；与 `Scope` / `Process` 一起创建的 descriptor 也由对应 runtime object 持有。

### 2.1 `RuntimeScope`

`RuntimeScope` 承接 scope 生命周期的编排边界。

`RuntimeScopeStatus` 为：

- `running`
- `closing`
- `canceling`
- `failing`
- `completed`
- `failed`
- `canceled`

语义如下：

- `closing` 表示 scope 已进入本地收敛路径，终态将在 cleanup 完成后定为 `completed` 或 `failed`。
- `canceling` 表示 scope 已进入级联取消路径，终态目标为 `canceled`。
- `failing` 表示 scope 已进入失败收敛路径，终态目标为 `failed`。
- `completed / failed / canceled` 是互斥终态。
- `RuntimeScope.isClosed` 表达 scope 是否已经进入终态。
- scope 进入 `failing` 后，后续 `cancel()` 继续复用成员取消流程，但不改变该 scope 的失败终态目标。

`RuntimeScope` 承接三层职责：

- 持有 scope 自身状态、descriptor、scope mailbox、派生 future，以及父子 scope 结构归属。
- 监听直系 Process 与子 Scope 的状态变化，并据此推进 scope 生命周期。
- 编排 scope 收敛、级联取消与失败传播，并在归属成员退出后收敛到终态。

`RuntimeMailbox` 是 `RuntimeScope` 私有持有的实现承接位，用于封装单个 scope 上的 message buffer、receiver queue、receiver 反向索引与消息投递规则。

`RuntimeScope` 直接依赖 `RuntimeProcess`，并将其视为所属 scope 的 lifecycle member。

这条依赖只覆盖 member lifecycle：

- `RuntimeScope` 读取 process descriptor、终态、cleanup 与取消入口。
- `RuntimeScope` 不推进 process 的 ritual 执行，不组装 continuation，不负责等待恢复协议。

`RuntimeScope` 是 structure coordinator。

`RuntimeScope` 的内部生命周期状态采用判别联合：

- `failing` 状态携带 failure draft。
- `failed` 状态携带最终 failure。
- 对外暴露的 `status` 只表示生命周期阶段本身。

failure 收敛遵循两步结构：

- 先根据触发源初始化 failure draft。
- 再进入 `failing`，并沿失败收敛路径取消成员、汇集失败并等待终态。

`ScopeFailure.cause` 是 sum type：

- `process`：记录触发 failing 的 process 引用及其 failure。
- `scope`：记录触发 failing 的 child scope 引用及其 failure。

`RuntimeScope` 内部的归属容器具有固定语义：

- process 按 `completionMode` 分别进入 structural / detached 两组容器。
- `entryProcess` 走同一套 process 注册路径。
- `children` 与 process 容器共同表达 scope 需要追踪的活跃成员。
- 成员进入终态后，从对应容器中移除。

`RuntimeScope` 通过事件驱动规则推进生命周期。事件源分为两类：

- owned process
- child scope

owned process 的状态变化按当前 scope 状态解释：

- `["running", "completed"]`：触发该 process 的 cleanup task，再尝试进入完成收敛。
- `["running" | "closing" | "canceling" | "failing", "failed"]`：收集该 process 的失败，并进入或重入 `failing`。
- `["closing", "completed" | "canceled"]`：触发该 process 的 cleanup task，再尝试进入完成收敛。
- `["canceling", "completed" | "canceled"]`：触发该 process 的 cleanup task，再尝试进入取消收敛。
- `["failing", "completed" | "canceled"]`：触发该 process 的 cleanup task，再尝试进入失败收敛。

child scope 的状态变化按当前 scope 状态解释：

- `["running", "completed" | "failed" | "canceled"]`：尝试进入下一阶段收敛。
- `["closing", "completed" | "canceled" | "failed"]`：尝试进入完成收敛。
- `["canceling", "completed" | "canceled" | "failed"]`：尝试进入取消收敛。
- `["failing", "completed" | "canceled"]`：尝试进入失败收敛。
- `["failing", "failed"]`：收集 child failure，再尝试进入失败收敛。
- `["running" | "closing" | "canceling", "failing"]`：若 child 的 `failureMode = "propagate"`，推动当前 scope 进入 `failing`。
- `["failing", "failing"]`：若 child 的 `failureMode = "propagate"`，推动当前 scope 重入 `failing`。

三条收敛路径的区别如下：

- `closing` 仍在本地收敛路径上，终态在 `completed` 与 `failed` 之间决出。
- `canceling` 的终态目标固定为 `canceled`。
- `failing` 的终态目标固定为 `failed`。

`RuntimeScope` 的取消路径承接两件事：

- 取消当前 scope 所管理的成员。
- 在 scope 进入终态时收束仍未 settle 的派生 future。

取消路径以成员 snapshot 为输入，基于 snapshot 执行取消，避免遍历期间被新成员扰动。

派生 future 的收束规则为：

- scope 收敛到 `completed / failed / canceled` 时，仍 pending 的派生 future 统一以 canceled settle。
- scope 自身终态结果通过 `ScopeRef.exitFuture` 交付。

cleanup 的职责边界固定如下：

- `RuntimeProcess` 保存本 process 的 cleanup task。
- `RuntimeScope` 决定 cleanup task 的触发时机。
- `Interpreter` 提供 cleanup process 的出生与登记。

cleanup task 接收一个由解释环境主控层提供的 `spawn` 能力，并通过该能力把 cleanup ritual 作为新的 process 插回当前 scope。该 `spawn` 在目标 `RuntimeScope` 内创建 owned process，并在 `RuntimeIndex` 中完成登记。

message 协议的归属固定如下：

- `RuntimeScope` 承接 `send/receive` 的结构归属，并把 mailbox 缓冲与 receiver registration 委托给其私有持有的 `RuntimeMailbox`。
- process 的等待原因、恢复 continuation 的方式，以及恢复后的执行推进属于 process/interpreter 一侧的执行协议。
- receiver registration 与 process 生命周期保持一致；关闭后的 process 不再作为活跃 receiver 留在消费队列中。
- scope 进入 `completed / failed / canceled` 后，`RuntimeScope` 清空其私有持有的 `RuntimeMailbox`。

### 2.2 `RuntimeProcess`

`RuntimeProcess` 承接 process 自身的局部运行态。

`RuntimeProcessStatus` 为：

- `running`
- `waiting`
- `completed`
- `failed`
- `canceled`

语义如下：

- `failed` 表示 process 因 `halt` 或其他 failure 退出。
- `canceled` 表示 process 因 scope 级联取消而退出。
- `defer` 的注册由 `RuntimeProcess` 承接；cleanup 触发时机由所属 `RuntimeScope` 编排。
- `halt(failure)` 是 process 进入 `failed` 的公开入口。
- `cancel()` 是 process 接受 scope 级联取消的公开入口。
- `takeCleanups()` 暴露本 process 上登记的 cleanup task。

`RuntimeProcess` 接受 `RuntimeScope` 的 lifecycle 级控制，但 ritual 解释推进由 `Interpreter.step(...)` 驱动。

`RuntimeProcess` 的局部状态采用 sum type。

该状态同时表达两类信息：

- lifecycle
- running 期间的局部执行阶段

因此：

- `running` 之外还需要表达 process 是否正在解释当前 wisp、是否已排入 continuation、以及是否因特定原因进入 waiting。
- continuation、waiting reason、终态 result 与对应状态分支绑定。

`RuntimeProcess` 对外暴露两层视图：

- 对结构编排方暴露粗粒度的 lifecycle status。这个 lifecycle status 是 `RuntimeScope` 消费 `RuntimeProcess` 状态时的规范接口。
- 对 `Interpreter` 暴露 `RuntimeProcessState` 的具体分支，以便在类型约束下编排 continuation 与步进解释。

`RuntimeProcess` 的公开面分为两类：

- lifecycle-facing：descriptor、终态、cleanup、取消入口，以及供 `RuntimeScope` 推进结构收敛所需的信息。
- execution-facing：当前 wisp、continuation、等待恢复协议，以及推进 ritual 解释所需的信息。

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

`ProcessStep` 表达本次推进的结果：

- `waiting`
- `ceded`
- `interpreted`
- `resonated`
- `exited`

“解释 sigil”与“执行 `resonate`”是两个可分离的外部可见步骤。

### 3.2 `spawn`

`spawn(scopeRef, worker)` 用于把新的 Process 插入到当前解释环境中。

它表达解释环境内部新增并发参与者的入口。

cleanup process 的激活复用同一条出生口。`RuntimeScope` 决定 cleanup task 何时触发；cleanup process 由 `Interpreter` 的统一出生协议创建并登记。

## 4. 接口

### 4.1 `observeRunnable`

`Interpreter` 保留 `observeRunnable(listener)`，它建立在 root scope 所持有的 zone 之上。

它覆盖 runnable process 的观察：

- 当 root zone 追踪到某个 runnable process，解释环境通知订阅者。
- 允许多个订阅同时生效；返回的 `unsubscribe` 只撤销当前订阅。

这条接口是 `Interpreter` 暴露给外部调度方的最小 runnable 观察面。

### 4.2 只读接口

`Interpreter` 提供一组只读观察接口：

- `lookup(scopeRef, contextKey)`
- `poll(futureKey)`
- `wait(futureKey, onSettled)`

这些接口读取解释环境中的既有状态，或登记收敛通知。

## 5. Closing 语义

scope 的级联取消、终止 failure 的设置，以及 closing failure 的收集，统一由 kernel 的 closing 协议定义。

`Interpreter` 负责触发并推进这套协议。

关闭编排的最小顺序为：

1. `Interpreter` 解释到 `Halt` sigil。
2. `Interpreter` 调用对应 `RuntimeProcess.halt(failure)`。
3. 本地收敛路径上的 `RuntimeScope` 通过观察到的 process 事件进入 `closing`。
4. 该 scope 的后续 process / child 事件继续驱动它在成员退出后收敛到 `completed` 或 `failed`。
5. 被级联波及的其他 scope 进入 `canceling`。
6. 每个进入 `canceling` 的 scope 继续通过自己的 process / child 事件驱动收敛到 `canceled`。
