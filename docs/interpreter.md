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

当前设计里，runtime object 的事件面由对象自身暴露：

- `RuntimeProcess.observe(...)`：订阅 process 自身的状态变化。
- `RuntimeScope.observe(...)`：订阅 scope 自身的状态变化。

解释环境外的调度或观察逻辑，应建立在这些对象自己的观察面之上，而不是要求 `RuntimeProcess` 再额外持有一个 `cell` 承载位。

`zone` 仍然是 `RuntimeScope` 所持有的结构承接位。它适合描述 scope 级或子树级的组织边界；它不是 process 运行态本身的必要组成，也不应反过来把 `RuntimeProcess` 塑造成依赖 `cell builder` 的对象。

索引对象 `RuntimeIndex` 只负责：

- `registerScope / registerProcess / registerFuture`
- `resolveScope / resolveProcess / resolveFuture / resolveFutureBySettle`

`Interpreter` 通过这些运行时对象推进解释环境。mailbox、future、process 局部运行态，以及 scope / process 自身的观察面分别由对应 runtime object 承接；与 `Scope` / `Process` 一起创建的 descriptor 也由对应 runtime object 持有，解释器读取这些只读声明信息来解释创建、关闭与收敛行为。

### 2.1 `RuntimeScope` 的 closing 职责

`RuntimeScope` 自身承接 scope closing 的编排入口。

当某个 Process 以 failure 触发 `halt` 时，`RuntimeScope` 的职责分为两段：

- 先让触发者 Process 以原始 failure 失败退出。
- 再把当前 scope 子树连续推进到 `closing`。

这条边界里，`RuntimeScope` 只负责：

- 改写 scope 状态。
- 终止当前 scope 内其余仍存活的 Process。
- 级联让子 scope 进入 `closing`。
- 构造 closing tree。

closing 过程中，子 scope 因级联而退出的 Process 统一承接 `scopeTerminated()`；`halt` 的原始 failure 归属于最初触发关闭的那个 Process。

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

`spawn(scopeRef, ritual)` 用于把新的 Process 插入到当前解释环境中。

它表达的是解释环境内部新增并发参与者的入口。

## 4. 接口

### 4.1 `observeRunnable`

`Interpreter` 仍保留 `observeRunnable(listener)`，它当前仍建立在 root scope 所持有的 zone 之上。

当前它只覆盖 runnable process 的观察：

- 当 root zone 追踪到某个 `runnable` process，解释环境会通知订阅者。
- 允许多个订阅同时生效；返回的 `unsubscribe` 只撤销当前订阅。

这条接口现在只是 `Interpreter` 暴露给外部调度方的最小 runnable 观察面；它不等同于 `RuntimeScope` 或 `RuntimeProcess` 自身的观察接口。

### 4.2 只读接口

`Interpreter` 提供一组只读观察接口：

- `lookup(scopeRef, contextKey)`
- `poll(futureKey)`
- `wait(futureKey, onSettled)`

它们读取解释环境中的既有状态，或登记收敛通知。

## 5. Closing 语义

scope 的级联取消、终止 failure 的设置，以及 closing failure 的收集，统一由 kernel 的 closing 协议定义。

`Interpreter` 负责触发并推进这套协议，使 closing 继续保持为解释环境内部的固定语义。
