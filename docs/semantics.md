# Kernel 语义

本文档是 kernel 执行语义的单源定义，涵盖对象模型、执行循环、收敛协议与 syscall 规范。

---

## 1. 对象模型

### 1.1 Plan 与 Blueprint

`Plan<T>` 是 kernel 的计算承载面，以 free monad 编码：

- **`PurePlan(value: T)`** — 终值节点。
- **`ImpurePlan(syscall, then)`** — 产出一条 syscall，携带成功续延 `then(value)`。

`Blueprint<T>` = `() => Plan<T>`，延迟构造 Plan 的 thunk。

`Syscall` 是非泛型基础对象契约，最小形状为 `{ kind: string; return?: readonly [unknown] }`。具体 syscall 通过 `return` tuple 声明返回值类型，`then` 的参数类型由 `SyscallReturn<S>` 从该见证推导。

cleanup 以 `Blueprint` 身份锚定：每次启动的 blueprint 入口注册一次 cleanup，由该入口对应的运行中 Plan 在中断/收敛时执行清理续延。

### 1.2 Fault 与失败通道

syscall 成功恢复值由 `then(value)` 承接。失败表达方式不做统一强制——是否以返回值、异常或其他形状表达，按具体 syscall 条目单独定义。

`Fault` 是带外终止事件。发生 Fault 时，目标 Process 立即退出，后续 continuation 不再执行。`Failed(fault)` 在 Scope 树上的传播策略由父 Scope 角色决定（见 §3.5）。

`halt` 触发的 fault 分层为：先形成 Process 的 `Failed(fault)`，再使该 Process 所属 Scope 进入 `Failed` 终态；是否继续影响父 Scope 由父角色策略决定（见 §3.5）。

### 1.3 Scope

Scope 是生命周期、身份与上下文的统一载体，承载父子关系与 Process 归属。每个 Scope 拥有唯一 `ScopeRef`（控制面 capability handle），Scope 构成严格树（除根外每个 Scope 恰有一个父 Scope）。

角色按语义来源分两层：

**kernel 原生角色**（语义由 kernel 直接定义）：

| 角色              | 职责                                          |
| ----------------- | --------------------------------------------- |
| `StandardScope`   | 普通编排角色，承载业务流程与默认并发分支。    |
| `SupervisorScope` | 终态收敛角色，把后代失败/终止收敛为带内结果。 |

**executor 衍生角色**（因 executor 架构需要而存在）：

| 角色             | 职责                                                |
| ---------------- | --------------------------------------------------- |
| `GovernorScope`  | 治理角色：承载 Scheduler/Reaper 两类 handler 策略。 |
| `ExecutionScope` | 执行入口能力角色（launch + terminate 语义）。       |
| `LimboScope`     | 结构性修剪承接角色（全局单例，见 §1.8）。           |

创建约束：`StandardScope`、`SupervisorScope`、`GovernorScope` 可由 syscall 创建；`ExecutionScope` 与 `LimboScope` 为系统保留，不作为 syscall 创建目标。

### 1.4 执行入口能力视图

执行入口能力视图由 executor 基于 Scope 派生：

| 视图                 | 能力                 | 句柄类型                |
| -------------------- | -------------------- | ----------------------- |
| `ExecutionScopeRoot` | 仅 `launch`          | `ExecutionScopeRootRef` |
| `ExecutionScope`     | `launch + terminate` | `ExecutionScopeRef`     |

依赖方向：executor 建立在 `Scope/Plan/Syscall` 之上；`syscalls/contracts` 不反向依赖 executor。

### 1.5 Process

Process 是 Plan 的动态实例。每个 Process 拥有唯一 `ProcessRef`，自创建起始终属于且仅属于一个 Scope。`ProcessRef` 与 `ScopeRef` 均为控制面引用。

Process 在生命周期收敛中存在参与属性（`participation`）：

- `tracked`：计入 Scope “变空”判定。
- `auxiliary`：不计入 Scope “变空”判定，仅作为附属并发单元存在。

### 1.6 Processor 与 EventQueue

`Processor` 是系统唯一的逻辑原子执行权令牌。`EventQueue` 存放可运行的 Process。

### 1.7 消息传递

`Channel<T>` 是 phantom-typed 不透明令牌，由 `channel<T>()` 创建，标识一条类型化消息通道，不绑定特定 Scope。持有令牌即具备发送或接收能力（capability 模型）。

每个 `(Scope, Channel)` 对隐式维护一条 **FIFO 消息队列（buffer）**，队列生命周期随 Scope 终结（Exited / InLimbo）而回收。

- **Send(scopeRef, channel, value)**：向目标 Scope 的 `(scope, channel)` buffer 追加消息。若有 Process 阻塞在 `Receive(channel)`，最早的等待者出队并恢复，消息由该接收者独占。`[Non-Blocking]`
- **Receive(channel)**：在调用方 Scope 上接收匹配 Channel 的消息。buffer 非空时出队最早的消息并立即返回；buffer 为空时阻塞直至下次匹配 Send。返回 `{ value, from: ScopeRef }`，`from` 为发送方进程所属 Scope。`[Blocking]`

每条消息恰好投递给一个接收者（单消费者语义）。多个 Process 阻塞在同一 `(Scope, Channel)` 时，最早阻塞的 Process 优先获得下一条消息。

消息队列在 kernel 语义层为逻辑无界；executor 实现可施加容量约束（超限触发 fault），此为实现策略而非语义定义。

消息传递协议的正确性不依赖调度顺序——Send 在 Receive 到达前执行时，值入 buffer 而非丢弃；Receive 在 Send 到达前执行时，阻塞等待。任意 Processor 数量与调度策略下行为一致。

### 1.8 Limbo

系统包含全局唯一的 `LimboScope` 单例。

- 常态下不发生 Scope 父子迁移。
- 仅当最近祖先 GovernorScope 的 reaper handler 给出 `Prune` 仲裁时，目标 Scope 从原树断开并挂接到 Limbo 下。
- 迁移保持被迁移子树的原子结构（仅变更根节点父指针），被迁移 Scope 状态变为 `InLimbo`。

---

## 2. 执行循环

微内核以迭代方式推进执行，每轮包含反应相与策略相。

### 2.1 调度原则：广度优先

当前持有 Processor 的 Process 连续解释其 Plan，直到遇到 `[Blocking]` syscall 或退出；`[Non-Blocking]` syscall（如 Spawn、Fork）创建的新 Process 进入 EventQueue 末端，不中断当前执行。

直接推论：

- 同一 Process 内的连续 Non-Blocking syscall 序列在一次 Processor 持有期间原子完成。
- Spawn/Fork 语义是"注册将来执行的 Process"，不是立即转移控制权。

### 2.2 反应相（Drain）

EventQueue 非空时重复：

1. 出队一个 Process P，授予 Processor。
2. 解释 P 的 Plan，直到：
   - P 执行 `[Blocking]` syscall 并让出 Processor；
   - P 达到 `Pure(value)` 并退出为 `Completed(value)`；
   - 发生 Fault，P 退出为 `Failed(fault)`。
3. Processor 回到微内核。

### 2.3 策略相（Schedule）

EventQueue 为空且 Processor 在微内核手中时：

1. 微内核以 Process 形式运行该 Scope 的 Scheduler。
2. Scheduler 选择可运行 Process 并送入 EventQueue。
3. Scheduler 让出 Processor 后进入下一轮反应相。

GovernorScope 的 scheduler handler 触发语义：

- scheduler handler 由治下 Scope 的就绪 Process 活动驱动触发。
- 每次触发仅针对一个就绪 Process 输入执行一次 handler。

---

## 3. 收敛与终止

### 3.1 终态模型

Process 与 Scope 均有三种互斥终态：

| 终态         | 含义               |
| ------------ | ------------------ |
| `Completed`  | 成功收敛           |
| `Terminated` | 被外部终止级联打断 |
| `Failed`     | 以 fault 失败      |

### 3.2 Scope 过程态

| 过程态    | 说明                                   |
| --------- | -------------------------------------- |
| `Running` | 正常运行。                             |
| `Closing` | 正在关闭；终态在进入时确定并不再改变。 |
| `Exited`  | 所有 Process 已退出。                  |
| `InLimbo` | 被修剪到 Limbo 下。                    |

### 3.3 进入 Closing

触发条件（任一即可）：

- Scope 内任一 Process 执行 `Halt()` 并以 `Failed(fault)` 退出
- Scope 内任一 Process 以 `Failed(fault)` 退出
- 从后代链路接收到 `Failed(fault)` 传播（仅适用于传播策略的角色）
- 从祖先 Scope 收到终止级联
- Scope 变空（不再包含任何 `tracked` Process）

终态判定：

- 由本地 Failed 或后代失败传播触发 → 终态为 **Failed**
- 仅由祖先终止级联触发 → 终态为 **Terminated**
- 已确定为 Failed 后，后续终止级联不改写为 Terminated

进入 Closing 时，终止级联传播到所有后代 Scope。所有 Process 退出后，Scope 进入 Exited。

### 3.4 Closing 门控

调用方 Scope 为 Closing 时：`Spawn/Fork` 失败；其他 syscall 按定义执行。

### 3.5 终态上传策略

子 Scope 终态向父 Scope 上传按父角色语义处理：

- **非 SupervisorScope**：传播策略——后代 `Failed` 导致父 Scope 进入 Closing（终态 Failed），继续沿祖先链传播。
- **SupervisorScope**：收敛策略——后代 `failed/terminated` 不升级为祖先失败，本地收敛为可观察带内结果。

`terminated` 与 `failed` 语义始终分离：后代 `terminated` 不被重写为祖先 `failed`。

`AwaitScope`（以及待定的 `AwaitProcess`）仅提供结果可见性，不构成对上传策略的拦截。

### 3.6 结构性收敛：Reaper

当 Scope 处于 Closing 且终止无法推进到 Exited 时，微内核运行其最近祖先 GovernorScope 的 reaper handler。仲裁决定：

- `none`：继续等待 cleanup 自行收敛（Wait）。
- `some(failure)`：执行结构性修剪（Prune）：将待清理后代 Scope 子树断开并挂接到 Limbo，并以该 `failure` 使治理边界进入 Failed。

GovernorScope 的 reaper handler 触发语义：

- reaper handler 不因常规就绪活动触发。
- 仅在目标 Scope 已进入 Closing 且完成一次面向治下 Process 的终止推进（terminate pass）后触发。
- 每次触发仅针对一个临时挂起 Process 输入执行一次 handler。

---

## 4. Syscall 协议

### 4.1 声明与解释边界

`syscalls/` 提供 syscall **声明对象**（指令形状），表达"要做什么"与"返回值形状"。对象本身不具备解释能力；解释、调度与状态变更由 executor 完成。

### 4.2 原子性

executor 解释到 syscall 时，以微内核一个原子步骤处理之，效果在步骤结束后可见。

### 4.3 阻塞分类

- **`[Non-Blocking]`**：调用方保留 Processor，continuation 立刻继续。
- **`[Blocking]`**：调用方释放 Processor，阻塞条件满足时微内核恢复该 Process。

---

## 5. Syscall 规范

可见性规则：以 `ProcessRef` 为目标的操作要求目标 Process 属于调用方 Scope；以 `ScopeRef` 为目标的操作要求该 ScopeRef 对调用方可见。

### 5.1 创建

#### Spawn(blueprint, spec?) → { scopeRef, processRef } `[Non-Blocking]`

在调用方 Scope 下创建子 Scope 与根 Process。默认创建 `StandardScope`，可通过 `spec` 指定角色。

- 前置：调用方 Scope 为 Running。
- Closing 时：调用失败。

#### Fork(blueprint, options?) → { processRef } `[Non-Blocking]`

在调用方 Scope 内创建并行 Process。

- 前置：调用方 Scope 为 Running。
- Closing 时：调用失败。
- `options.participation`：`tracked | auxiliary`，默认 `tracked`。两者语义见 §1.5；Scope “变空”触发见 §3.3。

#### 治理 Scope 创建 `[Non-Blocking]`

kernel 支持通过 syscall 创建 `GovernorScope` 与 `SupervisorScope`。`SupervisorScope` 通过 `Spawn(blueprint, spec)` 创建（`spec.role = "supervisor"`）。基础治理层级需满足 `GovernorScope → 执行子树根 Scope`。

治理角色的 `spec` 契约：

- `GovernorScopeSpec`：`spec.role = "governor"`，并携带 `capabilities`（sum type）：
- `coverage = "scheduler"`：只提供 `scheduler(readyProcess) => Plan<Processor>`。
- `coverage = "reaper"`：只提供 `reaper(suspendedProcess) => Plan<Option<Failure>>`。
- `coverage = "full"`：同时提供 `scheduler + reaper` 两类 handler。

### 5.2 调度推进（内核内部）

EventQueue 入队由内核调度策略负责。可运行 Process 由创建/恢复等语义事件产生并推进到执行循环。

### 5.3 控制与等待

#### Halt(fault?) → Fault `[Blocking]`

调用方 Process 以 `Fault(halt)` 退出。该 Process 的 `Failed(fault)` 使其所属 Scope 进入 Closing（终态 Failed），并触发对后代 Scope 的终止级联。`fault` 为可选携带负载。

#### AwaitScope(scopeRef) → { exit } `[Blocking]`

等待目标 Scope 收敛到可观察终态。

- 前置：scopeRef 对调用方可见。
- 返回 exit：`{ kind: "completed", value }` | `{ kind: "failed", fault }` | `{ kind: "terminated" }`

`InLimbo` 为结构状态，不作为返回分支暴露；进入 InLimbo 的目标按 `failed/terminated` 终态收敛。不改变失败上传语义。

#### Send(scopeRef, channel, value) → void `[Non-Blocking]`

向目标 Scope 的 `(scope, channel)` buffer 追加消息。若有 Process 阻塞在 `Receive(channel)`，最早的等待者出队并恢复，消息由该接收者独占。

- 前置：scopeRef 对调用方可见。

#### Receive(channel) → { value, from } `[Blocking]`

在调用方 Scope 上接收匹配 Channel 的消息。buffer 非空时出队最早的消息并立即返回；buffer 为空时阻塞。`from` 为发送方所属 Scope 的 ScopeRef。

#### Cede() → void `[Blocking]`

调用方 Process 主动释放 Processor（协作式让权）。

#### 待定 syscall（概念保留）

以下 syscall 当前保留为语义占位，具体对象形态（签名、返回值、阻塞分类与可见性约束）待 executor、scheduler 与 reaper 策略定稿后回填：

- `Terminate(processRef)`
- `AwaitProcess(processRef)`
- `PollProcess(processRef)`
- `PollScope(scopeRef)`

### 5.4 上下文与自省

#### Bind(key, value) → void `[Non-Blocking]`

`key` 为 phantom-typed 不透明令牌（`ContextKey<T>`，由 `contextKey<T>()` 创建）。在调用方 Scope 上下文中绑定值。

#### Lookup(key) → value | undefined `[Non-Blocking]`

沿调用方 Scope 到祖先链查找上下文绑定。未命中时返回 `undefined`。

#### Self() → { scopeRef, processRef } `[Non-Blocking]`

返回调用方自省信息。

---

## 6. Primitives

### 6.1 定位

Primitive 是 kernel 在 syscall 之上提供的 **Plan 层代数组合**，每个 primitive 产出 `Plan<T>`，由一条或多条 syscall 步骤组合而成。

primitive 的价值：

- **组合稳定性**：把正确的并发模式固化为 Plan 片段，消费方无需自行拼装 syscall 序列。
- **封装 Process 脆弱性**：syscall 层暴露的 `Fork` 与待定的 Process 级操作（如 `Terminate(processRef)`、`AwaitProcess`）被封装在 primitive 内部（如 `spawn` 丢弃 `ProcessRef` 只返回 `ScopeRef`），用户操控粒度始终为 Scope。

primitive 不等于 syscall：

- syscall 是微内核的原子指令，由 executor 解释。
- primitive 是 Plan 片段的组合器，在 Plan 代数内完成，不引入新的 executor 解释分支。

### 6.2 失败通道

涉及子 Scope 生命周期等待的 primitive 统一以 `Either<Failure, T>` 表达失败：`Right` 为成功值，`Left` 为失败/终止载荷。该 Either 由 primitive 对等待结果（`ScopeExit`）的显式收敛逻辑构造——`completed → Right`，`failed → Left(fault)`，`terminated → Left(scopeTerminated)`。

这一分层使 kernel 层的失败保持可组合、可推理，而不依赖宿主异常机制。runtime 在适配边界统一解包 Either，将 Left 收敛为异常抛出。

### 6.3 并发构造 primitives

#### all(branches) → Plan\<Either\<Failure, T\>\>

聚合等待多个分支。组合方式：

1. 创建 `SupervisorScope` 作为隔离容器。
2. 在其中对每个 branch 调用 `Spawn` 创建子 Scope。
3. 对每个子 Scope 调用 `AwaitScope` 等待终态（supervisor 内部直接 narrow 为 completed）。
4. 整体通过 `awaitScopeConverged` 收敛外层 supervisor 的终态为 Either。

#### race(branches) → Plan\<Either\<Failure, ArrayValues\<T\>\>\>

选择最先完成者，触发其余分支收敛。组合方式：

1. 创建 `SupervisorScope`（arena）。
2. arena 内部为每个 branch 创建子 Scope；每个 branch 完成后通过 `Send(raceChannel)` 向调用方发送结果，并以 `Send(haltChannel)` 通知 arena 终止。
3. arena 通过 `Receive(haltChannel)` 等待首个消息后执行 `Halt`，触发剩余分支级联终止。
4. 调用方 Fork 一个后备 Process 等待 arena 收敛——若所有 branch 均失败（无人成功 Send），后备 Process 将 arena 的失败终态转发给调用方。
5. 调用方通过 `Receive(raceChannel)` 取得首个结果。

#### scoped(plan) → Plan\<Either\<Failure, T\>\>

创建 `SupervisorScope` 子 Scope 并立即等待其收敛。

#### resource(body) → Plan\<Either\<Failure, T\>\>

创建资源作用域。body 接收 `provide: (value) → Plan<never>`；调用方等待 provide 的首个值作为返回，资源作用域在 provide 后持续挂起，在父 Scope 回收时清理。

#### resumable(plan) → Plan\<Either\<Failure, T\>\>

在 scoped body 内声明可恢复边界。`resumable` 在失败时查找 `resumableDelegateKey`：

- 未命中：失败保持为 `Left(failure)`。
- 命中：向委派点发送失败并等待恢复结果（`Either<Failure, T>`）带内返回。

### 6.4 等待与控制 primitives

#### spawn(plan, options?) → Plan\<ScopeRef\>

封装 Spawn syscall，创建子 Scope 并返回 ScopeRef（丢弃 ProcessRef）。

- 默认：创建 StandardScope。
- `options.mode = "supervisor"`：创建 SupervisorScope，在该边界内收敛后代失败/终止。
- `options.mode = "recovery"`：创建 StandardScope，在子 Scope 内建立 `resumable` 恢复委派点：绑定 `resumableDelegateKey`，接收失败请求并回发恢复结果。

#### join(scopeRef) → Plan\<Either\<Failure, T\>\>

等待目标 Scope 终态并收敛为 Either。

#### halt(fault?) → Plan\<never\>

封装 Halt syscall，触发当前 Process 失败，并由该失败驱动所属 Scope 失败与后续级联。

#### suspend() → Plan\<never\>

持续挂起当前 Process，直到父 Scope 回收清理阶段以失败路径唤醒。

#### cede() → Plan\<void\>

封装 Cede syscall，协作式让权。

### 6.5 上下文与自省 primitives

#### bind(key, value) → Plan\<void\>

在当前 Scope 绑定值。`key` 为 `ContextKey<T>` 令牌，由 `contextKey<T>()` 创建。

#### lookup(key) → Plan\<T | undefined\>

沿祖先链查找值；未命中时返回 `undefined`。

#### self() → Plan\<SelfDescriptor\>

返回当前执行实体的自省信息。
