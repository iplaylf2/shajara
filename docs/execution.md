# khora Execution Doc

## 1. 当前快照

Current Phase 为 **Build — Make it work**。当前实现主线仍采用 **runtime-first**，但 Build 切片已增加前置决策：先定义并落地 `kernel` 的单一执行入口，再闭合 `runtime` 的降解与宿主桥接。当前规划目标是避免形成“双执行语义源”：`kernel` 作为唯一 `Plan` 执行真相，`runtime` 作为 `RuntimePlan -> Plan` 适配与宿主 API 承载层。当前基线文档为 `docs/README.md`、`docs/semantics.md`、`docs/runtime.md`、`docs/api.md` 与 `docs/design-constraints.md`。

## 2. 阶段看板

| Phase   | 当前定位                                                               |
| ------- | ---------------------------------------------------------------------- |
| Build   | 当前主阶段；按 runtime-first 推进执行闭环，kernel 变更受触发条件治理。 |
| Prove   | 当前未作为主阶段，仅保留后续验证方向。                                 |
| Operate | 当前未作为主阶段，仅保留后续联调方向。                                 |
| Ship    | 非当前阶段；仅保留收敛导向，不展开执行细节。                           |

## 3. 当前现实与证据（Build）

1. 文档职责边界已稳定，Execution Doc 可回到“实现状态快照”角色。Evidence: `docs/README.md`, `docs/design-constraints.md`。
2. `kernel` 执行入口契约已收敛为“显式 scope 锚点 + 单一 launch”：`rootScope()` 暴露顶级锚点，`launch(scope, Blueprint)` 统一 root/scoped 运行提交，`createScope()` 提供托管 scope 句柄；收敛仍通过 `future/onSettle` 与 `scope/onClose` 暴露。当前实现仍为占位。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/index.ts`。
3. `kernel` 执行契约已移除 runtime 未消费的冗余暴露：删除 `ExecutionRef`、`ExecutionFuture.state()` 及其快照相关类型，并收缩根入口 executor 相关导出到最小使用面。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/index.ts`, `packages/runtime/src/operations-kit/await-execution.ts`。
4. runtime 执行入口已接入 kernel 执行契约，但语义桥仍未闭环：`lowerPlan`、`liftPlan` 仍为未实现。Evidence: `packages/runtime/src/operations/run.ts`, `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/adapter/plan-lift.ts`。
5. runtime 宿主操作已完成 `createScope` 与 `run` 收敛路径统一（共用 `future -> Promise` 映射），但 `action/sleep/until` 仍未实现，尚不具备完整宿主侧运行能力。Evidence: `packages/runtime/src/operations/create-scope.ts`, `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations-kit/await-execution.ts`, `packages/runtime/src/operations/action.ts`, `packages/runtime/src/operations/sleep.ts`, `packages/runtime/src/operations/until.ts`。
6. `kernel` 导出面已完成治理：根入口仅保留核心契约/执行入口，primitives 通过独立子路径 `@khora/kernel/primitives` 暴露。Evidence: `packages/kernel/src/index.ts`, `packages/kernel/src/primitives/index.ts`, `packages/kernel/package.json`, `packages/kernel/vite.config.ts`。
7. 契约命名已做一次一致化治理：`plan-contract.ts` 重命名为 `contracts.ts`，并将 `Kernel*` 类型前缀收敛为包内语义命名（如 `Execution*`、`RaceResult`、`ResourceBody`）。Evidence: `packages/kernel/src/contracts.ts`, `packages/kernel/src/executor.ts`, `packages/kernel/src/primitives/index.ts`, `packages/runtime/src/primitives/race.ts`。
8. 本轮改动已通过仓库格式与静态检查。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/index.ts`, `packages/runtime/src/operations/create-scope.ts`, `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations-kit/await-execution.ts`, `packages/runtime/src/operations-kit/launch-runtime-blueprint.ts`。

## 4. 相对设计基线增量（仅记录 delta）

### 4.1 增量：Build 前置单一执行入口决策

Impact: 在 Build 阶段先定义并实现 `kernel` 的执行入口（全局 root 锚点 + 运行提交接口），再推进 runtime 桥接，避免 runtime 新增独立执行器造成语义分叉。Evidence: `docs/semantics.md`, `docs/runtime.md`, `packages/kernel/src/index.ts`, `packages/runtime/src/operations/run.ts`。

### 4.2 增量：runtime-first 保留，但切片顺序调整为“执行契约 -> 语义桥接 -> 宿主能力”

Impact: runtime-first 不变，且 `kernel` 仍按触发条件最小化变更；新增的只是 Build 序列化顺序，用于先消除执行入口不确定性。Evidence: `docs/runtime.md`, `docs/api.md`, `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/operations/run.ts`。

### 4.3 增量：新增 kernel 变更触发条件

Impact: kernel 变更需满足明确判据，避免在 Build 阶段扩散到非必要重构。触发条件：

1. 签名/契约不一致：runtime 落地时验证到 kernel 公开签名无法表达既定语义。
2. 支持缺口：runtime 落地时验证到缺少必要 kernel 能力（非 runtime 层可消化问题）。
   Evidence: `docs/runtime.md`, `docs/api.md`, `packages/kernel/src/contracts.ts`。

### 4.4 增量：Build 切片改为“执行入口优先、桥接次之、宿主随后”

Impact: 先验证执行入口契约，再验证 runtime 语义桥与最小 primitive 闭环，最后推进宿主操作与生命周期 API。Evidence: `packages/kernel/src/index.ts`, `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/operations/index.ts`。

### 4.5 增量：执行入口契约收敛为 Future 结果模型

Impact: `kernel` 执行入口从“运行器细节暴露”收敛为“结果收敛契约暴露”：runtime 只消费 `ensureExecutor().rootScope()`、`ensureExecutor().launch(scope, ...)` 与 `future.onSettle(ok/err)`，不承担执行器创建与推进职责，避免跨层职责漂移。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/index.ts`, `packages/runtime/src/operations/run.ts`。

### 4.6 增量：kernel 导出面改为“根入口 + primitives 子路径”

Impact: 对外导出职责更清晰，`Plan/Executor` 与 primitives 分离，调用端可按职责显式选择导入路径，避免根入口持续扩张。Evidence: `packages/kernel/src/index.ts`, `packages/kernel/src/primitives/index.ts`, `packages/kernel/package.json`, `packages/kernel/vite.config.ts`, `packages/runtime/src/primitives/all.ts`。

### 4.7 增量：kernel 契约命名去前缀与文件命名收敛

Impact: 包内类型命名从“自指前缀”收敛为语义命名，降低阅读噪音；`plan-contract.ts` 更名为 `contracts.ts`，路径语义与内容范围一致。Evidence: `packages/kernel/src/contracts.ts`, `packages/kernel/src/executor.ts`, `packages/kernel/src/primitives/index.ts`, `packages/runtime/src/primitives/scoped.ts`。

### 4.8 增量：执行入口收敛为“显式 scope + 单一 launch”

Impact: `runtime.run` 与 `runtime.createScope().run` 走同一个 kernel 调用形状：`launch(scope, blueprint)`；差异只在 scope 来源（`rootScope()` 或托管 `scope.ref`）。runtime 不再维护并行入口语义。Evidence: `packages/kernel/src/executor.ts`, `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`, `packages/runtime/src/operations-kit/launch-runtime-blueprint.ts`。

### 4.9 增量：执行契约去除未消费类型与导出

Impact: runtime 与 kernel 的边界契约收敛到“实际使用面”，避免保留未被消费的状态快照与引用类型，减少后续误用入口与历史包袱。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/index.ts`, `packages/runtime/src/operations-kit/await-execution.ts`。

## 5. 当前阶段执行切片（Build）

| Slice                                             | Status      | Output                                                                                                                          | Evidence                                                                                                                                                                                              |
| ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 文档职责路由建立                               | Completed   | `docs/` 职责边界已可单点检索。                                                                                                  | `docs/README.md`                                                                                                                                                                                      |
| B2 kernel 执行入口契约与最小实现                  | In Progress | 执行入口契约已收敛为 `rootScope()` + `launch(scope, blueprint)` + `createScope`，并移除 runtime 未消费的执行快照/引用类型暴露；实现仍占位。 | `packages/kernel/src/executor.ts`, `packages/kernel/src/index.ts`, `packages/kernel/src/contracts.ts`, `packages/kernel/src/primitives/index.ts`, `packages/kernel/package.json`, `docs/semantics.md` |
| B3 runtime 语义桥闭环（lower/lift）               | Pending     | 实现 `RuntimePlan -> Plan` 与 `Plan -> RuntimePlan` 适配，保证 `then/terminate` 与 generator 协议一致。                         | `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/adapter/plan-lift.ts`, `docs/runtime.md`                                                                                          |
| B4 runtime 执行入口闭环（run）                    | In Progress | `run(RuntimeBlueprint)` 已提交到 kernel 执行入口并接入 Future 结果；受 `lowerPlan` 与 kernel 占位实现限制，尚未形成可运行闭环。 | `packages/runtime/src/operations/run.ts`, `packages/runtime/src/adapter/plan-lower.ts`, `packages/kernel/src/executor.ts`                                                                             |
| B5 primitive 垂直切片（最小集合）                 | Pending     | 选取最小原语集合完成 runtime primitive 到 kernel primitive 的端到端验证。                                                       | `packages/runtime/src/primitives/cede.ts`, `packages/runtime/src/primitives/bind.ts`, `packages/runtime/src/primitives/all.ts`                                                                        |
| B6 宿主操作实现（createScope/action/sleep/until） | In Progress | `createScope` 已接入 kernel 托管 scope 契约并闭合 `run/halt/state/closed` 形状；`action/sleep/until` 待补齐。                   | `packages/runtime/src/operations/create-scope.ts`, `packages/runtime/src/operations/action.ts`, `packages/runtime/src/operations/sleep.ts`, `packages/runtime/src/operations/until.ts`, `docs/api.md` |
| B7 kernel 支持缺口回补（按触发）                  | Conditional | 仅在验证到签名错误或支持缺口时最小化调整 kernel，避免主动扩面。                                                                 | `packages/kernel/src/contracts.ts`, `packages/kernel/src/primitives/index.ts`                                                                                                                         |

## 6. 后续方向

Build 阶段保持 runtime-first，近期按 `B2 -> B3 -> B4 -> B5 -> B6` 顺序推进。其中：

1. `B2` 出口条件：具备可被 runtime 调用的 kernel 执行入口，且入口契约与 `Plan/Blueprint` 类型一致。
2. `B3` 出口条件：`lowerPlan/liftPlan` 可覆盖 `then/terminate` 双路径，且不引入第二执行语义源。
3. `B4` 出口条件：`run` 端到端打通，从 `RuntimeBlueprint` 到 Promise 结果。

Prove 阶段仅在 Build 主链完成最小闭环后进入，重点验证 `terminate` 路径、失败传播与作用域收敛一致性。Operate 阶段保留给宿主环境联调与集成验收。
