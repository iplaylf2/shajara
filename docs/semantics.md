# khora 语义

## 1. 核心对象

### 1.1 Plan 与 Blueprint

`Plan<T>` 为二者之一：

- `PurePlan(value: T)`
- `ImpurePlan(syscall: S, then: (value: SyscallReturn<S>) => Plan<T>, terminate: () => Plan<E>)`（`S extends Syscall`）

`Blueprint<T>` 为 `() => Plan<T>`。

`Syscall` 为基础对象契约（非泛型），最小形状为：

- `kind: string`
- `return?: readonly [unknown]`

具体 syscall 通过自身的 `return` tuple 见证声明返回值类型，`then` 的参数类型由 `SyscallReturn<S>` 从该见证推导。

### 1.2 响应通道与 Fault

syscall 的成功恢复值由 `then(value)` 承接。本文档不定义统一失败塑形：失败是否作为返回值、异常或其他形状表达，按具体 syscall 条目单独记录。

`Fault` 为带外终止事件。发生 `Fault` 时，目标 `Process` 立即退出，后续 continuation 不再执行。
错误编码与失败值形状由具体 syscall 语义定义。
`Failed(fault)` 的传播语义按 `Scope` 父链进行：当 `Process` 在某个 `Scope` 内以 `Failed(fault)` 退出时，该失败事件按祖先链向上传播，行为等价于“按 `Scope` 边界做异常展开”。

### 1.3 Scope（统一对象与角色分层）

`Scope` 是生命周期、身份与上下文的统一载体，承载父子关系、上下文边界与 `Process` 归属。
每个 `Scope` 都有唯一 `ScopeRef`，且 `Scope` 构成严格树（除根以外每个 `Scope` 恰有一个父 `Scope`）。`ScopeRef` 是控制面引用（capability handle）。

当前角色集合：

- `StandardScope`：普通编排角色，承载大多数业务流程与默认并发分支。
- `SchedulerScope`：调度编排角色（`Scheduler` 职责）。
- `ReaperScope`：终止收敛仲裁角色（`Reaper` 职责）。
- `IngressScope`：输入通道角色（`Sink/PostFn` 语义）。
- `PortalScope`：能力投放角色（`Capability -> Portal` 触发任务）。
- `ExecutionScope`：执行入口能力角色（`launch + terminate` 语义，见 1.4）。
- `LimboScope`：结构性修剪承接角色（全局单例，见 1.8）。

创建约束：`StandardScope`、`SchedulerScope`、`ReaperScope`、`IngressScope`、`PortalScope` 可由 syscall 创建；`ExecutionScope` 与 `LimboScope` 由系统语义保留，不作为 syscall 创建目标。

### 1.4 执行入口能力视图与依赖方向

执行入口能力视图由 executor 基于 `Scope` 派生：

- `ExecutionScopeRoot`：仅具备 `launch` 能力，不具备 `terminate` 能力。
- `ExecutionScope`：成对具备 `launch + terminate` 能力。

代码契约中的对应句柄类型名为 `ExecutionScopeRootRef` 与 `ExecutionScopeRef`。

依赖方向固定为：`executor` 建立在 `Scope/Plan/Syscall` 等基础语义之上，`syscalls/contracts` 不反向依赖 `executor`。

### 1.5 Process 与 Call 信息

`Process` 是 `Plan` 的动态实例。

- 每个 `Process` 有唯一 `ProcessRef`
- 每个 `Process` 自创建起始终属于且仅属于一个 `Scope`

`ProcessRef` 与 `ScopeRef` 一样属于控制面引用。

当 `Process` 由入口调用创建时，它可携带不可变的调用信息（当前版本该创建路径待定）：

`call = { method: string, args: any[] }`

### 1.6 Processor 与 EventQueue

`Processor` 是系统中唯一的逻辑原子执行权令牌，`EventQueue` 是微内核内部队列，用于存放可运行的 `Process`。

### 1.7 Portal、Capability、Sink、PostFn

`Portal` 是 `Scope` 所拥有的入口映射（`{ methodName: Blueprint<any> }`）。`Capability` 是不可伪造令牌，绑定到某个 `Scope` 的 `Portal`。具备 `Portal + Capability` 投放面的 `Scope` 在角色上属于 `PortalScope`。`Sink` 是 `Scope` 的 `IngressScope` 通道（FIFO 值缓冲），`PostFn` 是宿主可调用函数，用于把值入队到某个 `Scope` 的 `IngressScope`。`IngressScope` 语义只覆盖该输入通道与 `post` 投递配对，不覆盖 `terminate` 生命周期控制。

### 1.8 Limbo 与孤儿 Scope

系统包含一个特殊 `Scope`：`Limbo`。该节点在全局范围内唯一（`LimboScope` 单例）。

`Limbo` 相关不变量如下：

- 常态下不存在 `Scope` 父子迁移。
- 仅当最近祖先 `ReaperScope` 在结构性收敛中给出 `Prune` 仲裁时，目标 `Scope` 才会被从原父树断开并挂接到 `Limbo` 之下。
- 迁移时保持被迁移 `Scope` 的原子树结构：仅变更被迁移子树根节点的父指针，不重排其后代关系。
- 被迁移 `Scope` 状态变为 `InLimbo`，并作为孤儿子树继续存在于 `Limbo` 之下；被迁移对象本身不是 `LimboScope`，仅是挂接到 `LimboScope` 之下的普通 `Scope`。

---

## 2. 执行循环

微内核以迭代方式推进执行，每轮包含两相：反应相与策略相。

### 2.1 反应相（Drain）

当 `EventQueue` 非空时重复：

1. 出队一个 `Process`：`P`
2. 将 `Processor` 授予 `P`
3. 解释 `P` 的当前 `Plan`，直到出现以下任一结果：
   - `P` 执行了一个 `[Blocking]` syscall 并让出 `Processor`
   - `P` 达到 `Pure(value)` 并退出为 `Completed(value)`
   - 发生 `Fault`，`P` 退出为 `Failed(fault)`

本步结束后，`Processor` 回到微内核。

### 2.2 策略相（Schedule）

当 `EventQueue` 为空且 `Processor` 在微内核手中时：

1. 微内核以 `Process` 形式运行该 `Scope` 的 `Scheduler`
2. `Scheduler` 按内核调度策略选择可运行 `Process` 并将其送入 `EventQueue`（当前版本不经由公开 `Arm` syscall）
3. `Scheduler` 让出 `Processor` 后，进入下一轮反应相

---

## 3. 收敛与终止

### 3.1 终态模型（Process 与 Scope）

本系统的终态语义按结果建模，而不是按过程词建模。`Process` 与 `Scope` 都只有三种互斥终态：

- `Completed`：成功收敛
- `Terminated`：被外部终止级联打断
- `Failed`：以 fault 失败

同一个实体不会同时属于以上多个终态。

### 3.2 Scope 过程态（phase）

`Scope` 运行过程仍需要阶段状态：

- `Running`
- `Closing`
- `Exited`
- `InLimbo`

`Closing` 是过程态，不是终态名。`Scope` 最终终态（`Completed | Terminated | Failed`）在进入 `Closing` 时确定，并在该次收敛流程中保持不变。

### 3.3 进入 Closing、终态判定与级联

`Scope` 进入 `Closing` 的触发条件：

- 在该 `Scope` 内执行 `Halt()`
- 该 `Scope` 内任一 `Process` 以 `Failed(fault)` 退出
- 该 `Scope` 从后代链路接收到 `Failed(fault)` 传播
- 从祖先 `Scope` 收到终止级联
- 该 `Scope` 变为空（不再包含任何 `Process`）

终态判定：

- 由本地 `Failed(fault)` 或后代失败传播触发进入 `Closing` 时，该 `Scope` 终态为 `Failed`。
- 仅由祖先终止级联触发进入 `Closing` 时，该 `Scope` 终态为 `Terminated`。
- 一旦某个 `Scope` 已确定为 `Failed`，后续收到终止级联不会把其改写为 `Terminated`。

进入 `Closing` 时，终止级联传播到所有后代 `Scope`。

当一个 `Scope` 的所有 `Process` 都退出后，该 `Scope` 进入 `Exited`。

### 3.4 Closing 门控

当调用方所在 `Scope` 为 `Closing`：

- `Spawn / Fork` 会失败
- 其他 syscalls 按其定义执行

`Invoke` 相关终止门控语义（若未来回归公开 syscall）仍属待定项。

### 3.5 Failed 传播与级联

当某 `Process` 以 `Failed(fault)` 退出时，系统按以下顺序处理：

- 该 `Process` 所属 `Scope` 进入 `Closing`，并确定终态为 `Failed`。
- 该 `Scope` 对其后代 `Scope` 触发终止级联。
- 失败事件沿该 `Scope` 的祖先链继续传播；传播到的祖先 `Scope` 进入 `Closing`，并确定终态为 `Failed`，随后继续级联。

`AwaitProcess` 对 `Failed(fault)` 的观察仅提供结果可见性，不构成对上述传播与终止流程的拦截。

### 3.6 结构性收敛：Reaper 与孤儿

当某个 `Scope` 处于 `Closing` 且其终止无法推进到 `Exited` 时，微内核运行其最近祖先 `ReaperScope` 对应的 `Reaper`。语义上该收敛仲裁职责归于 `ReaperScope`，与 `SchedulerScope` 分离。

`Reaper` 通过 syscalls 得到系统观测，并产出一个仲裁决定：

- `Wait`：继续等待该 `Scope` 自行收敛
- `Prune`：对该 `Scope` 的后代树进行结构性修剪以保证收敛

当决定为 `Prune` 时，微内核执行结构性修剪：

- 选择一个或多个后代 `Scope` 作为被修剪子树根
- 将每个被修剪子树根从原树断开并挂接到 `Limbo` 下
- 被修剪子树根及其后代保持原有内部结构；被修剪子树根进入 `InLimbo`，成为孤儿 `Scope`

结构性修剪的效果是：被修剪的后代不再阻塞原祖先 `Scope` 的退出，祖先 `Scope` 的终止流程可继续推进到 `Exited`。

---

## 4. Syscall 协议

### 4.0 声明与解释边界

`syscalls/` 提供的是 syscall 声明对象（指令形状），用于在 `ImpurePlan` 中表达“要做什么”以及“承诺返回值形状”。
syscall 对象本身不具备解释执行能力，也不直接修改系统状态。
解释、调度与状态变更由 executor 在执行循环中完成。

### 4.1 原子性

当 executor 解释到一个 syscall 声明时，会以微内核的一个原子步骤处理它；其效果在该步骤结束后对系统可见。

### 4.2 阻塞分类

`[Non-Blocking]` 表示调用方保留 `Processor`，其 continuation 立刻继续。`[Blocking]` 表示调用方释放 `Processor`，当阻塞条件满足时由微内核恢复该 `Process`。

---

## 5. Syscalls

本节仅描述 syscall 协议与效果，不展开执行入口能力语义。

可见性规则：

以 `ProcessRef` 为目标的操作要求目标 `Process` 属于调用方所在 `Scope`。`Spawn` 返回的 `ScopeRef` 对调用方可见。目标 `ScopeRef` 若不对调用方可见，则相关操作失败。

### 5.1 创建（含待定调用能力）

#### Spawn(blueprint) -> { scopeRef, processRef } [Non-Blocking]

在调用方 `Scope` 下创建子 `Scope`，并在子 `Scope` 内创建根 `Process`。
业务场景下，`Spawn` 默认创建 `StandardScope`。

- 前置条件：调用方 `Scope` 为 `Running`
- 效果：
  - 创建子 `Scope`：`S'`
  - 创建根 `Process`：`P'`，其初始 `Plan = blueprint()`
- `Closing`：调用失败

`Spawn` 扩展参数（如 `options`）与返回能力令牌（如 `capability`）当前不暴露，仍属设计待定项。

#### Fork(blueprint) -> { processRef } [Non-Blocking]

在调用方 `Scope` 内创建并行 `Process`。

- 前置条件：调用方 `Scope` 为 `Running`
- 效果：创建 `Process`：`P'`，`P'.Plan = blueprint()`，`P'` 初始为可运行
- `Closing`：调用失败

#### 创建治理 Scope（调度/裁决）[Non-Blocking]

内核支持通过 syscall 创建治理 `Scope`（`SchedulerScope` 与 `ReaperScope`），并建立其治理子树边界。该能力用于控制面编排，不等同于业务 `Spawn`。

该类 syscall 的具体命名、入参与可见性细则当前仍属待定项；稳定约束仅包括：

- 创建后的基础治理层级需满足 `ReaperScope -> SchedulerScope -> 执行子树根 Scope`。

#### 调用能力（待定）

当前版本不暴露公开 `Invoke` syscall。
是否以 `Invoke` 形态回归及其门控语义，仍属设计待定项。

### 5.2 调度推进（内核内部）

`EventQueue` 的入队由内核调度策略负责。当前版本不暴露公开 `Arm` syscall。
`Arm` 是否以公开 syscall 形态回归仍属设计待定项。
可运行 `Process` 由创建/恢复等语义事件产生，并由内核推进到执行循环。

### 5.3 控制与等待

#### Terminate(processRef) -> void [Non-Blocking]

令目标 `Process` 退出为 `Terminated`。

- 前置条件：目标 `Process` 属于调用方 `Scope`
- 效果：
  - 若目标尚未退出，则令其退出为 `Terminated`
  - 释放等待 `AwaitProcess(processRef)` 的阻塞者

#### Halt(fault?) -> Fault [Blocking]

令调用方 `Scope` 进入 `Closing`，并令调用方 `Process` 退出为 `Failed(Fault(halt))`。
`fault` 为可选携带负载：未提供时由执行引擎使用默认 halt fault；提供时由执行引擎将该负载并入 fault 语义。

- 效果：
  - 调用方 `Scope -> Closing`
  - 触发对后代 `Scope` 的终止级联
  - 调用方 `Process` 以 `Fault(halt)` 退出

#### AwaitProcess(processRef) -> { exit } [Blocking]

等待目标 `Process` 退出。

- 前置条件：目标 `Process` 属于调用方 `Scope`
- 效果：
  - 若目标已退出：返回 `exit`
  - 否则阻塞，目标退出时恢复并返回
- `exit`：
  - `{ kind: "completed", value }`
  - `{ kind: "failed", fault }`
  - `{ kind: "terminated" }`

`AwaitProcess` 返回 `failed` 仅表示调用方观察到了退出结果，不改变 `Failed` 已触发的 `Scope` 终止与祖先链传播。

#### AwaitScope(scopeRef) -> { exit } [Blocking]

等待目标 `Scope` 收敛到可观察终态。

- 前置条件：`scopeRef` 对调用方可见
- 效果：
  - 若目标以成功终态退出：返回 `{ kind: "completed", value }`
  - 若目标以失败终态退出：返回 `{ kind: "failed", fault }`
  - 若目标以终止终态退出：返回 `{ kind: "terminated" }`
  - 否则阻塞，目标到达上述状态时恢复并返回

`InLimbo` 属于结构状态，不作为 `AwaitScope` 的直接返回分支暴露；目标若进入 `InLimbo`，其可观察结果仍按 `failed/terminated` 终态收敛。

#### Receive() -> value [Blocking]

`Receive` 的语义为：从调用方 `Scope` 的 `Sink` 接收一个值。

- 若 `Sink` 非空：出队一个值并返回该值。
- 若 `Sink` 为空：阻塞，直到有值入队后恢复并返回该值。

#### Yield() -> void [Blocking]

调用方 `Process` 主动释放 `Processor`。

### 5.4 上下文与自省

#### Bind(key, value) -> void [Non-Blocking]

在调用方 `Scope` 的上下文中绑定值。

#### Lookup(key) -> value [Non-Blocking]

沿调用方 `Scope` 到其祖先链查找上下文绑定。

#### Self() -> { scopeRef, processRef } [Non-Blocking]

返回调用方的自省信息：

- `scopeRef`
- `processRef`

`Self.call` 字段当前不暴露；是否随入口调用能力一并回归，仍属设计待定项。

#### PollProcess(processRef) -> { exited, exit? } [Non-Blocking]

查询目标 `Process` 是否已退出；若已退出返回其退出信息。

#### PollScope(scopeRef) -> { status } [Non-Blocking]

查询目标 `Scope` 状态：

- `Running | Closing | Exited | InLimbo`

当前 `PollScope` 仅返回 phase，不返回退出原因；退出原因属于 `Scope` 语义状态，但不在该 syscall 的返回形状中暴露。
