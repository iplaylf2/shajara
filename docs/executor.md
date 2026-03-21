# Executor 设计

本文档定义 `executor` 的职责、边界与设计方向。

---

## 1. 主题

`executor` 的主题是组织出一个可持续运行的执行环境，并把外部入口接入该环境。

它承诺的能力包括：

- 组织稳定的执行入口视图。
- 维护对运行中 future 的外部收敛注入能力。
- 维护对运行中 Scope 的外部终止注入能力。
- 维护结构性清理与附加治理所需的环境状态。

复杂性来自环境治理与入口组织。

## 2. 稳定接口

`executor` 当前对外承诺的接口是：

- `rootScope: ExecutionScopeRef`
- `launch(scope, ritual): LaunchHandle<T>`
- `settle(futureSettle, result): void`
- `terminate(scope): void`
- `registerCleanup(ritual, cleanup): void`

这些签名定义了 `executor` 的稳定外部能力。

### 2.1 `rootScope`

`rootScope` 是执行环境的根 `ExecutionScopeRef`。

它表示该执行环境中最稳定的外部入口锚点。调用方通过它把新的入口 ritual 接入到同一套长期存在的执行环境。

### 2.2 `launch`

`launch(scope, ritual)` 表示在某个 `ExecutionScopeRef` 下启动新的入口 ritual，并返回 `LaunchHandle<T>`。

`LaunchHandle<T>` 由三部分组成：

- `scope: ExecutionScopeRef`：每次 launch 都要产出一个新的执行 scope 引用。
- `onSettled(listener)`：调用方可以订阅该入口的单次收敛结果。
- `state(): "open" | "closing" | "closed"`：调用方可以观察该入口 scope 的生命周期状态。

`LaunchResult<T>` 的结果域固定为：

- `success`
- `failure`
- `terminated`

### 2.3 `settle`

`settle(futureSettle, result)` 负责向运行中的环境注入 future 的收敛结果。

### 2.4 `terminate`

`terminate(scope)` 负责终止指定 `ExecutionScopeRef`。

### 2.5 `registerCleanup`

`registerCleanup(ritual, cleanup)` 负责把 cleanup 绑定到 ritual 入口。

## 3. 依赖关系

依赖方向固定为：`executor` 依赖 `Interpreter`。

- `Interpreter` 持有并推进封闭解释环境。
- `executor` 组织入口视图、环境治理与外部注入能力。

## 4. 执行环境对象

`executor` 至少需要组织出三类对象或视图：执行入口视图、环境治理视图、结构性修剪承接位。

### 4.1 执行入口视图

执行入口视图负责把某个 Scope 暴露为 `launch + terminate` 的外部能力边界。

`ExecutionScopeRoot` 与普通 `ExecutionScope` 的差异只在于身份位置，不在于能力集合；两者都以 `ExecutionScopeRef` 作为句柄，并承载 `launch + terminate` 语义。

`executor` 需要把普通 `Scope` 组织成可供外部启动与终止的 execution scope 视图。

execution scope 视图建立在底层 `Scope` 既有身份之上。`Scope` 的 descriptor 在创建时固定；`executor` 读取这些只读声明信息来决定如何接入治理。

### 4.2 环境治理视图

调度、回收与附加治理由 `executor` 组织。

这些治理视图可以承载诸如：

- runnable 选择策略
- 结构性回收策略
- 关闭路径上的附加治理策略

这些治理策略需要落实为可执行的 handler 或流程，并接入运行循环。

这里保留一个明确的设计方向：执行环境应允许自定义 **scheduler** 与 **reaper** 这两类治理能力。

- **scheduler**：决定 runnable process 的选择与推进策略。
- **reaper**：决定 closing 无法自然收敛时，是否继续等待、失败收敛或进入结构性修剪。

这类能力属于 `executor` 的环境治理问题，与 `ScopeDescriptor` 的稳定语义字段分层承接；其承载形态当前待定。若未来引入 governor / governance 设计，也应把它理解为治理角色或治理对象，服务于环境治理的组织。

### 4.3 结构性修剪承接位

结构性修剪承接位是全局唯一的位置，用来接住无法在原树上自然收敛、且仍需保留的 Scope 子树。

当环境治理策略给出结构性修剪仲裁时，目标 scope 子树会从原树断开并挂接到这一承接位下。`executor` 负责维护这一全局单例位置，并支持将待清理子树迁入其中。

## 5. 运行循环中的治理职责

### 5.1 调度扩展

若执行环境需要更复杂的 ready 选择，`executor` 应接入 `Interpreter` 暴露的 runnable 接线承接位。

### 5.2 结构性回收

当 scope 已进入 `Closing`，且终止推进后仍无法进入 `Exited`，`executor` 可以追加一类结构性回收策略。

其仲裁结果决定两种路径：

- `none`：继续等待 cleanup 自行收敛。
- `some(failure)`：执行结构性修剪，把子树挂到承接位，并以该 failure 使治理边界进入失败。

## 6. 与 `Interpreter` 的协作

`executor` 使用 `Interpreter` 的两类能力：

- 公开能力：`step`、`spawn`、`lookup`、`poll`、`wait`

此外，`executor` 可以使用 `Interpreter.observeRunnable(listener)` 把自己的调度循环接到 runnable 状态变化订阅接口上；该接口允许多个订阅同时生效。

这里的治理扩展建立在既有对象语义之上：`executor` 读取 `Scope` / `Process` 的 descriptor，决定如何组织调度、关闭和附加治理；descriptor 作为对象自带的只读声明信息参与这一协作。

## 7. 实现导向

`executor` 的实现应优先围绕以下主线展开：

- 维护一个长期存在的执行环境。
- 提供统一的 `rootScope` 作为 execution root。
- 为每次 `launch` 组织新的 execution scope，并返回稳定的收敛句柄。
- 把 future settlement、termination 与 cleanup registration 这些外部能力接入环境内部。
- 在需要时接入相应的调度、回收或治理策略。
- 维护全局唯一的结构性修剪承接位，用于结构性修剪。

---
