# khora API

本文档定义 runtime 对外 API 面与使用约束。

## 1. API 分组

### 1.1 用户编排 API（Public Composition API）

用户编排 API 用于应用侧表达与启动流程，核心动作是启动一段 `RuntimeBlueprint`，并在蓝图内通过 primitives 组合并发意图。

### 1.2 运行时宿主适配 API（Internal Host Adapter API）

运行时宿主适配 API 用于 runtime 内部桥接宿主回调与执行推进。该层在 `run` 边界内组装完成、失败、输入投递等适配能力，并负责把宿主输入映射到运行时作用域输入通道，不作为应用侧直接调用入口。

### 1.3 宿主 API 的作用域绑定方式

`run` 与 `createScope` 属于 root 锚定入口，其运行作用域挂在全局 `root scope` 下。在 `blueprint/plan` 中通过 `yield*` 使用的 API 属于上下文敏感入口，作用域归属由当前执行上下文决定；若该入口创建作用域，则新作用域附着在当前执行上下文所在分支。

## 2. 用户侧计算单元

### 2.1 RuntimeBlueprint

`RuntimeBlueprint<A>` 是用户侧编排单元，以 generator function 书写，通过 `yield*` 组合原语，并通过 `return` 产生结果。

## 3. 用户编排 API

### 3.1 run

`run` 启动一段 `RuntimeBlueprint` 并在宿主侧等待其结果。`run` 的运行作用域挂载在全局 `root scope` 下；成功时返回结果值，中断时抛出 `RuntimeScopeInterruptedError`，失败时抛出 `RuntimeScopeFailedError`，`root scope` 继续作为生命周期锚点。

### 3.2 action

在 `blueprint/plan` 上下文中通过 `yield* action<T>()` 获取宿主侧可结算能力记录 `{ scope, resolve, reject }`。`action` 属于上下文敏感入口，作用域归属当前执行上下文分支，底层通过 runtime 内部宿主适配能力（例如输入投递）完成结算推进。

### 3.3 sleep

`sleep(milliseconds): RuntimePlan<void>`，用于等待一段宿主时间。runtime 内部通过宿主投递与 `receive` 等待配对完成挂起与唤醒，`sleep` 对外不暴露输入读取细节。

### 3.4 until

`yield* until(thunk)` 接受一个 promise thunk，并等待其完成后返回结果值（reject 按异常传播）。`until` 属于上下文敏感宿主入口，内部通过宿主投递与 `receive` 等待配对完成结算。

### 3.5 createScope

`createScope` 创建一个宿主侧托管作用域句柄，返回 `{ run, halt, state, closed, [Symbol.asyncDispose] }`。托管作用域本身挂载在全局 `root scope` 下；`scope.run(blueprint)` 在该托管作用域下启动一次 `RuntimeBlueprint` 并等待结果；`scope.halt()` 触发该托管作用域的关闭流程并等待收敛；`scope.state` 提供同步状态快照（`open | closing | closed`）；`scope.closed` 在托管作用域真正完成清理后 `resolve(void)`，中断时抛出 `RuntimeScopeInterruptedError`，失败时抛出 `RuntimeScopeFailedError`；`scope[Symbol.asyncDispose]()` 等价于 `scope.halt()`。`scope.run(...)` 与 `run(...)` 一致：成功返回值，中断抛 `RuntimeScopeInterruptedError`，失败抛 `RuntimeScopeFailedError`。托管作用域生命周期由 `scope.halt()` 或 async dispose 约定治理。

## 4. 编排原语 API

原语按职责分为并发构造原语、基础原语、上下文与自省原语。

### 4.1 并发构造原语

- `spawn` 创建子 `Scope` 并在其中引入并行分支。
- `resource` 创建资源作用域；调用方等待 `provide(value)` 的首个值作为返回，资源作用域在 `provide` 后继续挂起并等待父 scope 回收。
- `all` 聚合等待多个分支。
- `race` 选择最先完成者，并触发其余分支收敛。
- `scoped` 创建子 `Scope` 并立即等待其收敛；第二参数 `onResumableError` 是捕获 handler，不是 `scoped` 自身异常兜底。
- `resumable` 在 `scoped` body 中声明可恢复边界；只有被 `resumable` 标记的子孙作用域抛出的异常会进入祖先 `scoped` 的 `onResumableError` 路径。

### 4.2 基础原语

- `join` 等待一个 `spawn` 句柄对应作用域成功完成并返回结果值。
- `terminate` 触发一个 `spawn` 句柄对应作用域的收敛。
- `halt` 触发当前 `Scope` 的终止级联。
- `cede` 进行协作式让权。
- `suspend` 使当前执行体持续挂起，直到父 scope 在回收清理阶段以失败路径唤醒。

### 4.3 上下文与自省原语

- `bind` 在当前 `Scope` 绑定值。
- `lookup` 沿祖先链解析值。
- `self` 读取当前执行实体的自省信息。

## 5. 使用约束

用户侧通过 `yield* 原语(...)` 进行交互与编排。原语调用后直接得到可 `yield*` 的 `RuntimePlan`，不使用 `yield* 原语(...)()` 形式。用户侧不直接接触内核契约细节，宿主输入投递经 runtime 内部适配层完成。用户侧可观察与控制的生命周期粒度是 `Scope`，不是 `Process`；作用域观察与控制通过 `spawn` 返回句柄承接，不透出底层 scope 结构字段。编排层暂不暴露输入读取原语（如 `receive`）。generator 侧只通过正常返回值表达成功结果，失败由 runtime 以异常抛出传播，不通过返回值编码失败态。`createScope` 属于用户编排 API（非 primitives），`scope.run` 与 `scope.halt`（含 async dispose）负责宿主侧生命周期治理。

## 6. 相关文档

运行时分层与术语方向约束见 `docs/runtime.md`，跨文档稳定约束见 `docs/design-constraints.md`，kernel 执行语义见 `docs/semantics.md`。
