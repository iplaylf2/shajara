# khora Execution Doc

## 1. 当前快照

- Current Phase: **Build — Make it work**
- Baseline Docs: `README.md`, `docs/semantics.md`, `docs/runtime.md`, `docs/api.md`

## 2. 阶段看板

- Build: 当前阶段。主路径可运行，当前阻力集中在“文档与实现对齐”，而不是新增功能开发。
- Prove: 仅保留方向，待文档与边界稳定后再补一致性验证矩阵。
- Operate: 仅保留方向，待包边界与类型出口冻结后推进跨包回归脚本。
- Ship: 仅保留方向，待术语和导出面稳定后收敛外部文档。

## 3. 当前现实与证据

- `kernel` 已承载 `Plan/Syscall/Result` 契约声明，`runtime` 对该契约做透传导出。Evidence: `packages/kernel/src/index.ts:1`, `packages/kernel/src/plan-contract.ts:1`, `packages/runtime/src/plan-contract.ts:1`
- `runtime` 的 `Blueprint` 当前是 generator 形态，并通过原语子路径暴露 `cede`。Evidence: `packages/runtime/src/blueprint.ts:3`, `packages/runtime/src/primitives/cede.ts:3`, `packages/runtime/package.json:13`
- `runtime` 与 `kernel` 均已切到 `dist/*.d.ts` 类型出口，并在 Vite 构建中生成声明文件。Evidence: `packages/runtime/package.json:10`, `packages/kernel/package.json:7`, `packages/runtime/vite.config.ts:17`, `packages/kernel/vite.config.ts:14`
- example 已按分层导入：执行入口来自 `@khora/runtime`，原语来自 `@khora/runtime/primitives`。Evidence: `apps/example/src/main.ts:1`, `apps/example/src/main.ts:2`

## 4. 执行阻力诊断（相对设计基线的增量）

> 仅记录相对设计基线的新事实与影响，不复述基线内容。

### 4.1 结论：两者都有问题，但主阻力在执行文档滞后

- Impact: 执行判断经常依赖过期状态，导致同类问题反复讨论与返工。
- Evidence: `execution.md:18` 仍描述 “`Plan` 在 runtime 内部定义、kernel 为 stub”，但现状已变为 `kernel` 承载契约并由 runtime 透传（`packages/kernel/src/index.ts:1`, `packages/runtime/src/plan-contract.ts:1`）。

### 4.2 设计源也存在漂移，集中在术语与承载形态

- Impact: 同一概念在设计文档与实现中的“承载位置/形态”不一致，阅读与执行路径切换成本高。
- Evidence: `docs/semantics.md:11` 定义 `Blueprint<T> = () => Plan<T>`，而当前实现是 generator 形态（`packages/runtime/src/blueprint.ts:3`）；`docs/runtime.md:9` 仍将 `Plan/Syscall` 表述为运行时承载面核心，而当前契约声明位于 `kernel`（`packages/kernel/src/plan-contract.ts:1`）。

### 4.3 当前切片的直接后果

- Impact: 开发阻力主要表现为“做法不难，决策反复确认成本高”，属于文档治理问题优先级高于代码实现问题。
- Evidence: 代码边界已形成可运行闭环（`apps/example/src/main.ts:1`, `packages/runtime/package.json:7`, `packages/kernel/package.json:7`），但执行文档与设计源对同一事实的落点不一致（`execution.md:18`, `docs/semantics.md:11`, `docs/runtime.md:9`）。

## 5. Build 阶段执行切片

### 5.1 Slice B1：同步 Execution Doc 到当前真实边界

- Status: **In Progress**
- Output: 将“契约归属、原语分层、类型出口”写为当前事实，移除过期叙述。
- Evidence: `packages/kernel/src/index.ts:1`, `packages/runtime/src/primitives/index.ts:1`, `packages/runtime/package.json:10`
- Next: 每次边界变更后在同一 PR 内更新 `execution.md`，避免状态再漂移。

### 5.2 Slice B2：收敛设计源中的关键漂移点

- Status: **Planned**
- Output: 仅修正与当前实现冲突的定义项，不扩写新设计。
- Evidence: `docs/semantics.md:11`, `docs/runtime.md:9`, `packages/runtime/src/blueprint.ts:3`, `packages/kernel/src/plan-contract.ts:1`
- Next: 先对齐 `Blueprint` 形态与 `Plan` 承载边界，再评估是否需要补“迁移注释”段。

## 6. 后续阶段方向

- Prove: 在文档对齐后补一组“文档声明 vs 导出面”一致性检查。
- Operate: 将 `build/typecheck` 结果与文档状态联动到同一回归入口。
- Ship: 固化术语字典（Blueprint/Plan/Primitive/Contract）并更新对外文档。
