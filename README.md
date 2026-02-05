# **khora: A Blueprint for a Concurrent Calculus**

## **I. Core Philosophy**

khora 是一个用于构建健壮并发系统的**并发计算核心演算 (Concurrent Calculus)**。其战略目标并非解决所有并发问题，而是专注于提供一个核心问题的、可验证的解决方案：**并发计算的生命周期管理**。它的设计根植于一组最小化的、正交的**系统调用 (Syscalls)**，它们共同构成了 khora 抽象机器的语义基石。

模型的核心原则是，**作用域 (Scope)** 是管理**生命周期、身份和上下文**的唯一一等公民。计算由**进程 (Processes)** 来完成，且每一个 `Process` 都是一个 **Plan** 的动态实例。`Process` 严格存在于一个 `Scope` 内部，这种设计从根本上强制了**结构化并发**，确保所有计算都严格地绑定于一个明确定义的生命周期，从而在模型层面杜绝资源泄漏与孤儿任务。

khora 的设计哲学是**元循环 (Meta-circular)** 的：一个极简的**微内核 (Microkernel)** 只负责解释 `Syscall`，而不包含任何预设策略。所有高级并发策略，包括**故障监督 (Supervision)** 与**执行调度 (Scheduling)**，都由运行在微内核之上的 `Plan` 自身来定义。这使得 khora 不仅仅是一个并发运行时，更是一个可用于构建定制化、可验证的并发模型的**并发计算核心演算**。

> **核心二元论 (The Core Duality):**
>
> 1. **结构与存在 (Structure & Existence):** `Scope` 的树状拓扑结构定义了**存在边界**与**生命周期从属关系**。子 `Scope` 的生命周期完全从属于其父级，此为系统强制的结构关系。
> 2. **自治与交互 (Autonomy & Interaction):** 在其生命周期边界内，每个 `Scope` 都是一个自治实体。其内部策略（如调度和终止仲裁）在创建时被指定。`Scope` 之间的交互通过**能力 (Capabilities)** 进行，它代表一种基于**协议 (Protocol)** 的、受控的、协商式的关系，而非结构性的支配关系。

## **II. Architectural Layers**

khora 的架构被严格划分为三个层次，以确保安全性和灵活性。

- **微内核 (Microkernel):** 系统的最内层。一个不包含任何策略的最小化引擎，其唯一职责是解释 `Syscall`、维护 `Scope` 树的拓扑完整性，并强制执行系统的核心公理。
- **策略层 (Policy Layer):** 系统的中间层。由库作者编写，通过组合 `Syscall` 来实现可重用的并发**原语 (Primitives)**，如 `all`, `race`, `channel` 等。
- **应用层 (Application Layer):** 系统的最外层。由最终用户编写，通过组合策略层提供的原语来表达具体的业务逻辑。

## **III. Core Concepts**

- **Scope:** 一个结构化的实体，是**身份、生命周期、上下文**的统一载体，同时也是**故障隔离的边界**。它拥有唯一的 `ScopeId`，并构成一个严格的树状结构。

- **Plan:** 一个纯粹的、惰性的**执行计划**。从形式上看，一个 `Plan` 是一个递归的数据结构，它精确地描述了一个由一系列与微内核的交互（`Syscall`）组成，并最终产生一个结果的计算。任何 `Plan` 都可以被归结为以下两种基本形式之一：
  1. **`Pure(value)`**: 代表一个已完成的计算，其结果就是 `value`。
  2. **`Impure(syscall, continuation)`**: 代表一个计算步骤。它包含一个要发往微内核的 `Syscall` 请求，以及一个**续体 (Continuation)** 函数。该续体将在接收到 `Syscall` 的返回值后，用于生成后续的 `Plan`。

- **Blueprint:** 一个用于延迟创建 `Plan` 的、无参数的 thunk `() => Plan`。它是一个可重用的**计算蓝图**，将 `Plan` 的实例化与其执行上下文解耦。

- **Process:** 一个 `Plan` 的动态、瞬态**实例**。`Process` 是**执行的基本单元**，持有执行状态并严格存在于一个 `Scope` 内部。

- **Processor:** 微内核所拥有的、代表系统中**唯一的、原子的计算权**的实体。一个 `Process` 必须被授予 `Processor` 才能执行其计算。

- **Strand:** 一个**同步调用链**的物化表现。它由一个或多个通过 `Weave` Syscall 链接在一起的 `Process` 构成。`Strand` 作为一个整体被挂起或恢复。其头部的 `Process` 是当前唯一有资格持有 `Processor` 的 `Process`。

- **EventQueue:** 微内核内部的一个高优先级队列，用于存放需要被立即响应的 `Process`。微内核的执行循环被设计为优先清空 `EventQueue`，以此来保证系统的反应性。

- **ProcessProfile:** 一个在 `Process` 创建时由微内核授予的、描述其**内在角色与身份**的数据结构。该 `Profile` 在 `Process` 的整个生命周期中保持其角色定义不变，并通过 `Self()` Syscall 供其查询。

- **Scheduler:** 一个特殊的 `Process`，其 `ProcessProfile` 将其标记为策略执行者。其职责是执行策略逻辑，并通过 `Arm` 等 `Syscall` 来影响未来哪些 `Process` 将进入微内核的 `EventQueue`。

- **Portal:** 一个在 `Scope` 创建时定义的服务接口。它是一个由多个具名 `Blueprint` 构成的记录，定义了该 `Scope` 可通过 `Capability` 响应的远程调用。

- **Capability:** 一个不可伪造的令牌，代表与特定 `Scope` 的 `Portal` 进行交互的权利。

- **Sink:** 一个与每个 `Scope` 内在关联的、概念上无限容量的缓冲区，作为从外部世界到该 `Scope` 的单向数据入口。

- **PostFn:** 一个暴露给外部世界的函数句柄 `(value) => void`，用于将数据异步地、非阻塞地投递到某个特定 `Scope` 的 `Sink` 中。

- **Fault:** 一个描述 `Process` 或 `Scope` 失败事件的数据结构。它代表一种终结状态。

- **Reaper:** 作为 `Scope` 的一项内在策略，在创建时被指定的 `Plan`。它是一个**终止仲裁器**。当微内核检测到一个 `Scope` 的终止进程停滞不前时，会激活该 `Reaper`，由其对 `Scope` 的状态进行仲裁并向微内核提供处置建议。

- **Limbo:** 一个特殊的、系统级的 `Scope`，用于收容被 `Reaper` 裁定为无法正常终结的 `Scope`。此隔离操作由微内核执行，以确保整个系统的活性。

## **IV. Core Semantics & Axioms**

- **The Microkernel Execution Model:** khora 的执行模型是一个**双相循环 (Biphasic Loop)**，由 `Processor` 的原子性转移所驱动，在**反应阶段**与**策略阶段**之间交替进行。
  1. **反应阶段：清空 `EventQueue` (Reactive Phase: Draining the `EventQueue`)**: 只要微内核的 `EventQueue` 不为空，它就处于此阶段。微内核会从队列头部取出一个 `Process`，授予其 `Processor` 并开始执行。
  2. **执行与权柄转移 (Execution and Control Relinquishment)**: `Process` 的执行会持续进行，直到它发出一个 `[Blocking]` Syscall，这会导致它放弃 `Processor`。此时，控制流的走向有两种可能：
     - 若 `Processor` 被**直接转移**给另一个 `Process`（通过 `Weave`），微内核将继续服务于新的 `Process`。`EventQueue` 在此期间不会被处理，因为 `Processor` 并未交还给微内核。
     - 若 `Processor` 被**交还给微内核**（通过 `Yield`、`AwaitProcess` 等），微内核则会返回**反应阶段**，继续处理 `EventQueue` 中的下一个 `Process`。
  3. **策略阶段：调用 `Scheduler` (Policy Phase: Invoking the Scheduler)**: **仅当反应阶段完成**（即 `EventQueue` 被清空）且 `Processor` 已被交还给微内核时，微内核才会进入此阶段。在此阶段，它会调用根 `Scheduler`。`Scheduler` 的职责是执行其策略，并通过 `Arm` 等 `Syscall` 为系统中的 `Process` 布置未来的调度触发器，为下一轮的反应阶段做准备。

- **The Termination Protocol:** 这是一个由微内核保证的、分阶段的协议。
  1. **Initiation & Cascade:** 当 `Scope` 进入 `Terminating` 状态，终止信号会沿着 `Scope` 树向下级联。
  2. **Convergent Cleanup:** 在 `Terminating` 状态下，微内核将拒绝任何**扩张性**的操作，但仍允许**收敛性**的操作，以支持健壮的清理逻辑。
  3. **Adjudication & Structural Reaping:** 若一个 `Scope` 的终止进程未能收敛，微内核将激活其 `Reaper`。若 `Reaper` 裁定需要强制回收，微内核将对该 `Scope` 及其后代启动**结构性收割**流程。此流程通过将阻塞的叶子 `Scope` 强制迁移至 `Limbo` 来打破僵局。
  4. **Reaping Invariant:** 在**结构性收割**期间，任何位于被收割 `Scope` 树内的 `Process`，都被禁止通过 `Weave` Syscall 将 `Processor` 转移给**不处于其当前 `Strand` 上**的 `Process`。任何违反此规则的尝试都会导致该 `Process` 所在的 `Scope` 被立即隔离至 `Limbo`。

- **Governing Axioms:**
  1. **Syscall Invocation Protocol:** 一个 `Plan` 通过发出 `Syscall` 请求与微内核交互。每一次交互都构成一个原子的请求-响应周期。
  2. **The Concurrency/Control Duality:** `Invoke` 等 `[Non-Blocking]` Syscall 通过创建计算来引入**并发**，而不转移控制。`Weave` 等 `[Blocking]` Syscall 通过扩展一个 `Strand` 来建立**同步控制**，而不创建计算。
  3. **The Unhandled Fault Principle:** 一个未被同 `Scope` 内任何 `Process` 等待的 `Fault` 将被视为溢出，并直接触发其所在 `Scope` 的终止协议。
  4. **Policy as Computation:** 监督与调度等核心策略，本身也是 `Plan`，受 khora 核心公理的约束。
  5. **Policy Failure is Scope Failure:** 任何策略 `Process` 的失败，都被视为其管辖 `Scope` 的一次不可恢复的致命错误。
  6. **The Idle Scope Termination Principle:** 一个不包含任何 `Process` 的 `Scope` 会被自动、立即地终止。
  7. **Primacy of Termination:** 一旦 `Scope` 进入终止流程，完成该流程是微内核的最高优先级任务。

## **V. The Core Calculus: Syscalls**

`Syscall` 是策略层与微内核之间的原子接口。`[Blocking]` Syscall 会导致当前 `Process` **放弃 `Processor`**；`[Non-Blocking]` Syscall 则不会。

与微内核的交互遵循一个严格的错误模型，该模型明确区分了**可处理的结果 (Results)** 与**致命故障 (Faults)**：

- **`Result`**: 这是 Syscall 的**带内 (in-band)** 返回值，代表一次操作的可预见结果。它是一个和类型（Sum Type），封装了成功值或一个可由程序逻辑处理的、明确的错误（例如，“目标 `Process` 不存在”或“`Capability` 无效”）。收到 `Result<T>` 后，发起调用的 `Process` **会恢复执行**，并负责对该结果进行后续处理。

- **`Fault`**: 这是一个**带外 (out-of-band)** 的终止事件，而非一个返回值。当一个 Syscall 请求会违反微内核的核心公理，或遭遇不可恢复的内部状态时，就会产生 `Fault`。此时，发起调用的 `Process` **会被立即终止，其后续代码永远不会被执行**。`Fault` 本身不会被该 `Process` 观察到，而是作为系统事件向上传播，由其所在 `Scope` 的监督策略来处理。

### **A. System Mutation**

1. **`Spawn(blueprint: Blueprint, options?: ScopeOptions)` -> `[ScopeId, ProcessId, Capability, PostFn]` `[Non-Blocking]`**: **纵向扩展**。在当前 `Scope` 下创建一个新的子 `Scope`，并启动一个初始 `Process`。此操作会自动为新 `Scope` 配备一个 `Sink` 和一个 `Portal`，并返回相应的 `PostFn` 和 `Capability`。
   - `ScopeOptions`: `{ portal?: Portal, reaper?: Blueprint, scheduler?: Blueprint }`
2. **`Fork(blueprint: Blueprint)` -> `ProcessId` `[Non-Blocking]`**: **横向扩展**。在**当前 `Scope`** 内创建一个并行的 `Process`。
3. **`Terminate(targetId: ProcessId)` -> `void` `[Non-Blocking]`**: **强制终止**。命令微内核终结一个目标 `Process` (仅限同 `Scope`)。
4. **`Invoke(capability: Capability, method: string, args: any[])` -> `Result` `[Non-Blocking]`**: **异步消息传递**。通过 `Capability` 异步调用目标 `Scope` 的 `Portal` 中指定的方法，并创建一个 `Process` 来处理该消息。
5. **`Materialize()` -> `[ProcessId, (value) => void, (fault) => void]` `[Non-Blocking]`**: **外部锚定**。创建一个新的、可等待的 `Process`，并返回用于从外部解决或拒绝该 `Process` 的函数句柄。
6. **`Bind(key, value)` -> `void` `[Non-Blocking]`**: 将一个值绑定到**当前 `Scope`** 的上下文中。
7. **`Arm(targetId: ProcessId)` -> `void` `[Non-Blocking]`**: **布防加急调度**。为目标 `Process` 附加一个一次性的“加急”状态标记。此标记是潜在的：
   - 如果目标 `Process` 当前**可运行**，它会被“立即”放入 `EventQueue`，同时消耗该标记。
   - 如果目标 `Process` 当前**不可运行**，该标记将保持附加状态。当该 `Process` 未来因任何原因**首次**变为可运行时，它将被自动放入 `EventQueue`，同时消耗该标记。
8. **`Disarm(targetId: ProcessId)` -> `void` `[Non-Blocking]`**: **解除加急调度**。移除一个先前通过 `Arm` 为目标 `Process` 附加的、但尚未被触发消耗的“加急”状态标记。如果标记已被消耗或不存在，此操作无效。此 `Syscall` **无法**将一个已经位于 `EventQueue` 中的 `Process` 移除。

### **B. Control Flow**

1. **`Receive()` -> `Result` `[Blocking]`**: **接收消息**。从当前 `Process` 所在 `Scope` 的 `Sink` 中接收一个值。如果 `Sink` 为空，则阻塞当前 `Process`。
2. **`Weave(targetId: ProcessId)` -> `Result` `[Blocking]`**: **同步控制编织**。将一个目标 `Process` 编织到当前的 `Strand` 之上，使其成为新的头部。`Processor` 被原子性地、同步地转移给目标 `Process`，而当前 `Process` 则被阻塞，直到 `Processor` 沿着 `Strand` 被传回。
3. **`Halt()` -> `never` `[Blocking]`**: **终止作用域**。立即发起当前 `Process` 所在 `Scope` 的终止协议，并交还 `Processor`。
4. **`AwaitProcess(id: ProcessId)` -> `Result` `[Blocking]`**: 阻塞当前 `Process`，将其 `Processor` 交还给微内核并挂起当前 `Strand`，直到目标 `Process` 完成。
5. **`AwaitScope(id: ScopeId)` -> `Result` `[Blocking]`**: 阻塞当前 `Process`，将其 `Processor` 交还给微内核并挂起当前 `Strand`，直到目标 `Scope` 终结。若该 `Scope` 的终结涉及对其后代的强制修剪，返回的成功 `Result` 将被附加上下文信息以作标识。
6. **`Yield()` -> `void` `[Blocking]`**: **协作式让权**。将 `Processor` 交还给微内核，以待重新调度，并挂起当前 `Strand`。

### **C. System Introspection**

1. **`PollProcess(id: ProcessId)` -> `Status` `[Non-Blocking]`**: 非阻塞地查询目标 `Process` 的当前状态。
2. **`PollScope(id: ScopeId)` -> `Status` `[Non-Blocking]`**: 非阻塞地查询目标 `Scope` 的当前状态。
3. **`Self()` -> `ProcessProfile` `[Non-Blocking]`**: **自省**。获取当前 `Process` 的 `ProcessProfile`。
4. **`Resolve(key)` -> `value` `[Non-Blocking]`**: 从当前 `Scope` 沿祖先链向上查找一个上下文值。

## **VI. The Standard Library: Primitives**

标准库原语是在策略层中，通过组合 `Syscall` 实现的、可重用的**并发策略**。它们本身不是微内核的一部分。

- **`spawn(blueprint)`**: 基于 `Spawn` Syscall 的原语。
- **`all(blueprints)`**: 实现“全有或全无”的并行模式。
- **`race(blueprints)`**: 实现“竞争”并行模式。
- **`resource(body)`**: 将外部资源的获取/释放与当前 `Scope` 的生命周期绑定。
- **Supervision Strategies (`oneForOne`, `oneForAll`, etc.)**: 封装通用故障处理模式。
- **Scheduling Strategies (`withScheduler`, etc.)**: 创建带有特定子调度器服务的 `Scope`。

## **VII. The Boundary Interface**

- **`run(blueprint, options?)` -> `Promise`**: 系统的**主入口点**。它负责创建根 `Scope`，配置根 `Scheduler`，并启动整个 `khora` 执行模型，最终将结果桥接到宿主环境。
- **`fromPromise(promiseFn)` -> `Plan`**: 将一个宿主环境的异步操作，适配为一个可在 `khora` 世界中安全管理的 `Plan`。
