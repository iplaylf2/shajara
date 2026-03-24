# Kernel 语义

本文档是 kernel 执行语义的单源定义，涵盖对象模型、执行循环、收敛协议与 sigil 规范。

---

## 1. 核心语义

Shajara 中显现为一缕 **wisp**。

**stirring** 的 wisp 带着一枚 **sigil**，也携着它的 **resonate**。施法者见 sigil 而得 **echo**，再以这个 echo 与 wisp 共振，于是继续牵出新的 wisp。

**resting** 的 wisp 不再继续牵引 echo，而是留下一个 **relic**，安住下来。

从一个空参数的起始咒式出发，沿着这些 wisp，在 echo 与 wisp 的共振中不断展开，直到最终留下 relic，这整场过程就是一次 **ritual**。

---

## 2. 对象模型

### 2.1 Wisp 与 Ritual

`Wisp<T>` 是 kernel 的计算承载面，以 free monad 编码：

- **`RestingWisp(relic: T)`** — 留下 relic 并安住。
- **`StirringWisp(sigil, resonate)`** — 带出一枚 sigil，并等待 echo 继续牵引后续 Wisp。

`Ritual<T>` = `() => Wisp<T>`，延迟构造 Wisp 的 thunk。

`Incantation<Args, Relic>` 表示给定参数后显现一段 `Wisp<Relic>` 的咒式；`Ritual<T>` 是 `Incantation<[], T>`。`Resonance<S, Relic>` 则是接收 `Echo<S>` 后继续显现的续行咒式。

`Sigil` 是非泛型基础对象契约，最小形状为 `{ kind: string; return?: readonly [unknown] }`。具体 sigil 通过 `return` tuple 声明 echo 类型，`Echo<S>` 从该见证推导。

cleanup 以 `Ritual` 身份锚定：每次启动的 ritual 入口可在其 process 内通过 `Defer` 注册清理 ritual。process 先建立自己的终态与结果收敛，随后运行时自动触发已注册的 cleanup。

### 2.2 Failure 与失败通道

sigil 成功恢复值由 `resonate(echo)` 承接。失败表达方式不做统一强制：是否以返回值、异常或其他形状表达，按具体 sigil 条目单独定义。

`Failure` 是失败事件。发生 Failure 时，目标 Process 立即退出，后续 continuation 不再执行。`Failed(failure)` 在 Scope 树上的传播策略由父 Scope 的 `failureMode` 决定（见 §4.5）。

`halt` 触发的 failure 分层为：先形成 Process 的 `Failed(failure)`，再使该 Process 所属 Scope 进入 `Failed` 终态；是否继续影响父 Scope 由父 Scope 的 `failureMode` 决定（见 §4.5）。

### 2.3 Scope

Scope 是生命周期、身份与上下文的统一载体，承载父子关系与 Process 归属。每个 Scope 拥有唯一 `ScopeRef`（控制面 capability handle），Scope 构成严格树（除根外每个 Scope 恰有一个父 Scope）。

文档中提到“边界”时，指的是某段计算对应的 Scope。需要精确指称时，以 `Scope` 为准：生命周期、上下文继承、future 归属与失败传播范围，都由该 Scope 承载。

`ScopeRef` 显式携带 `exitFuture`。它本身只是一个 `FutureKey<T>`，用于观察该 Scope 入口结果的收敛。

每个 Scope 在创建时都带有一份只读的 `ScopeDescriptor`。它不是运行中可变更的配置，而是该 Scope 身份的一部分；对象创建后不再改写。

当前 `ScopeDescriptor` 中稳定进入 kernel 语义的字段只有一条：**failure 是否向父 Scope 上传**。

这一字段由 `FailureMode` 表达：

| `FailureMode` | 含义                                                       |
| ------------- | ---------------------------------------------------------- |
| `propagate`   | 后代 `failed` 继续沿祖先链上传；这是默认的结构化并发边界。 |
| `contain`     | 后代 `failed/canceled` 在本地收敛。                        |

`FailureMode` 承载的就是 `ScopeDescriptor` 中这条稳定语义边界。

除上述字段外，本节不再为 `ScopeDescriptor` 定义其他稳定语义。

### 2.4 Process

Process 是 Wisp 的动态实例。每个 Process 拥有唯一 `ProcessRef`，自创建起始终属于且仅属于一个 Scope。`ProcessRef` 与 `ScopeRef` 均为控制面引用。

`ProcessRef` 也显式携带 `exitFuture`。它本身只是一个 `FutureKey<T>`，用于观察该 Process 结果的收敛。

每个 Process 在创建时都带有一份只读的 `ProcessDescriptor`。它同样是创建期固定的声明信息，而不是运行中可重配的参数集合。

当前 `ProcessDescriptor` 中稳定进入 kernel 语义的字段是 `CompletionMode`：

- `structural`：参与 Scope 的完成判定。
- `detached`：不参与 Scope 的完成判定。

### 2.5 Processor 与 EventQueue

`Processor` 是系统唯一的逻辑原子执行权令牌。`EventQueue` 存放可运行的 Process。

kernel 的最小驱动模型是 FIFO queue：可运行 Process 按入队顺序推进。系统若需要更复杂的调度策略，可在这个最小模型之上追加组织。

### 2.6 MessageKey 与消息传递

`MessageKey<T>` 是 phantom-typed 不透明令牌，由 `messageKey<T>()` 创建。它标识 Scope 内 mailbox 的匹配 key。持有令牌即具备发送或接收能力（capability 模型）。

mailbox 语义用于表达显式消息协议；future 与 `Scope` 承担结果收敛和结构化并发的主路径。

每个 `(Scope, MessageKey)` 对隐式维护一条 **FIFO 消息队列（buffer）**，队列生命周期随 Scope 终结（Exited / InLimbo）而回收。

- **Send(scopeRef, messageKey, value)**：向目标 Scope 的 `(scope, messageKey)` buffer 追加消息。若有 Process 阻塞在 `Receive(messageKey)`，最早的等待者出队并恢复，消息由该接收者独占。`[Non-Blocking]`
- **Receive(messageKey)**：在调用方 Scope 上接收匹配 `messageKey` 的消息。buffer 非空时出队最早的消息并立即返回；buffer 为空时阻塞直至下次匹配 Send。返回 `value`。`[Blocking]`

每条消息恰好投递给一个接收者（单消费者语义）。多个 Process 阻塞在同一 `(Scope, MessageKey)` 时，最早阻塞的 Process 优先获得下一条消息。

消息队列在 kernel 语义层为逻辑无界；具体实现可施加容量约束（超限触发 failure），此为实现策略而非语义定义。

消息传递协议的正确性不依赖调度顺序——Send 在 Receive 到达前执行时，值入 buffer 而非丢弃；Receive 在 Send 到达前执行时，阻塞等待。任意 Processor 数量与调度策略下行为一致。

### 2.7 FutureKey / FutureSettleKey 与单次收敛

`FutureKey<Value>` 与 `FutureSettleKey<Value>` 是成对出现的 phantom-typed 不透明令牌，其中 `Value` 表示成功值类型。它们共同标识 owner Scope 内一个 **单次收敛槽位**。

普通 future 由当前 Scope 通过 `Future()` sigil 创建。创建后得到一对 key：`[FutureKey, FutureSettleKey]`。future 本体的生命周期仍附着于 owner Scope。

每个 `(ownerScope, FutureKey, FutureSettleKey)` 组三元关系隐式维护一个二态单元：

- `pending`：尚未收敛
- `settled(value)`：已以某个 `Either<Failure, T>` 结果收敛

future 的语义中心是“同一结果可被重复观察”：

- `Wait(futureKey)`：等待该 future 收敛，并返回同一个 settled 结果
- `Poll(futureKey)`：非阻塞观察；未收敛返回 `None`，已收敛返回 `Some(result)`
- `Settle(futureSettleKey, result)`：将 pending future 收敛为某个结果

与 `MessageKey` 不同，future 不具备 FIFO、buffer 或单消费者语义。多个 Process 可以同时等待同一个 future；收敛后所有观察者都得到同一结果值。

能力边界由 key 形状直接表达：`FutureKey` 只用于观察，`FutureSettleKey` 只用于收敛。settle 权限仍受 Scope 谱系约束：只有 owner Scope 或其后代 Scope 才能对该 future 执行 `Settle`。

owner Scope 在确认进入最终收敛时，会把仍为 pending 的 future 统一强制收敛为 canceled。因此 `FutureKey<T>` / `FutureSettleKey<T>` 的内部结果域固定为 `Either<Failure, T>`。

`ScopeRef.exitFuture` 与 `ProcessRef.exitFuture` 复用同一 future 观察协议；成功值分别对应 Scope / Process 自身的结果值。

### 2.8 结构性修剪承接位

若系统支持结构性修剪，则需要维护一个全局承接位来接住被剪下的 Scope 子树。

- 常态下不发生 Scope 父子迁移。
- 仅当系统决定执行 `Prune` 时，目标 Scope 从原树断开并挂接到该承接位下。
- 迁移保持被迁移子树的原子结构（仅变更根节点父指针），被迁移 Scope 状态变为 `InLimbo`。

---

## 3. 执行循环

微内核以迭代方式推进执行；其最小驱动形态是 FIFO queue。

### 3.1 调度原则：广度优先

当前持有 Processor 的 Process 连续解释其 Wisp，直到遇到 `[Blocking]` sigil 或退出；`[Non-Blocking]` sigil（如 Branch、Spawn）创建的新 Process 进入 EventQueue 末端，不中断当前执行。

直接推论：

- 同一 Process 内的连续 Non-Blocking sigil 序列在一次 Processor 持有期间原子完成。
- Branch/Spawn 语义是“注册将来执行的 Process”。

### 3.2 反应相（Drain）

EventQueue 非空时重复：

1. 出队一个 Process P，授予 Processor。
2. 解释 P 的 Wisp，直到：
   - P 执行 `[Blocking]` sigil 并让出 Processor；
   - P 达到 `RestingWisp(value)` 并退出为 `Completed(value)`；
   - 发生 Failure，P 退出为 `Failed(failure)`。
3. Processor 回到微内核。

### 3.3 就绪推进

FIFO queue 是 kernel 语义的最小闭环。

---

## 4. 收敛与终止

### 4.1 终态模型

Process 与 Scope 均有三种互斥终态：

| 终态         | 含义               |
| ------------ | ------------------ |
| `Completed`  | 成功收敛           |
| `Terminated` | 被外部终止级联打断 |
| `Failed`     | 以 failure 失败    |

### 4.2 Scope 过程态

| 过程态    | 说明                                   |
| --------- | -------------------------------------- |
| `Running` | 正常运行。                             |
| `Closing` | 正在关闭；终态在进入时确定并不再改变。 |
| `Exited`  | 所有 Process 已退出。                  |
| `InLimbo` | 被修剪到 Limbo 下。                    |

### 4.3 进入 Closing

触发条件（任一即可）：

- Scope 内任一 Process 执行 `Halt()` 并以 `Failed(failure)` 退出
- Scope 内任一 Process 以 `Failed(failure)` 退出
- 从后代链路接收到 `Failed(failure)` 传播（仅适用于 `failureMode = "propagate"` 的 Scope）
- 从祖先 Scope 收到终止级联
- Scope 变空（不再包含任何 `structural` Process）

终态判定：

- 由本地 Failed 或后代失败传播触发 → 终态为 **Failed**
- 仅由祖先终止级联触发 → 终态为 **Terminated**
- 已确定为 Failed 后，后续终止级联不改写为 Terminated

进入 Closing 时，终止级联传播到所有后代 Scope。所有 Process 退出后，Scope 进入 Exited。

### 4.4 Closing 门控

Scope 未进入终态时，`Branch/Spawn` 仍可继续创建成员；进入终态后不再创建新成员。非法状态组合属于运行时错误。

### 4.5 终态上传策略

子 Scope 终态向父 Scope 上传按父 Scope 的 `failureMode` 处理：

- **`propagate`**：后代 `Failed` 导致父 Scope 进入 Closing（终态 Failed），继续沿祖先链传播。
- **`contain`**：后代 `failed/canceled` 在本地收敛。

`canceled` 与 `failed` 分别表示取消级联与失败传播。

kernel 的结构化并发以 `failureMode = "propagate"` 为默认形态；`contain` 承担显式收敛边界的职责。

`Wait(scope.exitFuture)` / `Wait(process.exitFuture)` 只提供结果观察。

### 4.6 结构性收敛：Prune

当 Scope 处于 Closing 且终止无法推进到 Exited 时，系统可以追加结构性修剪。仲裁决定：

- `none`：继续等待 cleanup 自行收敛（Wait）。
- `some(failure)`：执行结构性修剪（Prune）：将待清理后代 Scope 子树断开并挂接到结构性修剪承接位，并以该 `failure` 使治理边界进入 Failed。

---

## 5. Sigil 协议

### 5.1 声明与解释边界

`sigils/` 提供 sigil **声明对象**（指令形状），表达"要做什么"与"echo 形状"。运行时读取这些对象并推进状态。

### 5.2 原子性

运行时解释到 sigil 时，以微内核一个原子步骤处理之，效果在步骤结束后可见。

这里的“一个原子步骤”只覆盖 sigil 解释本身：

- 对能立刻得到 echo 的 sigil，该步产出 echo，并把对应 `resonate` 排入待执行 continuation。
- 对 `[Blocking]` sigil，该步只完成阻塞登记；对应的 `resonate` 在恢复信号到来后转成待执行 continuation，并由后续独立步进执行。

### 5.3 阻塞分类

- **`[Non-Blocking]`**：调用方保留 Processor，并立即得到可供后续 `resonate` 使用的 echo。
- **`[Blocking]`**：调用方释放 Processor；阻塞条件满足时微内核只恢复该 Process 的 continuation 可执行性，不在恢复瞬间直接执行 `resonate`。

---

## 6. Sigil 规范

可见性规则：以 `ProcessRef` 为目标的操作要求目标 Process 属于调用方 Scope；以 `ScopeRef` 为目标的操作要求该 ScopeRef 对调用方可见。

### 6.1 创建

#### Branch(ritual, descriptor?) → { scope, process } `[Non-Blocking]`

在调用方 Scope 下创建子 Scope 与根 Process。若未显式给出 descriptor，则使用默认 `ScopeDescriptor`；其中稳定进入 kernel 语义的默认字段是 `failureMode = "propagate"`。

- 前置：调用方 Scope 尚未进入终态。

#### Spawn(worker, descriptor?) → process `[Non-Blocking]`

在调用方 Scope 内创建并行 Process。

- 前置：调用方 Scope 尚未进入终态。
- 若未显式给出 descriptor，则使用默认 `ProcessDescriptor`；其中稳定进入 kernel 语义的默认字段是 `completionMode = "structural"`。两者语义见 §2.4；Scope “变空”触发见 §4.3。

### 6.2 调度推进（内核内部）

EventQueue 入队由内核调度策略负责。可运行 Process 由创建/恢复等语义事件产生并推进到执行循环。

### 6.3 控制与等待

#### Halt(failure?) → Failure `[Blocking]`

调用方 Process 以 `Failed(failure)` 语义退出。该 Process 的 `Failed(failure)` 使其所属 Scope 进入 Closing（终态 Failed），并触发对后代 Scope 的终止级联。`failure` 为可选携带负载。

#### Future() → [futureKey, futureSettleKey] `[Non-Blocking]`

在调用方 Scope 内创建一个 pending future，并返回其 `[FutureKey<Value>, FutureSettleKey<Value>]`。

- future 的内部结果形状固定为 `Either<Failure, Value>`。
- owner Scope 固定为创建时的当前 Scope。

#### Wait(futureKey) → result `[Blocking]`

等待目标 future 收敛。

- 前置：futureKey 对调用方可见。
- 返回 result：`Either<Failure, T>`
- 多个观察者可同时等待；future 收敛后都恢复到同一个结果。

通过 `ScopeRef.exitFuture` / `ProcessRef.exitFuture` 观察时，`Wait` 的返回值仍是 `Either<Failure, T>`。进入 `InLimbo` 的目标最终也通过同一协议收敛。

#### Poll(futureKey) → Option\<result\> `[Non-Blocking]`

非阻塞观察目标 future 的当前状态。

- 前置：futureKey 对调用方可见。
- 未收敛：返回 `None`
- 已收敛：返回 `Some(Either<Failure, T>)`

#### Settle(futureSettleKey, result) → void `[Non-Blocking]`

将目标 future 收敛为给定结果。

- 前置：futureSettleKey 对调用方可见，且调用方 Scope 必须是 owner Scope 或其后代 Scope。
- `result` 的形状为 `Either<Failure, T>`。

#### Send(scopeRef, messageKey, value) → void `[Non-Blocking]`

向目标 Scope 的 `(scope, messageKey)` buffer 追加消息。若有 Process 阻塞在 `Receive(messageKey)`，最早的等待者出队并恢复，消息由该接收者独占。

- 前置：scopeRef 对调用方可见。

#### Receive(messageKey) → value `[Blocking]`

在调用方 Scope 上接收匹配 `messageKey` 的消息。buffer 非空时出队最早的消息并立即返回；buffer 为空时阻塞。

#### Cede() → void `[Blocking]`

调用方 Process 主动释放 Processor（协作式让权）。

#### Defer(cleanup) → void `[Non-Blocking]`

在调用方 Process 上注册一个 deferred cleanup。

- 前置：调用方 Process 为 `running` 或 `waiting`。
- process 终态时：调用失败。
- `Defer` 只负责注册，不立即启动 cleanup。
- 所属 Process 进入终态后，运行时对已注册的 deferred cleanups 执行一次性触发。
- `ProcessRef.exitFuture` 先按 process 自身结果收敛；cleanup 随后启动。
- 同一条注册只触发一次。

### 5.4 上下文与自省

#### Bind(key, value) → void `[Non-Blocking]`

`key` 为 phantom-typed 不透明令牌（`ContextKey<T>`，由 `contextKey<T>()` 创建）。在调用方 Scope 上下文中绑定值。

#### Lookup(key) → value | undefined `[Non-Blocking]`

沿调用方 Scope 到祖先链查找上下文绑定。未命中时返回 `undefined`。

#### Self() → { scope, process } `[Non-Blocking]`

返回调用方自省信息。

---

## 7. Primitives

### 7.1 定位

Primitive 是 kernel 在 sigil 之上提供的 **Wisp 层代数组合**，每个 primitive 产出 `Wisp<T>`，由一条或多条 sigil 步骤组合而成。

primitive 的价值：

- **组合稳定性**：把正确的并发模式固化为 Wisp 片段，消费方无需自行拼装 sigil 序列。
- **封装 Process 脆弱性**：sigil 层暴露的 `Spawn` 与 Process 级操作（如等待 `process.exitFuture`）被封装在 primitive 内部；用户通过 `spawn`、boundary primitive 与 future 观察面表达并发与收敛。

primitive 不等于 sigil：

- sigil 是微内核的原子指令，由运行时解释。
- primitive 是 Wisp 片段的组合器，在 Wisp 代数内完成，不引入新的微内核解释分支。

### 7.2 失败通道

涉及生命周期等待（Scope 或 Process）的 primitive 直接复用 future 结果通道：`Wait(scope.exitFuture)` / `Wait(process.exitFuture)` 返回 `Either<Failure, T>`。

这一分层使 kernel 层的失败保持可组合、可推理，而不依赖异常机制。

### 7.3 并发构造 primitives

#### all(branches) → Wisp\<FutureKey\<T\>\>

聚合等待多个分支，并返回承载聚合结果的 future。`all` 采用默认的结构化并发传播语义；返回的 future 用于观察聚合结果。

#### race(branches) → Wisp\<FutureKey\<ArrayValues\<T\>\>\>

选择最先完成者，触发其余分支收敛。`branches` 为非空。`race` 采用默认的结构化并发传播语义；参赛分支共享同一个 race `Scope`，返回的 future 用于观察 race 结果。

#### spawn(worker) → Wisp\<FutureKey\<T\>\>

封装 `Spawn` sigil，在当前 Scope 内创建并行 Process，并返回该分支结果对应的 future。`spawn` 表达的是当前 `Scope` 内的并发分支，以及该分支结果的 future 观察面。

#### enclose(ritual) → Wisp\<Either\<Failure, T\>\>

创建一个显式收敛型子 Scope，并等待该子 Scope 收敛。`enclose` 表达独立的收敛边界，用于承载一个子树的收敛结果。

#### resumable(ritual) → Wisp\<FutureKey\<T\>\>

声明可恢复计算，并返回 entry result 对应的 future。`resumable` 会为其 traced subtree 建立新的 Scope；它把 entry process 的结果与其所在 traced scope 的后续失败拆开处理：

- entry process 成功：结果 future 立即收敛为 `Right(value)`。
- entry process 失败：查找 `resumableDelegateKey`。
  - 未命中：结果 future 收敛为 `Left(failure)`。
  - 命中：把 `failure + FutureSettleKey` 作为一次 recovery request 发送给委派点，并等待 recovery future 收敛；其结果作为 entry result future 的最终结果。
- entry process 成功后的 traced scope 后续失败：不回写 entry result future，而是按默认失败传播语义使调用方 Scope 失败。

### 7.4 future、等待与控制 primitives

#### future() → Wisp\<[FutureKey\<T\>, FutureSettleKey\<T\>]>

封装 `Future` sigil，在当前 Scope 内创建一个 pending future，并返回其观察 key 与收敛 key。future 的归属随当前 Scope。

#### wait(futureKey) → Wisp\<Either\<Failure, T\>\>

封装 `Wait` sigil，等待目标 future 收敛并返回结果。

#### poll(futureKey) → Wisp\<Option\<Either\<Failure, T\>\>\>

封装 `Poll` sigil，非阻塞观察目标 future 的当前收敛状态。

#### settle(futureSettleKey, result) → Wisp\<void\>

封装 `Settle` sigil，对目标 future 执行单次收敛。

#### guard(entry, recover) → Wisp\<FutureKey\<void\>\>

创建传播型子 Scope，并在该子 Scope 内建立供 `resumable` 使用的恢复边界。`entry` 定义该子树范围；子树内 `resumable` 上送的 failure 由 `recover` 处理；调用返回该子树入口 Scope 的 `FutureKey<void>`。

#### halt(failure) → Wisp\<never\>

封装 Halt sigil，触发当前 Process 失败，并由该失败驱动所属 Scope 失败与后续级联。

#### cancel() → Wisp\<never\>

封装 Cancel sigil，触发当前 Scope 的取消，并使该 Scope 子树沿取消路径收敛。

#### park() → Wisp\<never\>

持续挂起当前 Process，直到父 Scope 回收清理阶段以失败路径唤醒。

#### cede() → Wisp\<void\>

封装 Cede sigil，协作式让权。

#### defer(cleanup) → Wisp\<void\>

直接封装 `Defer` sigil，在当前 Process 上注册一条 deferred cleanup，不追加额外编排。该 primitive 只表达注册动作；cleanup 的触发时序由 `Defer` 的语义定义负责。

### 7.5 上下文与自省 primitives

#### bind(key, value) → Wisp\<void\>

在当前 Scope 绑定值。`key` 为 `ContextKey<T>` 令牌，由 `contextKey<T>()` 创建。绑定值的可见范围随当前 Scope。

#### unbind(key) → Wisp\<void\>

在当前 Scope 解绑值；后续查找会继续沿祖先链解析该 `key`。

#### lookup(key) → Wisp\<T | undefined\>

沿祖先链查找值；未命中时返回 `undefined`。

#### self() → Wisp\<SelfHandle\>

返回当前执行实体的自省信息。
