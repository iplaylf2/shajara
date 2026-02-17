# khora Execution Doc

## 1. 当前快照

- Current Phase: **Build — Make it work**
- Baseline Docs: `README.md`, `docs/semantics.md`, `docs/runtime.md`, `docs/api.md`, `docs/design-constraints.md`

## 2. 阶段看板

- Build: 当前阶段。聚焦 runtime 结构边界收敛与桥接执行闭环。
- Prove: 在桥接实现后补执行语义验证与回归。
- Operate: 在可执行后推进宿主输入投递与调度联动验证。
- Ship: 在行为稳定后收敛示例与对外文档。

## 3. 当前现实与证据

- runtime 源码目录已按职责分层为 `bridge / contracts / host / internal / primitives`，并移除旧 `runtime-*` 与 `runtime-kit` 命名。Evidence: `packages/runtime/src/index.ts:1`, `packages/runtime/src/bridge/blueprint.ts:1`, `packages/runtime/src/contracts/plan.ts:1`, `packages/runtime/src/host/api.ts:1`, `packages/runtime/src/internal/not-implemented.ts:1`
- `primitives` 目录当前只保留原语集合与索引，不再承载支撑目录。Evidence: `packages/runtime/src/primitives/index.ts:1`, `packages/runtime/src/contracts/primitive-tuple.ts:1`
- runtime 顶层公开表面仍聚焦 `run/createScope/action/sleep/until` 与 runtime 语义类型。Evidence: `packages/runtime/src/index.ts:1`, `packages/runtime/src/host/api.ts:1`
- 内部宿主适配职责由 `host/adapter.ts` 承接，未从公共入口导出。Evidence: `packages/runtime/src/host/adapter.ts:1`, `packages/runtime/src/index.ts:1`
- 桥接执行主路径仍是占位实现，当前尚未进入可执行状态。Evidence: `packages/runtime/src/bridge/blueprint.ts:12`, `packages/runtime/src/bridge/blueprint.ts:20`, `packages/runtime/src/host/runner.ts:11`, `packages/runtime/src/host/api.ts:31`, `packages/runtime/src/host/api.ts:45`
- 原语声明层仍以占位实现为主，`cede` 走 syscall 提升路径。Evidence: `packages/runtime/src/primitives/cede.ts:1`, `packages/runtime/src/primitives/spawn.ts:1`, `packages/runtime/src/internal/not-implemented.ts:1`
- 包内引用约束已收敛：同级/子级优先相对路径，跨边界引用使用 `#src/*`。Evidence: `packages/runtime/src/index.ts:1`, `packages/runtime/src/host/runner.ts:1`, `packages/runtime/src/primitives/join.ts:1`

## 4. 执行阻力诊断（相对设计基线增量）

> 仅记录相对设计基线的新事实与影响，不复述基线内容。

### 4.1 目录边界已重排为职责分层

- Impact: 边界跨越路径更可见，定位“公开入口/内部支撑/桥接职责”成本下降。
- Evidence: `packages/runtime/src/bridge/blueprint.ts:1`, `packages/runtime/src/contracts/entities.ts:1`, `packages/runtime/src/host/api.ts:1`, `packages/runtime/src/internal/not-implemented.ts:1`

### 4.2 导入规范已从“别名泛用”收敛为“就近相对 + 跨边界别名”

- Impact: 同层阅读噪音降低，跨边界依赖仍可一眼识别。
- Evidence: `packages/runtime/src/index.ts:1`, `packages/runtime/src/host/api.ts:5`, `packages/runtime/src/primitives/race.ts:1`

### 4.3 主阻力仍是桥接执行未实现

- Impact: 结构治理完成后，下一步工作应集中在行为闭环而非继续目录重排。
- Evidence: `packages/runtime/src/host/runner.ts:11`, `packages/runtime/src/host/api.ts:31`, `packages/runtime/src/host/api.ts:45`

## 5. Build 阶段执行切片

### 5.1 Slice B1：runtime 结构边界治理

- Status: **Completed**
- Output: 代码按职责落位到 `bridge/contracts/host/internal/primitives`。
- Evidence: `packages/runtime/src/index.ts:1`, `packages/runtime/src/bridge/blueprint.ts:1`, `packages/runtime/src/contracts/plan.ts:1`, `packages/runtime/src/host/api.ts:1`
- Next: 后续新增文件遵循“目录即职责”落位，不回退到语义模糊目录。

### 5.2 Slice B2：导入约束治理

- Status: **Completed**
- Output: 同级/子级改为相对路径；跨边界导入保留 `#src/*`。
- Evidence: `packages/runtime/src/index.ts:1`, `packages/runtime/src/host/runner.ts:3`, `packages/runtime/src/contracts/primitive-tuple.ts:1`, `packages/runtime/src/primitives/all.ts:1`
- Next: 新增导入按同一规则执行，避免 `#src` 在局部目录被滥用。

### 5.3 Slice B3：桥接执行闭环

- Status: **In Progress**
- Output: `run/createScope/until` 与 blueprint bridge 仍为占位实现，尚未形成执行闭环。
- Evidence: `packages/runtime/src/host/runner.ts:11`, `packages/runtime/src/host/api.ts:31`, `packages/runtime/src/host/api.ts:45`, `packages/runtime/src/bridge/blueprint.ts:12`
- Next: 在 `host/runner` 与 `bridge/blueprint` 落地执行映射，并补失败传播路径。

## 6. 后续阶段方向

- Prove: 补 bridge 行为验证，覆盖正常返回、异常传播、终止路径。
- Operate: 把宿主输入投递与调度联动纳入回归。
- Ship: 收敛示例与对外文档说明，移除与实现状态不一致描述。
