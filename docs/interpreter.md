# Interpreter 设计

本文档定义 `Interpreter` 的职责、边界与接口语义。

`Interpreter` 处理的是一个封闭解释环境中的 Wisp 演算。它围绕一次入口 `ritual` 建立自己的根 Scope 与根 Process，并在外部驱动下逐步推进该环境的收敛。

---

## 1. 主题

`Interpreter` 提供的是一个可步进、可观察、可驱动的解释环境。

它承接三类事情：

- 维护解释环境中的 Scope、Process、future、上下文与消息状态。
- 解释单个 Process 的当前 Wisp，并推进运行时状态。
- 向外暴露最小的观察与驱动接面。

它暴露的根引用具有固定含义：

- `scopeRoot`：入口 `ritual` 所创建的根 Scope 引用。
- `processRoot`：入口 `ritual` 所创建的根 Process 引用。

`isClosed` 反映的是这整个解释环境是否已经收敛。

## 2. 运行时边界

解释环境中的运行时对象按职责分为三类：

- `RuntimeScope`：承接 scope 树、mailbox、scope 派生 future，以及 scope 内部的结构归属。
- `RuntimeProcess`：承接 process 的局部运行态，例如 continuation、等待态与终态收敛。
- `RuntimeFuture`：承接 future 的单次收敛状态与观察面。

索引对象 `RuntimeIndex` 只负责：

- `registerScope / registerProcess / registerFuture`
- `resolveScope / resolveProcess / resolveFuture / resolveFutureBySettle`

`Interpreter` 通过这些运行时对象推进解释环境；它自身不承载 mailbox、future 或 process 局部状态。

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

`spawn(scopeRef, ritual)` 用于把新的 Process 插入到当前解释环境中。

它表达的是解释环境内部新增并发参与者的统一入口。

## 4. 观察与驱动接面

### 4.1 `observeRunnable`

`observeRunnable(scopeRef, listener)` 是解释环境对外暴露的 runnable 驱动接面。

它的输入不仅是一个 listener，还包含“接管哪棵 scope 子树”的信息。该接口的语义核心是**遮蔽**：

- 当前 scope 若安装了本地 runnable receiver，则它优先接收该 scope 子树中的 runnable process。
- 子 scope 若再安装自己的 receiver，则它会遮蔽祖先 receiver 对该子树的接收。
- `unsubscribe` 撤销的是当前 scope 的本地接线；撤销后，该子树回退到最近祖先 receiver，若祖先链上都没有，则回退到默认驱动路径。

`Interpreter.observeRunnable(...)` 只负责按 `scopeRef` 寻址并转发给目标 `RuntimeScope`。

### 4.2 只读观察接口

`Interpreter` 提供一组只读观察接口：

- `lookup(scopeRef, contextKey)`
- `poll(futureKey)`
- `wait(futureKey, onSettled)`

它们读取解释环境中的既有状态，或登记收敛通知。

## 5. 扩展点

`Interpreter` 预留一个受保护扩展点：`onClosing`。

`onClosing(scope, processes, failure)` 在某个 Scope 进入 closing 路径时被调用，其中：

- `scope`：当前进入 closing 的 Scope
- `processes`：当前 Scope 内因本次 closing 被终止的 Process 集合
- `failure`：当前 closing 路径上承载的 Failure

这个扩展点用于在 closing 路径上追加有限干预。
