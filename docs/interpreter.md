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

- `RuntimeScope`：承接 scope 树、mailbox、scope 派生 future、scope descriptor，以及 scope 内部的结构归属，并持有该 scope 的 `RuntimeZone`。
- `RuntimeProcess`：承接 process descriptor，以及 process 的局部运行态，例如 continuation、等待态与终态收敛，并持有该 process 的 `RuntimeCell`。
- `RuntimeFuture`：承接 future 的单次收敛状态与观察面。

其中，`RuntimeZone` 由 `RuntimeScope` 在自身构造过程中通过 `RuntimeZoneBuilder` 产出；`RuntimeCell` 由 `RuntimeProcess` 在自身构造过程中通过 `RuntimeCellBuilder` 产出。

索引对象 `RuntimeIndex` 只负责：

- `registerScope / registerProcess / registerFuture`
- `resolveScope / resolveProcess / resolveFuture / resolveFutureBySettle`

`Interpreter` 通过这些运行时对象推进解释环境。mailbox、future 与 process 局部运行态分别由对应 runtime object 承接；与 `Scope` / `Process` 一起创建的 descriptor 也由对应 runtime object 持有，解释器读取这些只读声明信息来解释创建、关闭与收敛行为。

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

`Interpreter` 仍保留 `observeRunnable(listener)`，但它不再按 `scopeRef` 暴露局部接线能力，而是固定工作在 root scope 语境。

它为 root scope 所承接的 runnable 接线安装订阅者：

- 根 scope 在创建时显式承接 zone。
- child scope 在 `branch(...)` 时默认继承父 zone，也允许显式换入新 zone。
- `observeRunnable(listener)` 只作用于 root zone，但允许多个订阅同时生效；返回的 `unsubscribe` 只撤销当前订阅。

### 4.2 只读接口

`Interpreter` 提供一组只读观察接口：

- `lookup(scopeRef, contextKey)`
- `poll(futureKey)`
- `wait(futureKey, onSettled)`

它们读取解释环境中的既有状态，或登记收敛通知。

## 5. Closing 语义

scope 的级联取消、终止 failure 的设置，以及 closing failure 的收集，统一由 kernel 的 closing 协议定义。

`Interpreter` 负责触发并推进这套协议，使 closing 继续保持为解释环境内部的固定语义。
