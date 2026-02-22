# khora 语义

## 1. 核心对象

### 1.1 Plan 与 Blueprint

`Plan<T>` 为二者之一：

- `Pure(value: T)`
- `Impure(syscall: Syscall<A>, then: (value: A) => Plan<T>, terminate: () => Plan<T>)`

`Blueprint<T>` 为 `() => Plan<T>`。

### 1.2 响应通道与 Fault

syscall 的成功恢复值由 `then(value)` 承接。本文档不定义统一失败塑形：失败是否作为返回值、异常或其他形状表达，按具体 syscall 条目单独记录。

`Fault` 为带外终止事件。发生 `Fault` 时，目标 `Process` 立即退出，后续 continuation 不再执行。
错误编码与失败值形状由具体 syscall 语义定义。

### 1.3 Scope（统一对象与角色分层）

`Scope` 是生命周期、身份与上下文的统一载体。

每个 `Scope` 都有唯一 `ScopeRef`，且 `Scope` 构成严格树：除根以外的每个 `Scope` 恰有一个父 `Scope`。
`ScopeRef` 是控制面引用（capability handle），用于执行与治理相关操作；`id` 若存在仅用于观测，不进入控制面契约。

- `Scope` 作为统一对象，承载身份、父子关系、上下文边界与 `Process` 归属。

角色分层：

- `SchedulerScope`：调度编排角色（对应 `Scheduler` 职责）。
- `ReaperScope`：终止收敛仲裁角色（对应 `Reaper` 职责）。
- `IngressScope`：宿主或 runtime 输入通道角色（对应 `Sink/PostFn`）；只承载输入投递语义，不承载执行入口生命周期控制语义。
- `PortalScope`：能力投放角色（通过 `Capability -> Portal` 被其他 `Scope` 触发任务，驱动其内部 `Process` 与后续 `syscall` 推进）。

### 1.4 执行入口能力视图与依赖方向

执行入口能力视图由 executor 基于 `Scope` 派生：

- `ExecutionScopeRoot`：仅具备 `launch` 能力，不具备 `terminate` 能力。
- `ExecutionScope`：成对具备 `launch + terminate` 能力。

依赖方向固定为：`executor` 建立在 `Scope/Plan/Syscall` 等基础语义之上，`syscalls/contracts` 不反向依赖 `executor`。

### 1.5 Process 与 Call 信息

`Process` 是 `Plan` 的动态实例。

- 每个 `Process` 有唯一 `ProcessRef`
- 每个 `Process` 自创建起始终属于且仅属于一个 `Scope`

`ProcessRef` 与 `ScopeRef` 一样属于控制面引用；`id` 若存在仅作为日志与追踪用途，不作为 syscall 入参或权限依据。

当 `Process` 由入口调用创建时，它可携带不可变的调用信息（当前版本该创建路径待定）：

`call = { method: string, args: any[] }`

### 1.6 Processor 与 EventQueue

`Processor` 是系统中唯一的逻辑原子执行权令牌，`EventQueue` 是微内核内部队列，用于存放可运行的 `Process`。

### 1.7 Portal、Capability、Sink、PostFn

`Portal` 是 `Scope` 所拥有的入口映射（`{ methodName: Blueprint<any> }`）。`Capability` 是不可伪造令牌，绑定到某个 `Scope` 的 `Portal`。具备 `Portal + Capability` 投放面的 `Scope` 在角色上属于 `PortalScope`。`Sink` 是 `Scope` 的 `IngressScope` 通道（FIFO 值缓冲），`PostFn` 是宿主可调用函数，用于把值入队到某个 `Scope` 的 `IngressScope`。`IngressScope` 语义只覆盖该输入通道与 `post` 投递配对，不覆盖 `terminate` 生命周期控制。

### 1.8 Limbo 与孤儿 Scope

系统包含一个特殊 `Scope`：`Limbo`。

当一个 `Scope` 因结构性收敛被从其父 `Scope` 的树中移除并挂接到 `Limbo` 之下时，该 `Scope` 变为孤儿 `Scope`，其状态为 `InLimbo`。

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

### 3.1 Process 退出形态

`Process` 退出后处于以下形态之一：

- `Completed(value)`
- `Failed(fault)`
- `Terminated`

`AwaitProcess` 以该形态作为返回值。

### 3.2 Scope 状态

- `Running`
- `Terminating`
- `Exited`
- `InLimbo`

### 3.3 进入终止与级联

`Scope` 进入 `Terminating` 的条件：

- 在该 `Scope` 内执行 `Halt()`
- 从祖先 `Scope` 收到终止级联
- 该 `Scope` 变为空（不再包含任何 `Process`）

进入 `Terminating` 时，终止级联传播到所有后代 `Scope`。

当一个 `Scope` 的所有 `Process` 都退出后，该 `Scope` 进入 `Exited`。

### 3.4 终止门控

当调用方所在 `Scope` 为 `Terminating`：

- `Spawn / Fork` 会失败
- 其他 syscalls 按其定义执行

`Invoke` 相关终止门控语义（若未来回归公开 syscall）仍属待定项。

### 3.5 未处理 Fault 触发终止

在同一个 `Scope` 中，若某 `Process` 以 `Failed(fault)` 退出，且没有任何 `Process` 通过 `AwaitProcess` 观察到该退出结果，则该 `Scope` 进入 `Terminating`。

### 3.6 结构性收敛：Reaper 与孤儿

当某个 `Scope` 为 `Terminating` 且其终止无法推进到 `Exited` 时，微内核运行该 `Scope` 的 `Reaper`。语义上该收敛仲裁职责归于 `ReaperScope`，与 `SchedulerScope` 分离。

`Reaper` 通过 syscalls 得到系统观测，并产出一个仲裁决定：

- `Wait`：继续等待该 `Scope` 自行收敛
- `Prune`：对该 `Scope` 的后代树进行结构性修剪以保证收敛

当决定为 `Prune` 时，微内核执行结构性修剪：

- 选择若干叶子后代 `Scope`
- 将其从原树断开并挂接到 `Limbo` 下
- 被修剪的 `Scope` 进入 `InLimbo`，成为孤儿 `Scope`

结构性修剪的效果是：被修剪的后代不再阻塞原祖先 `Scope` 的退出，祖先 `Scope` 的终止流程可继续推进到 `Exited`。

---

## 4. Syscall 协议

### 4.1 原子性

每个 syscall 以微内核的一个原子步骤执行；其效果在该步骤结束后对系统可见。

### 4.2 阻塞分类

`[Non-Blocking]` 表示调用方保留 `Processor`，其 continuation 立刻继续。`[Blocking]` 表示调用方释放 `Processor`，当阻塞条件满足时由微内核恢复该 `Process`。

---

## 5. Syscalls

本节仅描述 syscall 协议与效果，不展开执行入口能力语义。

可见性规则：

以 `ProcessRef` 为目标的操作要求目标 `Process` 属于调用方所在 `Scope`。`Spawn` 返回的 `ScopeRef` 对调用方可见。目标 `ScopeRef` 若不对调用方可见，则相关操作失败。

### 5.1 创建（含待定调用能力）

#### Spawn(blueprint) -> { scopeRef, rootProcessRef, post } [Non-Blocking]

在调用方 `Scope` 下创建子 `Scope`，并在子 `Scope` 内创建根 `Process`。

- 前置条件：调用方 `Scope` 为 `Running`
- 效果：
  - 创建子 `Scope`：`S'`
  - 创建根 `Process`：`P'`，其初始 `Plan = blueprint()`
  - 返回 `PostFn`（绑定 `S'.Sink`）
- `Terminating`：调用失败

`Spawn` 扩展参数（如 `options`）与返回能力令牌（如 `capability`）当前不暴露，仍属设计待定项。

#### Fork(blueprint) -> { processRef } [Non-Blocking]

在调用方 `Scope` 内创建并行 `Process`。

- 前置条件：调用方 `Scope` 为 `Running`
- 效果：创建 `Process`：`P'`，`P'.Plan = blueprint()`，`P'` 初始为可运行
- `Terminating`：调用失败

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

#### Halt() -> Fault [Blocking]

令调用方 `Scope` 进入 `Terminating`，并令调用方 `Process` 退出为 `Failed(Fault(halt))`。

- 效果：
  - 调用方 `Scope -> Terminating`
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

#### AwaitScope(scopeRef) -> { exit } [Blocking]

等待目标 `Scope` 退出或被结构性修剪。

- 前置条件：`scopeRef` 对调用方可见
- 效果：
  - 若目标为 `Exited`：返回 `{ kind: "exited" }`
  - 若目标为 `InLimbo`：返回 `{ kind: "pruned_to_limbo" }`
  - 否则阻塞，目标到达上述状态时恢复并返回

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

- `Running | Terminating | Exited | InLimbo`
