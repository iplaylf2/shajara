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

`Interpreter` 不直接把所有语义揉进一个对象里，而是围绕三类 runtime object 组织解释环境：

- `RuntimeScope`：承接结构边界与生命周期编排。
- `RuntimeProcess`：承接单个 process 的执行推进与退出。
- `RuntimeFuture`：承接 future 的观察与单次收敛。

它们直接实现对应的 `ScopeRef`、`ProcessRef`、`FutureKey` 与 `FutureSettleKey` 契约。对外只暴露 `ref / key` 视图。

`Interpreter` 在内部通过两类协议操作这些对象：

- `resolve(...)`：面向抽象 token，例如 `ScopeRef`、`ProcessRef`、`FutureKey` 与 `FutureSettleKey`，用于回到运行时承载体。
- `touch(...)`：面向具体 runtime instance，例如 `RuntimeScope`、`RuntimeProcessHandle` 与 `RuntimeFuture`，用于记录对象出生点。

这两类协议不应在同一个局部调用点里互相嵌套来弥补边界设计问题。

这一层设计要表达的不是“解释器拥有所有状态”，而是“解释器主控协议推进，具体承载体各有单一职责”。

### 2.1 Scope

`RuntimeScope` 是结构协调者。它负责三件事：

- 表达 scope 树、成员归属与 descriptor 所定义的边界。
- 编排结构化收敛，包括本地完成、级联取消与失败传播。
- 承接 scope-local 的 mailbox 与派生 future。

设计上，`RuntimeScope` 只把 `RuntimeProcess` 当作 lifecycle member，而不把它当作 ritual runner。也就是说：

- `RuntimeScope` 负责决定成员何时应被等待、取消、清理和移出归属集合。
- `Interpreter` 负责解释 wisp、组织 continuation，并推动 process 继续执行。

由此形成一条明确边界：scope 协议关心“谁属于谁、何时收敛”，不关心“下一步怎样执行某个 wisp”。

关于 cleanup，这里只固定职责边界：

- cleanup 注册归属于当前 process。
- cleanup 触发时机由所属 scope 决定。
- cleanup process 的出生由 `Interpreter` 通过统一出生口接回解释环境。

关于 future，这里只固定 owner 语义：

- 派生 future 归属于当前 scope。
- scope 进入终态时，仍 pending 的派生 future 会被统一收束。

关于 message，这里只固定结构归属：

- `send/receive` 的结构边界在 scope。
- process 只承接自身等待与恢复，不承接 mailbox 组织。

### 2.2 Process

`RuntimeProcess` 是执行承载体。它负责：

- 持有当前 ritual 的局部执行状态。
- 暴露等待、continuation、终态与 cleanup 注册等执行面。
- 接受来自 scope 的 lifecycle 控制，并由 `Interpreter.step(...)` 推进解释。

设计上，process 面向两类消费者：

- 对 `RuntimeScope`，它是一个可被归属、观察和收束的 member。
- 对 `Interpreter`，它是一个可被步进解释的执行现场。

这份双重面向应落实为一个公开代表和两套纯类型切面：

- `RuntimeProcessHandle`：公开代表；外部通过它显式取得不同切面，而不是直接获得完整内部实现。
- `RuntimeProcessKeeper`：scope-facing surface，例如观察、取消、message waiting / accept、cleanup 收束，以及通过 `stateAs(...)` 进行的 process state 读取。
- `RuntimeProcessRunner`：interpreter-facing surface，例如 continuation、`wait`、`halt`、`selfHandle`、当前 `wisp` 与执行推进所需状态。

它们不通过运行时 wrapper 或 guard 区分，而是由同一个内部 `RuntimeProcess` 实例直接实现，并经由公开代表显式暴露出不同切面。

切面划分的标准应是“哪一方实际需要直接依赖这项能力”，而不是只按抽象语义归类。也就是说，切面不是为了把概念词汇分得好看，而是为了把模块依赖边界落实到类型表面。

这里固定一条设计约束：`RuntimeScope` 读取 process 终态时，通过 keeper 暴露的 `RuntimeProcessState` 分支进行读取。当前已冻结的状态载荷只有 completed result 与 failed failure；其余状态载荷仍在后续设计阶段继续冻结。

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

对 `branch / future / spawn / defer` 这类会引入新对象或新后续责任的 sigil，`step(...)` 会显式写出 `resolve(...)` / `touch(...)` 这组协议 callout。通常 `touch(...)` 直接落在对象出生点；cleanup process 也应沿同一出生协议被登记。

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

scope 的级联取消、failure 传播与终态收敛，统一由 kernel 的 closing 协议定义，`Interpreter` 负责触发并推进它。

设计层只固定以下事实：

- closing 是结构协议，不是某个 process 的局部行为。
- scope 的终态由成员退出、cleanup 完成以及失败传播共同决定。
- 一旦 closing 开始，后续推进依赖 scope 对 member 事件的编排，而不是依赖调用方直接操纵某个局部状态字段。
