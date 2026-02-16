# khora Execution Doc

## 1. 当前快照

- Current Phase: **Build — Make it work**
- Baseline Docs: `README.md`, `docs/semantics.md`, `docs/runtime.md`, `docs/api.md`, `docs/design-constraints.md`

## 2. 阶段看板

- Build: 当前阶段。聚焦 runtime 协议转换边界与类型表面收敛，保证 primitive 形态、目录边界、公开导出一致。
- Prove: 在桥接落地后补“then/terminate 路径与返回值映射”验证矩阵。
- Operate: 在 runtime 可执行后推进宿主输入投递与调度联动回归。
- Ship: 在对外面稳定后收敛示例与外部文档。

## 3. 当前现实与证据

- `kernel` 承载 `Blueprint<T> = () => Plan<T>` 契约，`runtime` 直接依赖该契约类型。Evidence: `packages/kernel/src/plan-contract.ts:40`, `packages/runtime/src/blueprint.ts:1`
- `runtime` 内部桥接对象 `BLUEPRINT_BRIDGE` 仍是唯一互转入口；`run` 通过桥接推进且执行仍为 `Not implemented`。Evidence: `packages/runtime/src/blueprint.ts:31`, `packages/runtime/src/runtime-runner.ts:7`
- runtime 对外仍是 generator 入口：`run(RuntimeBlueprint<T>)`。Evidence: `packages/runtime/src/blueprint.ts:4`, `packages/runtime/src/runtime-host.ts:12`
- `post` 已从公开入口下沉为内部宿主适配语义：由 `withRuntimeResolvers` 承接 `resolve/reject/post` 协议。Evidence: `packages/runtime/src/runtime-host-adapter.ts:1`, `packages/runtime/src/index.ts:6`
- primitive 协议已收敛为“thunk + plan”并支持多步步骤序列：`RuntimePrimitive<T> = () => RuntimePlan<T>`。Evidence: `packages/runtime/src/runtime-kit/runtime-protocol.ts:13`, `packages/runtime/src/runtime-kit/runtime-protocol.ts:19`
- primitives API 已补齐声明层签名（并发构造、基础控制、上下文、自省），当前保持 `Not implemented` 占位。Evidence: `packages/runtime/src/primitives/index.ts:1`, `packages/runtime/src/primitives/concurrency.ts:1`, `packages/runtime/src/primitives/control.ts:1`
- 根据顶层编排边界约束，公开 `fork` 原语已移除；并发创建入口收敛为 `spawn`。Evidence: `packages/runtime/src/primitives/index.ts:1`, `packages/runtime/src/primitives/concurrency.ts:1`
- 用户侧 process 粒度 API 已收敛出公开表面；观察与控制统一为 `Scope` 粒度。Evidence: `packages/runtime/src/primitives/control.ts:1`, `packages/runtime/src/runtime-kit/runtime-entities.ts:1`, `apps/example/src/scenarios.ts:1`
- 编排层原语调用形态已收敛为 `yield* primitive(...)`；去除二次调用 `yield* primitive(...)()`。Evidence: `packages/runtime/src/primitives/concurrency.ts:1`, `packages/runtime/src/primitives/control.ts:1`, `apps/example/src/scenarios.ts:1`
- `spawn` 句柄已收敛为不透明引用；`awaitScope/terminate` 直接接收 `spawned`，不再经 `spawned.scope` 暴露结构字段。Evidence: `packages/runtime/src/runtime-kit/runtime-entities.ts:1`, `packages/runtime/src/primitives/control.ts:1`, `apps/example/src/scenarios.ts:1`
- 结构性监督原语已从 `supervise` 收敛为 `scoped + resumable` 组合：`scoped` 提供 `caught` 兜底，`resumable` 声明可恢复传播点。Evidence: `packages/runtime/src/primitives/concurrency.ts:1`, `apps/example/src/scenarios.ts:1`, `docs/api.md:1`
- `scoped` 第二参数语义已澄清为 `onResumableError` 捕获 handler：仅处理 `resumable` 子孙路径异常，不表示 `scoped` 自身任意异常兜底。Evidence: `packages/runtime/src/primitives/concurrency.ts:1`, `docs/api.md:1`, `docs/design-constraints.md:1`
- 公开编排原语已移除 `receive`；输入读取能力暂不在 runtime 对外 primitives 表面。Evidence: `packages/runtime/src/primitives/control.ts:1`, `packages/runtime/src/primitives/index.ts:1`, `apps/example/src/scenarios.ts:1`, `docs/api.md:1`
- `cede` 已收敛为简洁 thunk 形式，并通过 kernel syscall + runtime 协议转换表达 `yield*` 语义。Evidence: `packages/runtime/src/primitives/cede.ts:1`, `packages/runtime/src/primitives/cede.ts:4`
- `primitives` 目录已收敛为纯原语集合；runtime 共享协议支撑位于 `runtime-kit`。Evidence: `packages/runtime/src/primitives/index.ts:1`, `packages/runtime/src/primitives/cede.ts:1`, `packages/runtime/src/runtime-kit/runtime-protocol.ts:1`
- runtime 顶层导出已收紧为 runtime 语义类型与宿主 API，不再透出 kernel 契约类型。Evidence: `packages/runtime/src/index.ts:1`
- 包内 alias 已统一为 `#src/* -> ./src/*`，与源码路径一致。Evidence: `packages/runtime/package.json:6`
- example 保持 generator 形态且仅依赖 runtime 公共入口。Evidence: `apps/example/src/main.ts:1`, `apps/example/src/main.ts:10`
- docs 已回收到静态设计口径，进度态信息集中在 `execution.md`。Evidence: `docs/runtime.md:1`, `docs/api.md:1`
- 已固化“反复纠偏项”为仓库约束文档，后续以文档为准执行。Evidence: `docs/design-constraints.md:1`
- 工作区校验通过。Evidence: `yarn build && yarn lint && yarn typecheck` (2026-02-16)

## 4. 执行阻力诊断（相对设计基线的增量）

> 仅记录相对设计基线的新事实与影响，不复述基线内容。

### 4.1 结论：主阻力收敛为单点“桥接执行未实现”

- Impact: 类型边界与结构边界已稳定，当前阻力集中在执行语义闭环。
- Evidence: `packages/runtime/src/runtime-runner.ts:8`

### 4.2 文档职责边界已收敛

- Impact: 设计文档可保持稳定，后续状态更新有单一落点，减少跨文档耦合。
- Evidence: `docs/runtime.md:1`, `docs/api.md:1`, `execution.md:1`

### 4.3 当前切片的直接后果

- Impact: 提交后可直接进入桥接执行实现与验证，不需要再做接口与结构层返工。
- Evidence: `packages/runtime/src/runtime-kit/runtime-protocol.ts:31`, `packages/runtime/src/runtime-runner.ts:4`

## 5. Build 阶段执行切片

### 5.1 Slice B1：收敛文档职责边界

- Status: **Completed**
- Output: `docs/` 保持稳定设计叙述，进度态集中到 `execution.md`。
- Evidence: `docs/runtime.md:1`, `docs/api.md:1`, `execution.md:1`
- Next: 后续执行状态只更新 `execution.md`，不在设计文档写“当前阶段”表述。

### 5.2 Slice B2：固定 runtime 对外边界并内聚桥接实现点

- Status: **Completed**
- Output: example 仅通过 `run` 与原语接入；桥接细节停留在 runtime 包内部。
- Evidence: `apps/example/src/main.ts:10`, `packages/runtime/src/runtime-runner.ts:7`, `packages/runtime/src/index.ts:1`
- Next: 在 runtime 内补桥接执行语义，不外泄桥接对象。

### 5.3 Slice B3：保持 generator 侧示例入口

- Status: **Completed**
- Output: example 继续以 generator blueprint + `yield*` primitive 作为用户侧表达入口。
- Evidence: `apps/example/src/main.ts:5`, `apps/example/src/main.ts:6`
- Next: 待桥接可执行后再补运行结果断言。

### 5.4 Slice B4：收敛 primitive 协议与目录边界

- Status: **Completed**
- Output: primitive 统一为 thunk 语义；`primitives` 仅保留原语集合，协议支撑迁移到 `runtime-kit`。
- Evidence: `packages/runtime/src/runtime-kit/runtime-protocol.ts:19`, `packages/runtime/src/primitives/cede.ts:4`, `docs/design-constraints.md:25`
- Next: 新增原语时复用 `runtime-kit` 协议工具，避免在原语目录引入非原语支撑文件。

### 5.5 Slice B5：按职责拆分 API 并补示例

- Status: **Completed**
- Output: API 分为“公开编排层（run + primitives）”与“内部宿主适配层（withRuntimeResolvers/post 语义）”；example 已逐项展示 API 调用姿势。
- Evidence: `packages/runtime/src/runtime-host.ts:1`, `packages/runtime/src/runtime-host-adapter.ts:1`, `apps/example/src/main.ts:1`, `docs/api.md:1`
- Next: 在 B 类 API 上补执行桥接实现，并为 example 增加可执行断言版本。

### 5.6 Slice B6：收敛并发创建边界（移除公开 fork primitive）

- Status: **Completed**
- Output: `fork` 保留在 syscall 语义层，不再作为编排层原语；公开并发创建统一经 `spawn` 暴露。
- Evidence: `packages/runtime/src/primitives/concurrency.ts:1`, `packages/runtime/src/primitives/index.ts:1`, `apps/example/src/scenarios.ts:1`, `docs/design-constraints.md:1`
- Next: 在执行桥接实现阶段确认 `spawn` 与 `awaitScope/terminate` 的 Scope 级映射保持一致。

### 5.7 Slice B7：收敛原语调用形态（移除二次调用）

- Status: **Completed**
- Output: 公开原语函数直接返回 `RuntimePlan`，example 调用统一为 `yield* primitive(...)`。
- Evidence: `packages/runtime/src/primitives/concurrency.ts:1`, `packages/runtime/src/primitives/control.ts:1`, `packages/runtime/src/primitives/context.ts:1`, `apps/example/src/scenarios.ts:1`, `docs/api.md:1`
- Next: 在桥接执行实现中保持该调用形态与 generator 驱动协议一致。

### 5.8 Slice B8：收敛 spawn 句柄语义（移除结构字段访问）

- Status: **Completed**
- Output: 用户侧等待/终止改为 `awaitScope(spawned)` 与 `terminate(spawned)`；不再使用 `spawned.scope`。
- Evidence: `packages/runtime/src/runtime-kit/runtime-entities.ts:1`, `packages/runtime/src/primitives/control.ts:1`, `apps/example/src/scenarios.ts:1`, `docs/design-constraints.md:1`
- Next: 在桥接执行实现阶段将 spawn 句柄与内部 scope 标识映射闭合到控制 syscall 路径。

### 5.9 Slice B9：重构监督原语（supervise -> scoped + resumable）

- Status: **Completed**
- Output: `supervise` 从公开表面移除，新增 `scoped(blueprint, caught?)` 与 `resumable(body)`；example 已覆盖 caught 兜底路径。
- Evidence: `packages/runtime/src/primitives/concurrency.ts:1`, `packages/runtime/src/primitives/index.ts:1`, `apps/example/src/scenarios.ts:1`, `docs/design-constraints.md:1`
- Next: 在桥接执行实现中明确 `caught` 的触发条件与祖先作用域传播规则。

### 5.10 Slice B10：澄清 scoped 捕获参数语义

- Status: **Completed**
- Output: `scoped` 第二参数命名收敛为 `onResumableError`，文档明确其只捕获 `resumable` 标记子孙异常。
- Evidence: `packages/runtime/src/primitives/concurrency.ts:1`, `packages/runtime/src/primitives/index.ts:1`, `apps/example/src/scenarios.ts:1`, `docs/api.md:1`
- Next: 在执行实现中把该触发条件映射到具体异常传播机制。

### 5.11 Slice B11：移除公开 receive 原语

- Status: **Completed**
- Output: `receive` 从公开 primitives 与 example 场景中移除，编排层输入读取能力暂不暴露。
- Evidence: `packages/runtime/src/primitives/control.ts:1`, `packages/runtime/src/primitives/index.ts:1`, `apps/example/src/scenarios.ts:1`, `docs/design-constraints.md:1`
- Next: 后续若恢复输入读取入口，先定义编排层场景与作用域语义，再决定 API 形态。

## 6. 后续阶段方向

- Prove: 增加 runtime bridge 的类型与行为一致性测试。
- Operate: 把 `run + 内部输入投递适配` 与原语联动纳入回归脚本。
- Ship: 在实现稳定后更新示例说明与对外 API 细节。

## 7. API 顶层分层提案（本轮新增）

### 7.1 分层结论

- 结论：API 按职责分成两类，分别服务“用户编排入口”和“runtime 内部宿主适配”。
- 约束：`post` 不再作为用户直接调用的顶层 API；其语义改为内部输入投递能力（由 runtime 在 `run` 过程中组装并持有）。

### 7.2 A 类 API：用户编排入口（Public Composition API）

- 目标：给应用侧提供稳定、最小、可组合的入口。
- 边界：只暴露 `run(RuntimeBlueprint<T>)` 与 primitives；不暴露 `ScopeHandle -> post` 这种内部路由细节。
- 责任：
  - 启动蓝图并等待结果。
  - 在蓝图内部通过 primitives 表达并发与交互。
  - 维持“用户只写 generator + yield\*”的一致心智模型。

### 7.3 B 类 API：运行时宿主适配（Internal Host Adapter API）

- 目标：承接 runtime 与宿主事件循环/回调桥接的内部机制。
- 边界：不从 `@khora/runtime` 公共入口直接导出，不要求应用侧感知。
- 责任：
  - 在 `run` 内部构造并管理 resolver（例如 `withResolvers` 语义下的完成/失败/投递回调）。
  - 将宿主输入投递映射到目标 scope sink（当前 `post` 占位能力迁移到此层）。
  - 维持桥接层对 `then/terminate` 推进协议的闭环。

### 7.4 迁移顺序（Top-down）

1. 先在类型与文档层确定 A/B 两类 API 的导出边界。
2. 再把 `post` 从公开宿主入口迁入 B 类内部适配层（由 `run` 组装 resolver）。
3. 最后补 `run` 执行桥接实现与回归验证，确认用户侧不需要直接持有 `ScopeHandle`。

- 当前进度：第 1、2 步已完成；第 3 步待实现。

### 7.5 对当前代码的直接指向

- 已改造的公开面：`packages/runtime/src/runtime-host.ts:1`, `packages/runtime/src/index.ts:1`
- 已承接的内部适配点：`packages/runtime/src/runtime-host-adapter.ts:1`, `packages/runtime/src/runtime-runner.ts:1`
