# khora Execution Doc

## 1. 当前快照

- Current Phase: **Build — Make it work**
- Baseline Docs: `README.md`, `docs/semantics.md`, `docs/runtime.md`, `docs/api.md`, `docs/design-constraints.md`

## 2. 阶段看板

- Build: 当前阶段。聚焦 primitive/Plan 契约收敛后继续推进 runtime bridge 执行闭环。
- Prove: 在 bridge 落地后补执行语义验证与回归。
- Operate: 在可执行后推进宿主输入投递与调度联动验证。
- Ship: 在行为稳定后收敛示例与对外文档。

## 3. 当前现实与证据

- runtime 契约承载仍收敛在单文件 `contracts.ts`，并维持 `RuntimePlan/RuntimeBlueprint` 语义边界。Evidence: `packages/runtime/src/contracts.ts:22`, `packages/runtime/src/contracts.ts:34`
- runtime 计划提升入口已收敛到 `liftPlan`，并从 `plan-runtime.ts` 重命名为 `plan-lift.ts`。Evidence: `packages/runtime/src/plan-lift.ts:1`, `packages/runtime/src/plan-lift.ts:4`
- kernel 原语集合已统一从 `@khora/kernel` 导出，且原语签名统一返回 `Plan<T>`。Evidence: `packages/kernel/src/index.ts:19`, `packages/kernel/src/primitives.ts:22`, `packages/kernel/src/primitives.ts:26`, `packages/kernel/src/primitives.ts:75`
- runtime primitives 已改为“调用 kernel primitive 构造 `Plan` 后交给 `liftPlan`”，不再通过 syscall 级入口提升。Evidence: `packages/runtime/src/primitives/cede.ts:2`, `packages/runtime/src/primitives/cede.ts:5`, `packages/runtime/src/primitives/all.ts:7`, `packages/runtime/src/primitives/all.ts:19`
- `BLUEPRINT_BRIDGE.lower` 已明确表达为 `Blueprint -> Plan -> RuntimePlan` 的桥接路径。Evidence: `packages/runtime/src/blueprint-bridge.ts:10`, `packages/runtime/src/blueprint-bridge.ts:13`
- bridge 执行主路径仍为占位实现，当前尚未进入可执行状态。Evidence: `packages/runtime/src/blueprint-bridge.ts:16`, `packages/runtime/src/operations/run.ts:4`, `packages/runtime/src/operations/create-scope.ts:16`, `packages/runtime/src/operations/until.ts:5`

## 4. 执行阻力诊断（相对设计基线增量）

> 仅记录相对设计基线的新事实与影响，不复述基线内容。

### 4.1 primitive 契约从 Blueprint 工厂收敛到 Plan 构造

- Impact: primitive 与 syscall 语义边界更清晰；primitive 可直接表达“单次消费的计划片段”，不再默认具备可重放模板语义。
- Evidence: `packages/kernel/src/primitives.ts:22`, `packages/kernel/src/primitives.ts:26`, `packages/kernel/src/primitives.ts:60`, `packages/kernel/src/primitives.ts:75`

### 4.2 runtime 提升层去重并聚焦 liftPlan

- Impact: `liftBlueprint/liftPrimitive` 语义重叠被移除，runtime 仅保留 `Plan -> RuntimePlan` 的核心提升入口。
- Evidence: `packages/runtime/src/plan-lift.ts:4`, `packages/runtime/src/blueprint-bridge.ts:13`, `packages/runtime/src/primitives/lookup.ts:5`

### 4.3 主阻力仍是 bridge raise/run/createScope/until 未实现

- Impact: 契约与命名治理完成后，下一步应集中在执行驱动与终止/失败传播闭环，而非继续做签名层重排。
- Evidence: `packages/runtime/src/blueprint-bridge.ts:16`, `packages/runtime/src/operations/run.ts:8`, `packages/runtime/src/operations/create-scope.ts:17`, `packages/runtime/src/operations/until.ts:8`

## 5. Build 阶段执行切片

### 5.1 Slice B1：runtime 结构边界治理

- Status: **Completed**
- Output: runtime 保持“契约单文件 + 行为支撑文件”结构，行为支撑继续在边界文件中承载。
- Evidence: `packages/runtime/src/contracts.ts:1`, `packages/runtime/src/blueprint-bridge.ts:1`, `packages/runtime/src/plan-lift.ts:1`, `packages/runtime/src/runtime-step.ts:1`
- Next: 新增类型优先进入 `contracts.ts`，新增行为逻辑按职责落入独立文件。

### 5.2 Slice B2：导入约束治理

- Status: **Completed**
- Output: runtime primitives 的跨边界导入已收敛，重复与混排问题已治理。
- Evidence: `packages/runtime/src/primitives/all.ts:1`, `packages/runtime/src/primitives/scoped.ts:1`, `packages/runtime/src/primitives/resource.ts:1`
- Next: 继续保持“同源一次导入 + 显式边界跨越”的导入约束。

### 5.3 Slice B3：bridge 执行闭环

- Status: **In Progress**
- Output: `run/createScope/until` 与 `BLUEPRINT_BRIDGE.raise` 仍为占位，尚未形成执行闭环。
- Evidence: `packages/runtime/src/operations/run.ts:8`, `packages/runtime/src/operations/create-scope.ts:17`, `packages/runtime/src/operations/until.ts:8`, `packages/runtime/src/blueprint-bridge.ts:16`
- Next: 在 `operations/run` 与 `blueprint-bridge` 落地执行映射，并补失败传播路径。

### 5.4 Slice B4：primitive 契约与提升路径收敛

- Status: **Completed**
- Output: kernel primitive 已统一返回 `Plan<T>`，runtime primitive 已统一通过 `liftPlan` 对接；`plan-runtime.ts` 重命名为 `plan-lift.ts`。
- Evidence: `packages/kernel/src/primitives.ts:22`, `packages/runtime/src/primitives/cede.ts:5`, `packages/runtime/src/primitives/race.ts:22`, `packages/runtime/src/plan-lift.ts:4`
- Next: 在 `liftPlan` 实现阶段显式落地 `then/terminate` 对 generator 推进与 `try...finally` 的对齐策略。

## 6. 后续阶段方向

- Prove: 补 bridge 与 `liftPlan` 行为验证，覆盖正常返回、异常传播、终止路径。
- Operate: 把宿主输入投递与调度联动纳入回归。
- Ship: 收敛示例与对外文档说明，移除与实现状态不一致描述。
