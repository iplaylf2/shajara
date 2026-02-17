# khora Execution Doc

## 1. 当前快照

- Current Phase: **Build — Make it work**
- Baseline Docs: `README.md`, `docs/semantics.md`, `docs/runtime.md`, `docs/api.md`, `docs/design-constraints.md`

## 2. 阶段看板

- Build: 当前阶段。聚焦 runtime 边界收敛后继续推进桥接执行闭环。
- Prove: 在桥接实现后补执行语义验证与回归。
- Operate: 在可执行后推进宿主输入投递与调度联动验证。
- Ship: 在行为稳定后收敛示例与对外文档。

## 3. 当前现实与证据

- runtime 契约承载已收敛为单文件 `contracts.ts`，不再以 `contracts/*` 子目录分散承载。Evidence: `packages/runtime/src/contracts.ts:1`, `packages/runtime/src/index.ts:1`
- runtime 行为支撑已从契约文件拆分为独立职责文件，避免 `contracts.ts` 继续膨胀。Evidence: `packages/runtime/src/plan-runtime.ts:1`, `packages/runtime/src/runtime-step.ts:1`, `packages/runtime/src/blueprint-bridge.ts:1`
- `primitives` 目录当前只保留原语集合与索引，不再承载支撑目录。Evidence: `packages/runtime/src/primitives/index.ts:1`, `packages/runtime/src/plan-runtime.ts:1`
- runtime 顶层公开表面仍聚焦 `run/createScope/action/sleep/until` 与 runtime 语义类型。Evidence: `packages/runtime/src/index.ts:1`, `packages/runtime/src/operations/index.ts:1`
- 桥接执行主路径仍是占位实现，当前尚未进入可执行状态。Evidence: `packages/runtime/src/blueprint-bridge.ts:9`, `packages/runtime/src/blueprint-bridge.ts:17`, `packages/runtime/src/operations/run.ts:4`, `packages/runtime/src/operations/create-scope.ts:16`, `packages/runtime/src/operations/until.ts:5`
- syscall 提升路径已独立到 `plan-runtime`，`cede` 通过该路径接入。Evidence: `packages/runtime/src/plan-runtime.ts:5`, `packages/runtime/src/primitives/cede.ts:1`

## 4. 执行阻力诊断（相对设计基线增量）

> 仅记录相对设计基线的新事实与影响，不复述基线内容。

### 4.1 契约从目录集合收敛为单文件入口

- Impact: 目录层级降低，runtime 协议入口更集中；同时需要持续防止该入口退化为杂项容器。
- Evidence: `packages/runtime/src/contracts.ts:1`, `packages/runtime/src/index.ts:1`

### 4.2 契约与行为实现已做第一轮边界拆分

- Impact: `contracts.ts` 保持类型协议职责，行为逻辑迁移到 `plan-runtime/runtime-step/blueprint-bridge`，跨边界依赖更可见。
- Evidence: `packages/runtime/src/contracts.ts:22`, `packages/runtime/src/plan-runtime.ts:5`, `packages/runtime/src/runtime-step.ts:11`, `packages/runtime/src/operations/run.ts:1`

### 4.3 主阻力仍是桥接执行未实现

- Impact: 结构治理阶段性完成后，下一步应集中在 `run/createScope/until` 与 blueprint raise/lower 的行为闭环，而非继续目录重排。
- Evidence: `packages/runtime/src/operations/run.ts:8`, `packages/runtime/src/operations/create-scope.ts:17`, `packages/runtime/src/operations/until.ts:8`, `packages/runtime/src/blueprint-bridge.ts:12`

## 5. Build 阶段执行切片

### 5.1 Slice B1：runtime 结构边界治理

- Status: **Completed**
- Output: runtime 已从 `bridge/contracts/*` 目录承载收敛为“契约单文件 + 行为支撑文件”结构。
- Evidence: `packages/runtime/src/contracts.ts:1`, `packages/runtime/src/blueprint-bridge.ts:1`, `packages/runtime/src/plan-runtime.ts:1`, `packages/runtime/src/runtime-step.ts:1`
- Next: 新增类型优先进入 `contracts.ts`，新增行为逻辑按职责落入独立文件。

### 5.2 Slice B2：导入约束治理

- Status: **Completed**
- Output: 同源重复导入已收敛，跨边界依赖路径保持可读。
- Evidence: `packages/runtime/src/primitives/spawn.ts:1`, `packages/runtime/src/primitives/race.ts:1`, `packages/runtime/src/operations/run.ts:1`
- Next: 继续保持“同源一次导入 + 显式边界跨越”的导入约束。

### 5.3 Slice B3：桥接执行闭环

- Status: **In Progress**
- Output: `run/createScope/until` 与 blueprint bridge 仍为占位实现，尚未形成执行闭环。
- Evidence: `packages/runtime/src/operations/run.ts:8`, `packages/runtime/src/operations/create-scope.ts:17`, `packages/runtime/src/operations/until.ts:8`, `packages/runtime/src/blueprint-bridge.ts:12`
- Next: 在 `operations/run` 与 `blueprint-bridge` 落地执行映射，并补失败传播路径。

## 6. 后续阶段方向

- Prove: 补 bridge 行为验证，覆盖正常返回、异常传播、终止路径。
- Operate: 把宿主输入投递与调度联动纳入回归。
- Ship: 收敛示例与对外文档说明，移除与实现状态不一致描述。
