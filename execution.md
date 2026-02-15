# khora Execution Doc

## 1. 当前快照

- Current Phase: **Build — Make it work**
- Baseline Docs: `README.md`, `docs/semantics.md`, `docs/runtime.md`, `docs/api.md`

## 2. 阶段看板

- Build: 当前阶段。API 主路径在 example 原型中已可用，当前重点从“能跑”转向“类型与职责边界收敛”。
- Prove: 仅保留方向，待 `Blueprint/Plan` 边界稳定后补齐语义一致性验证。
- Operate: 仅保留方向，待 kernel/runtime 契约稳定后推进跨包联调脚本。
- Ship: 仅保留方向，待 API 与语义术语冻结后收敛文档与迁移说明。

## 3. 当前现实与证据

- `@khora/runtime` 已对外导出 `Blueprint`、`Plan` 相关类型与 `run/post` 主入口，当前 API 形态可被示例直接消费。Evidence: `packages/runtime/src/index.ts:1`, `packages/runtime/src/index.ts:4`, `packages/runtime/src/index.ts:15`
- `Blueprint` 当前是 generator 形式（`Generator<RuntimeInstruction, ReturnValue, ...>`），并内置最小 `cede` 指令。Evidence: `packages/runtime/src/blueprint.ts:5`, `packages/runtime/src/blueprint.ts:11`
- `Plan` 当前是 `pure/impure` 联合类型，`impure` 分支承载 syscall 与 continuation（`then/terminate`）。Evidence: `packages/runtime/src/plan-contract.ts:24`, `packages/runtime/src/plan-contract.ts:29`, `packages/runtime/src/plan-contract.ts:36`
- `@khora/kernel` 仍处于 stub 占位状态，尚未承载声明性协议类型。Evidence: `packages/kernel/src/index.ts:1`, `packages/kernel/src/index.ts:5`
- example 已验证 runtime 最小调用闭环（`Blueprint + cede + run`）。Evidence: `apps/example/src/main.ts:1`, `apps/example/src/main.ts:4`, `apps/example/src/main.ts:11`

## 4. 相对设计基线的增量

> 仅记录相对设计基线的新事实与影响，不复述基线内容。

### 4.1 增量一：API 主路径已满足原型验证，问题收敛到“定义放置位置”

- Impact: 当前迭代不再优先扩 API 面，而是优先收敛 `Blueprint/Plan` 的声明归属与命名语义。
- Evidence: `apps/example/src/main.ts:1`, `packages/runtime/src/index.ts:1`

### 4.2 增量二：`Blueprint` 与 `Plan` 已有可用最小定义，但仍放在 runtime

- Impact: 现状支撑快速试验；但从职责分离看，声明层与执行层仍耦合在一个包内，后续迁移成本会上升。
- Evidence: `packages/runtime/src/blueprint.ts:5`, `packages/runtime/src/plan-contract.ts:36`

### 4.3 增量三：kernel/runtime 的目标职责边界已明确为“声明在 kernel，执行在 runtime”

- Impact: 后续切片应将 GADT/协议声明提升到 kernel；runtime 保持 generator 驱动与调度执行，不复制声明语义。
- Evidence: `packages/kernel/src/index.ts:1`, `packages/runtime/src/blueprint.ts:5`

### 4.4 增量四：当前仍处于 Build 语义建模阶段，尚未进入行为正确性收敛

- Impact: 在完成声明迁移与边界固定前，不进入系统化 Prove 阶段。
- Evidence: `execution.md:5`, `packages/kernel/src/index.ts:1`

## 5. Build 阶段执行切片

### 5.1 Slice B1：维持可运行原型主路径

- Status: **Done**
- Output: example 已稳定验证 `Blueprint -> run` 最小主路径。
- Evidence: `apps/example/src/main.ts:4`, `apps/example/src/main.ts:11`

### 5.2 Slice B2：明确 `Blueprint` 定义意图（执行形态 vs 声明形态）

- Status: **In Progress**
- Output: 已确认 runtime 侧保留 generator 形态作为执行承载。
- Evidence: `packages/runtime/src/blueprint.ts:5`
- Next: 抽离声明性类型（可包含 GADT 约束）到 kernel，并由 runtime 消费该声明。

### 5.3 Slice B3：明确 `Plan` 契约归属与 continuation 语义

- Status: **In Progress**
- Output: `Plan` 最小结构已存在并可表达 `pure/impure + continuation`。
- Evidence: `packages/runtime/src/plan-contract.ts:24`, `packages/runtime/src/plan-contract.ts:29`, `packages/runtime/src/plan-contract.ts:36`
- Next: 评估 `Plan` 声明迁移到 kernel 的最小切面，runtime 仅保留解释与推进逻辑。

### 5.4 Slice B4：kernel 从 stub 过渡到“声明容器”

- Status: **Planned**
- Output: 当前仍是 stub，占位完成但未承载协议声明。
- Evidence: `packages/kernel/src/index.ts:1`
- Next: 先引入协议/GADT 声明导出，再由 runtime 改为依赖 kernel 契约。

## 6. 后续阶段方向

- Prove: 在声明迁移完成后，建立 kernel 契约与 runtime 执行一致性用例。
- Operate: 增加跨包回归脚本，验证 example 对 kernel/runtime 拆分的兼容性。
- Ship: 固化对外术语（Blueprint/Plan/Instruction）并更新 API 文档。
