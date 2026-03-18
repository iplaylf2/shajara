# Interpreter 设计

本文档定义 `Interpreter` 这一解释器对象的职责、边界与接口语义。

它只讨论一个封闭解释环境中的 Wisp 演算，不讨论更高层的执行入口编排。

---

## 1. 设计目标

`Interpreter` 的主题是：接受一个起点 `ritual`，在一个封闭环境里解释其显现出的 `Wisp`，并在外部驱动下逐步推进，直到入口 `ritual` 所创建的解释环境收敛。

这里的“封闭环境”强调两点：

- 解释期间使用的 Scope、Process、future、上下文与消息能力，都由 `Interpreter` 自身维护。
- 对解释环境有副作用的行为，不由外部直接改写内部状态，而是通过 `Interpreter` 暴露的接口进入。

`Interpreter` 的目标不是直接承载复杂执行入口能力，而是提供一套较单纯、可组合的并发演算基底。

## 2. 结构边界

`Interpreter` 围绕一次入口 `ritual` 建立自己的根 Scope 与根 Process。

它暴露的根引用具有固定含义：

- `scopeRoot`：入口 `ritual` 所创建的根 Scope 引用。
- `processRoot`：入口 `ritual` 所创建的根 Process 引用。

`isClosed` 反映的是该入口 `ritual` 所创建的整个解释环境是否已经收敛，而不是某个局部 Process 是否暂停。

`Interpreter` 只负责解释环境内部的并发演算，不直接承担更高层的入口治理、全局环境管理或生命周期编排。

在实现分层上，当前边界进一步收口为：

- `RuntimeProcess` 自身持有 process 局部状态迁移能力，例如 continuation 排队、进入 future/mailbox 阻塞态、恢复后的 `resonate` 推进，以及 `self` / `branch` 所需 handle 的产出。
- `RuntimeScope` 负责 scope 树、scope 派生 future（`createFuture(...)`）的创建与归属、mailbox，以及 scope 内 spawned process 的结构性归属关系。
- `RuntimeScope` 的构造契约要求 `parent` 永不为 `null`；根 scope 通过一个仅供内部使用的私有 sentinel 哨兵承接 create 路径，而不是把空值传播进正常实例关系。
- `RuntimeScope` 直接依赖并持有其局部 `RuntimeProcess` 是正当的，因为 process 的运行态本来就是 scope 内部的局部状态，而不是与 scope 平行的另一套一级对象。
- `RuntimeProcess` 仍应只通过 `scopeRef` 与 scope 语义关联，而不直接反向依赖 `RuntimeScope`；这样 process 局部状态对象仍保持边界句柄视角，不把 scope 内部结构倒灌回 process。
- `Interpreter` 的职责应收口在“解释当前 sigil 并发出状态变更意图”；它不应长期承担大部分 `scopeRef` / `processRef` 到 runtime 实体的寻址与跨对象编排，否则像“从中间关闭某个 scope”这类场景会把关闭协议的复杂度错误地推回解释器。
- `RuntimeScope.create(...)` / `branch(...)` / `spawn(...)` 现在都按这一方向收口：scope 直接接收 entry / spawn 所需的 `Ritual`，并在内部建立和持有对应的 `RuntimeProcess`；`Interpreter` 不再承担这些结构关系的构造职责。
- `RuntimeIndex` 当前只保留 register/resolve 两类索引职责，并进一步统一成 `registerScope / registerProcess / registerFuture` 与 `resolveScope / resolveProcess / resolveFuture / resolveFutureBySettle` 这组命名；它不试图表现成更高层的 future/mailbox 语义宿主。当前这些索引容器也已收口为 `WeakMap`，表达其索引身份而不是持有期宿主身份。
- future 的运行时承载已单独落位为 `RuntimeFuture`：`RuntimeScope.createFuture(...)` 负责 scope 派生 future 的创建；`RuntimeProcess` 则自治创建并持有自己的 `exitFuture`。`Interpreter` 只在 sigil 解释时按 key 解析并转发给对应的 runtime future；`poll / wait / settle` 的具体运行时语义当前仍保持 `notImplemented(...)` 占位。
- 与 future key pair 对应的 tuple 形状已在 `contracts` 中收口为 `FutureHandle`；这是稳定的 kernel 基础语义形状，而不是 interpreter 私有 convenience tuple。
- 这三类 runtime 实体现分别落位到 `runtime-process.ts`、`runtime-scope.ts` 与 `runtime-future.ts`；配套索引对象命名为 `RuntimeIndex`，落位于 `runtime-index.ts`。
- `Interpreter` 只发出解释意图，不直接改写 process 的内部细节字段；但当前实现仍会承担一部分 runtime index 的登记动作，因此“结构装配完全退回 `RuntimeScope`”仍未完成。
- `processRoot` 与 `branch` 返回值中的 `processRef` 当前统一通过 `RuntimeScope.entryProcess.ref` 读取，不再依赖 `RuntimeScope.processRef` 别名面。
- 当前 future、mailbox 与 closing 相关多项能力仍明确保持 `notImplemented(...)` 占位；本轮目标是先把对象边界、公开面与步进 case 风格摆正，而不是一次补全全部运行逻辑。

## 3. 驱动模型

`Interpreter` 不以“一次调用持续解释到挂起或结束”为核心模型，而是以步进推进为核心模型。

外部驱动者通过反复调用 `step`，半自动地推进封闭环境中的 Process 演算。这个过程可以伴随并发分支的创建、future 的收敛、消息等待与恢复，直到 `isClosed` 变为 `true`。

因此，`Interpreter` 的职责是：

- 保存解释环境状态。
- 执行单步解释。
- 承接会对解释环境产生副作用的 sigil。
- 提供只读观察接口，允许外部在不改写环境的前提下观察当前状态。

## 4. 接口职责

### 4.1 `step`

`step(processRef)` 表示对目标 Process 执行一次步进解释，并返回该步的步进结果（`ProcessStep`）。

这里的“步进结果”强调：

- 它表达一次推进，而不是持续运行到挂起或结束。
- 它返回的是该次推进后 Process 所处的可观察阶段，而不是整个解释环境的最终结论。
- 它的粒度允许把“解释 sigil”和“执行 `resonate`”拆成两个外部可见步骤。

`ProcessStep` 的语义应与具体 sigil 语义分开理解：

- `waiting` 表示该步遇到了需要等待的条件，或当前 Process 仍停留在等待态。
- `ceded` 表示该步解释了 `Cede`，当前 Process 主动协作式让出控制权；对应的 `resonate(void)` 已排入待执行 continuation。
- `interpreted` 表示该步刚刚解释完一个 sigil，并把对应的 `echo` 排入待执行 continuation。
- `resonated` 表示该步执行了一次已排队的 `resonate(echo)`，并产出了新的当前 `wisp`。
- `exited` 表示该 Process 已进入终态；成功或失败由其中携带的 `result` 决定。

因此，`ceded`、`interpreted` 与 `resonated` 的划分是解释器步进契约本身的一部分。`Cede` 不再与普通 sigil 共用同一个阶段；驱动者可以直接把 `ceded` 当作一次显式让权信号，而之后是否继续执行对应的 `resonate`，仍由驱动者决定何时再调用下一次 `step`。

更具体地说，当前 `step` 的步进单位是：

- 若当前是 `RestingWisp`，该步直接把 Process 收敛到完成态。
- 若当前 Process 处于 `runnable` 且持有一段待执行 continuation，该步只执行一次 `resonate(echo)`，并把 Process 的当前 `wisp` 更新为得到的下一段 Wisp；若这次 resonance 已把 Wisp 推到终态，则该步直接返回 `exited`。
- 若当前是携带 sigil 的 `StirringWisp`，该步只解释该 sigil；若是 `Cede`，返回 `ceded` 并把 `resonate + void echo` 排入待执行 continuation；若是其他可立刻得到 echo 的 sigil，则返回 `interpreted` 并把 `resonate + echo` 排入 Process 的待执行 continuation；若该 sigil 会阻塞，则把 continuation 保存在 blocker 中，等待恢复信号到来后再转成待执行 continuation。

因此，当前模型就是“sigil 一步、`resonate` 一步”。驱动者若想得到旧的“归约一个 `StirringWisp` 头节点”的体验，可以在看到 `ceded` 或 `interpreted` 后继续对同一 Process 调用一次 `step`，把紧随其后的 `resonated` 一并吃掉。

`step` 是封闭环境在外部驱动下向前推进的基础入口。

### 4.2 `spawn`

`spawn(scopeRef, ritual)` 用于把新的 Process 插入到当前解释环境中。

它的职责不是单纯构造一个引用，而是专门执行那些会影响解释环境的副作用型 sigil 所需要的 Process 生成行为。换言之，`spawn` 是解释环境内部“新增并发参与者”的统一入口。

### 4.3 `observeRunnable`

`observeRunnable(scopeRef, listener)` 预留给解释环境对外暴露 runnable 通知。

它的长期方向仍然是为最小驱动闭环提供事件面，让外部能够组织 runnable queue、`perform` 或更高层调度，而不需要改写解释器内部状态。

当前方向已进一步收口为：`Interpreter.observeRunnable(scopeRef, ...)` 只负责按 `scopeRef` 寻址并把观察注册转发给对应的 `RuntimeScope`；真正承诺“观察该 scope 及其全部后代 scope 的 runnable 事件”的对象应当是 `RuntimeScope`。

这也意味着“观察哪棵 scope 子树”是接口输入的一部分，而不是隐藏在 interpreter root 特例里；否则 runnable 观察面的语义宿主会再次退化成解释器全局。

与这条边界一致，`RunnableListener` / `Unsubscribe` 这类 alias 也应贴近 `RuntimeScope.observeRunnable(...)` 的实现宿主，而不是回流到 kernel 基础 `contracts/`。

但 runnable 通知的具体传播与取消注册协议目前仍未定案，因此 `RuntimeScope.observeRunnable(...)` 当前仍保持 `notImplemented(...)` 占位，`Interpreter` 侧只保留“按 ref 寻址后委托”的关系。

### 4.4 只读观察接口

`Interpreter` 提供一组只读接口，用于观察封闭环境中的状态，而不直接改变环境：

- `lookup(scopeRef, contextKey)`：读取给定 Scope 可见的上下文值。
- `poll(futureKey)`：非阻塞观察 future 当前是否已收敛。
- `wait(futureKey, onSettled)`：登记对 future 收敛的观察。

这些接口的共同性质是：它们只读取解释环境中的既有状态，或登记收敛通知，不直接写入环境状态。

## 5. 类型形态

`Interpreter` 的设计倾向于保持单纯。它甚至可以不是 `abstract class`，而是一个默认可直接工作的解释器类型。

如果存在子类化需求，也应围绕“解释过程的有限干预”展开，而不是把它扩展成另一层复杂执行系统。

## 6. 扩展缝隙

`Interpreter` 当前只保留一个受保护扩展点：`onClosing`。

它用于在 Scope 关闭路径上追加有限干预，而不是接管解释器的常规驱动模型。

当前约定下，`onClosing(scope, processes, failure)` 的三个参数分别表示：

- 正在进入 closing 的当前 `Scope`
- 当前 `Scope` 内因本次 closing 被终止的 `Process` 集合
- 当前 closing 路径上承载的 `Failure`

这里的 `processes` 不表示整棵子树的所有 Process，也不单独强调最初触发 closing 的 origin process；origin 信息若有需要，应优先进入 failure 细节或未来独立的 closing context，而不是占据 `onClosing` 的固定参数位。

当前还能先明确一条 failure 来源约束：直接触发 closing 的 scope 承接触发方带来的 failure；被迫随祖先 closing 而取消的子树，则承接一类默认的“被终止 failure”。这类 termination failure 的具体定义与细分形态尚未设计完成，但其来源方向已经固定，不应与直接触发 closing 的 origin failure 混用。

这里的边界是：

- 公开 hook 只暴露事件，不暴露内部可变状态。
- 受保护扩展点只提供有限干预能力。
- 它们都不应反向把 `Interpreter` 本身变成复杂执行入口框架。

## 7. 实现导向

`Interpreter` 的实现主题应当保持单纯：

- 用自身提供的接口维护一个封闭解释环境。
- 在外部驱动下推进入口 `ritual` 的收敛。
- 在封闭环境内完成并发演算。

实现时应优先保持这条主线清晰：`Interpreter` 是一个可步进、可观察、可在内部生成并发 Process 的解释器对象。

为降低 `#interpretWisp` 的阅读成本，当前实现还额外约束其 `switch (sigil.kind)` 的 case 风格：

- 每个 sigil case 通常按三步组织：
  1. 解释 sigil。
  2. 分离并安置对应的 `resonate`。
  3. 包装并返回本步的 `ProcessStep`。
- 前两步允许修改解释环境状态，例如写入 scope、创建 process、登记 blocker、排队 continuation 或收敛 future；第三步则应尽量保持为纯粹的 stage 包装。
- `step` 的顶层控制流应先按 `RuntimeProcess.status` 分派，再在 `runnable` 分支内细分“解释当前 sigil”还是“执行已排队的 resonance”；`ProcessStep` 不应直接复写 runtime `status`，而应表达本次步进对外呈现出的结果。
- 当 sigil 需要阻塞时，第二步通常继续拆成两个相邻动作：
  1. 让 Process 进入相应的等待态。
  2. `primeContinuation(...)`，把尚缺恢复 `echo` 的 continuation 预置到 blocker 上。
- 对需要解析 scope 上下文的副作用型 sigil，`Interpreter` 先选定当前解释上下文，再把希望产生的状态变更交给 `RuntimeScope` 或 `RuntimeProcess`；它不应长期替 runtime 实体承担大段 runtime 寻址与结构拼装逻辑。
- 对 `resonate` 路径上的 process 局部状态推进，`Interpreter` 不应在得知 process 已终态后再额外补做 step-time 后处理；`RuntimeProcess` 自身负责把 resonance 产出的终态 Wisp 收敛为 exited，而 `step` 在看见终态时只返回 `ProcessStep.exited`。
- `halt` 的解释也遵循同一方向：`Interpreter` 负责识别 `halt` sigil，并把当前 process 所在 scope 的关闭意图交给 `RuntimeScope`；closing 子树扩散、leaf-to-root 的 closing worker 组织、局部 process 终止与最终 failure 固定，属于 `RuntimeScope` 的关闭协议，而不是 `Interpreter` 直接手写的流程。
- `setContinuation(resonate, echo)` 与 `primeContinuation(resonate)` 分别表达两种不同状态：
  前者表示恢复所需的 `echo` 已齐备，可以直接形成待执行 continuation；后者表示 continuation 已就位，但仍需等待外部事件产出 `echo` 后才能转入待执行态。
- 每个 sigil case 优先调用一个同名或近同名的私有解释动作，例如 `bind -> #bind`、`branch -> #branch`、`lookup -> #lookup`、`poll -> #poll`、`self -> #self`。
- 对同时存在“尝试立即完成”和“进入阻塞等待”两条路径的 sigil，应显式区分这两层动作；例如 `receive` 当前按 `#tryReceive` 与 `#receive` 两步命名，以区分“尝试读取 mailbox”与“在 mailbox 上等待消息”。
- `send` 的解释风格也遵循同一原则：`Interpreter` 在当前 process 的 scope 上下文里解释 `send`，并把 mailbox 投递动作交给 `RuntimeScope.send(...)` 表达，而不是让 `RuntimeProcess` 自身承担 scope-to-scope 投递语义。
- 命名应表达“解释这个 sigil”，而不是转写成额外的观察性或描述性措辞；例如优先使用 `#poll`，而不是 `#inspectFuture`。
- 这类私有方法存在的主要目的，不是抽象复用，而是维持 `#interpretWisp` 的 top-down case 结构，让每个 sigil 分支都保持统一的阅读节奏。

这不是 kernel 语义本身的一部分，但它是当前实现的重要阅读锚点；若后续实现继续沿用 `switch` 步进风格，应尽量保持这一约束不漂移。
