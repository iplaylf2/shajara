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
- `cancel(scope): void`

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
- `canceled`

### 2.3 `settle`

`settle(futureSettle, result)` 负责向运行中的环境注入 future 的收敛结果。

### 2.4 `cancel`

`cancel(scope)` 负责取消指定 `ExecutionScopeRef`。

## 3. 依赖关系

依赖方向固定为：`executor` 依赖 `Interpreter`。

- `Interpreter` 持有并推进封闭解释环境。
- `executor` 组织入口视图、环境治理与外部注入能力。

`executor` 通过 `createExecutor(pacer)` 创建，内部构造并持有 `Interpreter`。`Pacer` 是宿主侧的步进节流桥接，形状固定为：

```ts
interface Pacer {
  beginSlice(): Slice;
  continueLater(work: () => void): Disposable;
}

interface Slice {
  shouldYield(): boolean;
}
```

- `beginSlice`：为一次同步推进申请新的时间片；executor 在当前 slice 上通过 `shouldYield()` 判断是否需要让出宿主线程。
- `continueLater`：注册下一次执行机会，宿主在合适时机调用 `work`；返回 `Disposable` 可取消尚未交付的请求。

## 4. 执行环境对象

`executor` 至少需要组织出两类对象或视图：执行入口视图、环境治理视图。

### 4.1 执行入口视图

执行入口视图负责把某个 Scope 暴露为 `launch + cancel` 的外部能力边界。

`ExecutionScopeRoot` 与普通 `ExecutionScope` 的差异只在于身份位置，不在于能力集合；两者都以 `ExecutionScopeRef` 作为句柄，并承载 `launch + cancel` 语义。

`executor` 需要把普通 `Scope` 组织成可供外部启动与终止的 execution scope 视图。

execution scope 视图建立在底层 `Scope` 既有身份之上。`Scope` 的 descriptor 在创建时固定；`executor` 读取这些只读声明信息来决定如何接入治理。

### 4.2 环境治理视图

调度、回收与附加治理由 `executor` 组织。

这些治理视图可以承载诸如：

- runnable 选择策略
- 结构性回收策略
- 关闭路径上的附加治理策略

这些治理策略需要落实为可执行的 handler 或流程，并接入运行循环。

这里保留一个明确的设计方向：执行环境应允许通过 `executor/primitives/autonomy` 为某个入口 Scope 声明自治治理。`autonomy` 是一类由 executor 额外解释的 kernel primitive；它仍然以 primitive 形状出现，但其兑现责任不在纯 `Interpreter`，而在 executor 的运行循环。

`autonomy(entry, options)` 当前承载两类治理能力：

- `scheduler`
- `reaper`

- **scheduler**：当自治 Scope 下某个 Process 刚转为 runnable 时，executor 调用 `scheduler.assign(processRef)`，由其返回一个 `Processor`。`ProcessRef` 只在这一步暴露给 scheduler，用于路由或分配；随后 executor 会把目标 Process 包装成匿名 `ProcessorTask` 并交给 `Processor.admit(task)`。`Processor` 不直接接触 `ProcessRef`，只通过 `task.step()` 反复推进；每次 `step()` 只执行最小一步，如何切片与何时继续由 processor 自主决定。
- **reaper**：executor 不会在 Scope 一进入 Closing 时立刻触发 reaper。它会在每个自治治理域内部识别当前的 closing frontier，并在准备让出执行权时安排一个 `continueLater(...)` 后触发的仲裁任务；只有到下一次 slice 开始时仍然停留在 frontier 的 closing scope，才会被送入 `reaper.reap(closingScope)`。这里的 frontier 是 executor 内部使用的定位语义：它表示当前治理域里最深的一批、且尚未被更深层同域 closing scope 阻塞的关闭前沿。reaper 返回 `Wisp<Option<Failure>>`：`none` 表示继续等待自然收敛，`some(failure)` 表示现在就调用 `Interpreter.forceFailure(scopeRef, failure)` 执行强制失败。

这类能力属于 `executor` 的环境治理问题，与 `ScopeDescriptor` 的稳定语义字段分层承接；其承载形态当前待定。

## 5. 运行循环中的治理职责

### 5.1 调度扩展

若执行环境需要更复杂的 ready 处理，`executor` 应接入 `Interpreter` 暴露的 runnable 接线承接位。对声明了 `autonomy(..., { scheduler })` 的 Scope，executor 在 Process 刚转为 runnable 时调用 scheduler，并将该 Process 封装为匿名 `ProcessorTask`，交给返回的 `Processor` 接纳与后续处理。

### 5.2 结构性回收

当 scope 已进入 `Closing`，且终止推进后仍无法进入 `Exited`，`executor` 以 slice 为边界组织 reaper 仲裁。仲裁对象不是“结构树叶子”，而是各自治治理域当前识别出的 closing frontier。只有在下一次 slice 开始时仍然停留在 frontier 的 closing scope，才会成为本轮仲裁对象。对每个对象，executor 调用 `reaper.reap(closingScope)`：

- `none`：继续等待 cleanup 自行收敛。
- `some(failure)`：调用 `Interpreter.forceFailure(scopeRef, failure)`，将目标 Scope 以指定 `failure` 强制迁移为 Failed。

## 6. 与 `Interpreter` 的协作

`executor` 使用 `Interpreter` 的两类能力：

- 公开能力：`step`、`spawn`、`lookup`、`poll`、`wait`

此外，`executor` 可以使用 `Interpreter.observeRootZone(observer)` 把自己的调度循环接到 root zone 的观察接口上；observer 与 `ScopeZone` 同构，可同时接收 process 与 scope 的追踪事件。该接口允许多个订阅同时生效。

这里的治理扩展建立在既有对象语义之上：`executor` 读取 `Scope` / `Process` 的 descriptor，决定如何组织调度、关闭和附加治理；descriptor 作为对象自带的只读声明信息参与这一协作。

zone / autonomy 只定义治理归属，不改写 kernel closing 的结构拓扑。closing 仍按 scope 树计算；executor 只是在各自治治理域内定位当前 frontier，并决定何时把某个 closing scope 交给对应的 reaper。

## 7. 实现导向

`executor` 通过 `createExecutor(pacer)` 创建，内部构造并持有 `Interpreter`（两者 1:1）。实现应优先围绕以下主线展开：

- 维护一个长期存在的执行环境。
- 提供统一的 `rootScope` 作为 execution root。
- 为每次 `launch` 组织新的 execution scope，并返回稳定的收敛句柄。
- 把 future settlement 与 termination 这些外部能力接入环境内部。
- 在需要时解释 `autonomy` primitive，并接入相应的调度、回收或治理策略。
- 通过 slice 边界触发 reaper，对跨过一次 `continueLater(...)` 后仍未自然收敛、且仍位于治理域 frontier 的 closing scope 执行仲裁。

---
