# Executor 设计

本文档定义 `executor` 的职责、边界与设计方向。

`executor` 建立在 `Interpreter` 之上；它依赖 `Interpreter` 提供的解释能力，但自身承诺的是执行环境的组织能力。

---

## 1. 主题

`executor` 的主题不是解释单个封闭环境，而是组织出一个可持续运行的执行环境，并把外部入口接入该环境。

它需要承诺的能力不是抽象的“运行一些 ritual”，而是更具体的几件事：

- 组织 `ExecutionScope` 这一执行入口能力视图。
- 组织全局唯一的 `Limbo` 承接位。
- 为 `GovernorScope` 提供所需的 `scheduler` / `reaper` 治理能力。
- 对外暴露稳定的执行入口签名，使 host 可以围绕它搭建编排层。

因此，`executor` 的复杂性来自环境治理与入口组织，而不是单个 Wisp 的解释动作。

## 2. 稳定接口

`executor` 当前对外承诺的接口是：

- `rootScope: ExecutionScopeRef`
- `launch(scope, ritual): LaunchHandle<T>`
- `settle(futureSettle, result): void`
- `terminate(scope): void`
- `registerCleanup(ritual, cleanup): void`

这些签名本身已经表达出 `executor` 的职责边界。

### 2.1 `rootScope`

`rootScope` 是执行环境的根 `ExecutionScopeRef`。

host 当前通过它作为统一入口，把 `run(...)` 与 `createScope()` 的首个 launch 都锚定到同一个执行环境上。这说明 `executor` 不是一次性运行器，而是长期环境的拥有者。

### 2.2 `launch`

`launch(scope, ritual)` 表示在某个 `ExecutionScopeRef` 下启动新的入口 ritual，并返回 `LaunchHandle<T>`。

`LaunchHandle<T>` 的形状进一步约束了 `executor` 的承诺：

- `ref: ExecutionScopeRef`：每次 launch 都要产出一个新的执行 scope 引用。
- `onSettled(listener)`：调用方可以订阅该入口的单次收敛结果。
- `state(): "open" | "closing" | "closed"`：调用方可以观察该入口 scope 的生命周期状态。

`LaunchResult<T>` 的结果域固定为：

- `success`
- `failure`
- `terminated`

这说明 `executor` 不只是把 ritual 跑完，还必须把入口 scope 的终态整理成可观察的启动结果。

### 2.3 `settle`

`settle(futureSettle, result)` 负责向运行中的环境注入 future 的收敛结果。

host 的 `action`、`sleep`、`until` 都依赖这个入口，把宿主回调结果映射回 kernel future。这意味着 `executor` 必须维护可从外部寻址的 future settlement capability，并保证它能落入正确的运行环境中。

### 2.4 `terminate`

`terminate(scope)` 负责终止指定 `ExecutionScopeRef`。

host 侧的 `AbortSignal` 映射、`createScope().halt()`，都依赖这个入口。这说明 `executor` 必须能把外部终止请求路由到对应 execution scope，并驱动其进入关闭与收敛流程。

### 2.5 `registerCleanup`

`registerCleanup(ritual, cleanup)` 负责把 cleanup 绑定到 ritual 入口。

host 在 `decodeRitual(...)` 中已经依赖这个接口，把 generator coroutine 的 `return(...)` 清理路径登记到 executor 上。因此，`executor` 需要维护“入口 ritual -> cleanup”这一类运行时登记，并在关闭或中断时正确执行。

## 3. 依赖关系

依赖方向固定为：`executor` 依赖 `Interpreter`。

`executor` 不直接替代 `Interpreter` 的解释职责，而是建立在它之上：

- `Interpreter` 持有并推进解释环境。
- `executor` 组织环境角色、入口视图与外部能力。

这意味着 `executor` 的设计前提是：解释过程由 `Interpreter` 承担，执行环境治理由 `executor` 承担。

## 4. 执行环境对象

`executor` 至少需要组织出三类对象或视图：`ExecutionScope`、`GovernorScope`、`Limbo`。

### 4.1 `ExecutionScope`

`ExecutionScope` 是执行入口能力角色。

从语义文档看，`ExecutionScopeRoot` 与普通 `ExecutionScope` 的差异只在于身份位置，不在于能力集合；两者都以 `ExecutionScopeRef` 作为句柄，并承载 `launch + terminate` 语义。

因此，`executor` 的一项核心职责，就是把普通 `Scope` 组织成可供外部启动与终止的 execution scope 视图。

### 4.2 `GovernorScope`

`GovernorScope` 是治理角色，承载两类 handler 能力：

- `scheduler(readyProcess) => Wisp<Processor>`
- `reaper(suspendedProcess) => Wisp<Option<Failure>>`

`GovernorScope` 的 `capabilities` 是一个 coverage sum type：

- `scheduler`
- `reaper`
- `full`

这意味着 `executor` 不能只“拥有一个解释器”，它还必须把环境治理策略落成 governor 侧可执行的 handler 能力，并把这些能力接入运行循环。

### 4.3 `Limbo`

`Limbo` 是全局唯一的结构性修剪承接位。

当最近祖先 governor 的 reaper 给出结构性修剪仲裁时，目标 scope 子树会从原树断开并挂接到 `Limbo` 下。因此，`executor` 需要在自己的环境组织中保有这一全局单例位置，并支持将待清理子树迁入其中。

## 5. 运行循环中的治理职责

虽然 Wisp 的解释动作由 `Interpreter` 承担，但 `executor` 承诺的环境组织能力，会直接体现在运行循环里。

### 5.1 Scheduler

在 EventQueue 为空且 Processor 回到微内核手中时，需要由 scheduler 继续挑选可运行 Process。

语义文档已经规定：

- scheduler handler 由治下 scope 的就绪 Process 活动驱动触发。
- 每次触发只处理一个 ready process 输入。

因此，`executor` 需要保证 governor scheduler 能力被接入这条推进链路，而不是停留在类型定义层。

### 5.2 Reaper

当 scope 已进入 `Closing`，且终止推进后仍无法进入 `Exited`，需要触发最近祖先 governor 的 reaper handler。

reaper 的仲裁结果决定两种路径：

- `none`：继续等待 cleanup 自行收敛。
- `some(failure)`：执行结构性修剪，把子树挂到 `Limbo`，并以该 failure 使治理边界进入失败。

因此，`executor` 不仅要支持普通终止流程，还要支持“无法自然收敛时的结构性处置”。

## 6. Host 依赖的行为面

`executor` 的签名之所以稳定，是因为 host 已经围绕它组织了编排代码。

目前可直接从 host 用法看出这些约束：

- `run(...)` 依赖 `ensureExecutor().rootScope` 作为统一启动根。
- `createScope()` 先在 `rootScope` 下 `launch(park)`，再把返回的 `ExecutionScopeRef` 当作后续子入口的运行边界。
- `launch(...)` 把 `LaunchHandle` 收敛为 `PromiseLike + state()` 的宿主结果。
- `AbortSignal` 通过 `terminate(execution.ref)` 接入外部取消。
- `decodeRitual(...)` 通过 `registerCleanup(...)` 把 generator 退出清理回挂到 executor。
- `action`、`sleep`、`until` 通过 `settle(...)` 把宿主回调结果注入 kernel future。

这说明 `executor` 文档不能只停留在抽象描述，而必须承认它已经是 host 的稳定基础设施。

## 7. 与 `Interpreter` 的协作

`executor` 可以通过两种方式使用 `Interpreter`。

第一种是直接使用其公开能力：

- `step`
- `spawn`
- `lookup`
- `poll`
- `wait`

第二种是通过受保护扩展点间接干预解释过程：

- `onClosing`

此外，`executor` 也可以使用 `Interpreter.onProcessReady(listener)` 订阅 ready process 通知，把自己的调度循环接到解释器发出的 ready 信号上。

如果 `executor` 需要更紧密地组织关闭或收敛过程，可以通过派生 `Interpreter` 并覆写 `onClosing`，把治理能力接入解释过程。

但这里的边界应当保持清楚：`Interpreter` 仍只负责解释主题，复杂环境组织仍然属于 `executor`。

## 8. 实现导向

`executor` 的实现应优先围绕以下主线展开：

- 维护一个长期存在的执行环境，而不是一次性运行器。
- 提供统一的 `rootScope` 作为 execution root。
- 为每次 `launch` 组织新的 execution scope，并返回稳定的收敛句柄。
- 把 future settlement、termination 与 cleanup registration 这些外部能力接入环境内部。
- 为 governor 接入 scheduler 与 reaper 两类治理能力。
- 维护全局唯一的 `Limbo` 承接位，用于结构性修剪。

这一方向下，`executor` 可以保持对 `Interpreter` 的单向依赖，同时把 host 所需的稳定执行语义集中收口在自身这一层。
