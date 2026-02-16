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

- `kernel` 承载 `Blueprint<T> = () => Plan<T>` 契约，`runtime` 对该契约做类型透传。Evidence: `packages/kernel/src/plan-contract.ts:40`, `packages/runtime/src/plan-contract.ts:1`
- `runtime` 内部桥接对象 `BLUEPRINT_BRIDGE` 仍是唯一互转入口；`run` 通过桥接推进且执行仍为 `Not implemented`。Evidence: `packages/runtime/src/blueprint.ts:31`, `packages/runtime/src/runtime-runner.ts:7`
- runtime 对外仍是 generator 入口：`run(RuntimeBlueprint<T>)`。Evidence: `packages/runtime/src/blueprint.ts:4`, `packages/runtime/src/runtime-host.ts:12`
- primitive 协议已收敛为“thunk + plan”并支持多步步骤序列：`RuntimePrimitive<T> = () => RuntimePlan<T>`。Evidence: `packages/runtime/src/primitives-kit/runtime-protocol.ts:13`, `packages/runtime/src/primitives-kit/runtime-protocol.ts:19`
- `cede` 已收敛为简洁 thunk 形式，并通过 kernel syscall + runtime 协议转换表达 `yield*` 语义。Evidence: `packages/runtime/src/primitives/cede.ts:1`, `packages/runtime/src/primitives/cede.ts:4`
- `primitives` 目录已收敛为纯原语集合；共享协议支撑迁移到 `primitives-kit`。Evidence: `packages/runtime/src/primitives/index.ts:1`, `packages/runtime/src/primitives/cede.ts:1`, `packages/runtime/src/primitives-kit/runtime-protocol.ts:1`
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
- Evidence: `packages/runtime/src/primitives-kit/runtime-protocol.ts:31`, `packages/runtime/src/runtime-runner.ts:4`

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
- Output: primitive 统一为 thunk 语义；`primitives` 仅保留原语集合，协议支撑迁移到 `primitives-kit`。
- Evidence: `packages/runtime/src/primitives-kit/runtime-protocol.ts:19`, `packages/runtime/src/primitives/cede.ts:4`, `docs/design-constraints.md:25`
- Next: 新增原语时复用 `primitives-kit` 协议工具，避免在原语目录引入非原语支撑文件。

## 6. 后续阶段方向

- Prove: 增加 runtime bridge 的类型与行为一致性测试。
- Operate: 把 `run/post` 与原语联动纳入回归脚本。
- Ship: 在实现稳定后更新示例说明与对外 API 细节。
