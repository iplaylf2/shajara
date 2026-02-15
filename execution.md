# khora Execution Doc

## 1. 当前快照

- Current Phase: **Build — Make it work**
- Baseline Docs: `README.md`, `docs/semantics.md`, `docs/runtime.md`, `docs/api.md`

## 2. 阶段看板

- Build: 当前阶段。主路径已形成最小可运行闭环，当前重点是稳定导出面、推进语义覆盖与行为细化。
- Prove: 仅保留方向，待补齐行为矩阵后再系统化收敛验证。
- Operate: 仅保留方向，待运行时行为稳定后推进端到端联调脚本。
- Ship: 仅保留方向，待 API 与行为稳定后再收敛交付文档。

## 3. 当前现实与证据

- 仓库当前处于开发中，接口与实现仍会继续迭代。Evidence: `README.md:5`
- 根工作区已包含 `internal/*`、`packages/*` 与 `apps/*`，工程边界已扩展为“内建支撑/核心包/示例应用”。Evidence: `package.json:3`, `package.json:6`
- 根脚本已形成统一工程入口：`build`/`typecheck`/`lint`/`format`。Evidence: `package.json:8`, `package.json:12`
- `@khora/kernel` 当前仅保留显式 `stub` 导出与构建脚本，避免伪实现干扰迭代判断。Evidence: `packages/kernel/src/index.ts:1`, `packages/kernel/package.json:17`
- `@khora/runtime` 已落地最小宿主 API 主路径（`createRuntime`、`post`、`yieldNow`），并拆分为清晰的边界入口与执行角色文件。Evidence: `packages/runtime/src/index.ts:1`, `packages/runtime/src/runtime-api.ts:14`, `packages/runtime/src/flow.ts:9`
- `@khora/example` 已作为 `apps` 下示例应用包初始化，使用 Node 目标 Vite 单入口产物验证最小调用路径。Evidence: `apps/example/package.json:2`, `apps/example/vite.config.ts:6`, `apps/example/src/main.ts:1`
- 构建工具已统一为 Vite，且通过子包脚本执行。Evidence: `packages/kernel/package.json:17`, `packages/runtime/package.json:17`
- 代码质量闸门已接入子包级 lint，且由根脚本并行编排。Evidence: `package.json:11`, `packages/kernel/package.json:18`, `packages/runtime/package.json:18`

## 4. 相对设计基线的增量

> 仅记录相对设计基线的新事实与影响，不复述基线内容。

### 4.1 增量一：双包边界已实际落地

- Impact: B1 已完成，后续实现可在 `runtime -> kernel` 方向上继续细化而无需再做结构迁移。
- Evidence: `package.json:5`, `packages/runtime/package.json:21`, `packages/kernel/package.json:2`

### 4.2 增量二：API 主路径已具备可运行最小实现

- Impact: B2 从“建壳”进入“补行为”阶段，下一步应围绕协议语义补充非 happy-path 与调度一致性。
- Evidence: `packages/runtime/src/runtime-api.ts:14`, `packages/runtime/src/runtime-runner.ts:5`, `packages/runtime/src/flow.ts:9`

### 4.3 增量三：质量与构建闸门前置到根脚本

- Impact: Build 阶段已具备稳定的工程回归入口，可在每次语义迭代中快速验证构建、类型与风格。
- Evidence: `package.json:8`, `package.json:11`, `package.json:12`

### 4.4 增量四：当前实现仍是最小闭环，尚未覆盖终止/收敛核心语义

- Impact: 进入 Prove 前需补齐 `Halt`、`AwaitScope`、未处理 `Fault` 等关键路径与用例。
- Evidence: `packages/runtime/src/runtime-runner.ts:18`, `docs/semantics.md:108`, `docs/semantics.md:120`, `docs/semantics.md:156`

### 4.5 增量五：kernel 进入冻结占位状态，runtime 作为当前主迭代面

- Impact: Build 阶段当前切片聚焦 runtime 语义补齐；kernel 暂不承载行为实现，仅维持包边界与导出契约。
- Evidence: `packages/kernel/src/index.ts:1`, `packages/runtime/src/runtime-api.ts:14`

### 4.6 增量六：示例应用包已落位，当前用于验证最小 run/yield 主路径

- Impact: 示例验证路径已从“文档叙述”转为“真实代码调用”，但当前仅覆盖 `run + yieldNow`，尚未验证 `post` 与更复杂协议路径。
- Evidence: `apps/example/src/main.ts:8`, `packages/runtime/src/runtime-api.ts:10`

## 5. Build 阶段执行切片

### 5.1 Slice B1：建立双工作区边界

- Status: **Done**
- Output: `packages/runtime` 与 `packages/kernel` 已建立并纳入根工作区。
- Evidence: `package.json:5`, `packages/kernel/package.json:2`, `packages/runtime/package.json:2`

### 5.2 Slice B2：runtime 先行落 API 主路径

- Status: **In Progress**
- Output: 已有 `createRuntime`/`post`/`yieldNow` 最小路径，可驱动 `yield-now` 指令推进。
- Evidence: `packages/runtime/src/runtime-api.ts:14`, `packages/runtime/src/runtime-api.ts:18`, `packages/runtime/src/flow.ts:9`
- Next: 补充异常路径与更多 syscall 语义对齐，并收敛宿主 API 设计分歧。

### 5.3 Slice B3：kernel 占位并保持边界

- Status: **Parked**
- Output: `@khora/kernel` 已收敛为显式 `stub` 占位导出，不再提供近似真实实现。
- Evidence: `packages/kernel/src/index.ts:1`

### 5.4 Slice B4：example 应用包落位并联通 runtime 最小调用

- Status: **Done**
- Output: `apps/example` 已建立并通过 `main.ts` 打通 `createRuntime + yieldNow` 的最小调用闭环。
- Evidence: `apps/example/package.json:2`, `apps/example/src/main.ts:1`, `apps/example/vite.config.ts:6`

## 6. 后续阶段方向

- Prove: 建立语义对齐用例矩阵，优先覆盖 `Halt`、`AwaitScope`、未处理 `Fault`。
- Operate: 增加宿主事件注入与调度推进的端到端回放脚本。
- Ship: 收敛稳定 API 文档与迁移说明。
