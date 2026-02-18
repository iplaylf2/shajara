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
2. `kernel` 当前仅暴露类型与 primitives，对外尚无可直接承载 `RuntimeBlueprint` 运行的执行入口契约。Evidence: `packages/kernel/src/index.ts`, `packages/kernel/src/plan-contract.ts`。
3. runtime 关键桥接尚未闭环：`liftPlan`、`lowerPlan`、`run` 仍为未实现。Evidence: `packages/runtime/src/adapter/plan-lift.ts`, `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/operations/run.ts`。
4. runtime 宿主操作仍有未实现入口（`createScope/action/sleep/until`），不具备完整宿主侧运行能力。Evidence: `packages/runtime/src/operations/create-scope.ts`, `packages/runtime/src/operations/action.ts`, `packages/runtime/src/operations/sleep.ts`, `packages/runtime/src/operations/until.ts`。
5. kernel primitives 仍有未实现项，但本轮不作为主动清理目标，仅在 runtime 触发条件成立时处理。Evidence: `packages/kernel/src/primitives/cede.ts`, `packages/kernel/src/primitives/all.ts`, `packages/kernel/src/primitives/bind.ts`。

## 4. 相对设计基线增量（仅记录 delta）

### 4.1 增量：Build 前置单一执行入口决策

Impact: 在 Build 阶段先定义并实现 `kernel` 的执行入口（全局 root 锚点 + 运行提交接口），再推进 runtime 桥接，避免 runtime 新增独立执行器造成语义分叉。Evidence: `docs/semantics.md`, `docs/runtime.md`, `packages/kernel/src/index.ts`, `packages/runtime/src/operations/run.ts`。

### 4.2 增量：runtime-first 保留，但切片顺序调整为“执行契约 -> 语义桥接 -> 宿主能力”

Impact: runtime-first 不变，且 `kernel` 仍按触发条件最小化变更；新增的只是 Build 序列化顺序，用于先消除执行入口不确定性。Evidence: `docs/runtime.md`, `docs/api.md`, `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/operations/run.ts`。

### 4.3 增量：新增 kernel 变更触发条件

Impact: kernel 变更需满足明确判据，避免在 Build 阶段扩散到非必要重构。触发条件：

1. 签名/契约不一致：runtime 落地时验证到 kernel 公开签名无法表达既定语义。
2. 支持缺口：runtime 落地时验证到缺少必要 kernel 能力（非 runtime 层可消化问题）。
   Evidence: `docs/runtime.md`, `docs/api.md`, `packages/kernel/src/plan-contract.ts`。

### 4.4 增量：Build 切片改为“执行入口优先、桥接次之、宿主随后”

Impact: 先验证执行入口契约，再验证 runtime 语义桥与最小 primitive 闭环，最后推进宿主操作与生命周期 API。Evidence: `packages/kernel/src/index.ts`, `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/operations/index.ts`。

## 5. 当前阶段执行切片（Build）

| Slice                                             | Status      | Output                                                                                | Evidence                                                                                                                                                                                              |
| ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 文档职责路由建立                               | Completed   | `docs/` 职责边界已可单点检索。                                                        | `docs/README.md`                                                                                                                                                                                      |
| B2 kernel 执行入口契约与最小实现                  | In Progress | 定义并实现单一执行入口：接收 `Blueprint` 并推进到 `Promise` 结果。                    | `packages/kernel/src/index.ts`, `packages/kernel/src/plan-contract.ts`, `docs/semantics.md`                                                                                                           |
| B3 runtime 语义桥闭环（lower/lift）               | Pending     | 实现 `RuntimePlan -> Plan` 与 `Plan -> RuntimePlan` 适配，保证 `then/terminate` 与 generator 协议一致。 | `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/adapter/plan-lift.ts`, `docs/runtime.md`                                                                                          |
| B4 runtime 执行入口闭环（run）                    | Pending     | `run(RuntimeBlueprint)` 通过 `lowerBlueprint` 提交到 kernel 执行入口，形成最小可运行路径。 | `packages/runtime/src/operations/run.ts`, `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/operations/index.ts`                                                                    |
| B5 primitive 垂直切片（最小集合）                 | Pending     | 选取最小原语集合完成 runtime primitive 到 kernel primitive 的端到端验证。             | `packages/runtime/src/primitives/cede.ts`, `packages/runtime/src/primitives/bind.ts`, `packages/runtime/src/primitives/all.ts`                                                                        |
| B6 宿主操作实现（createScope/action/sleep/until） | Pending     | 按 API 约束补齐宿主侧生命周期与异步桥接能力。                                         | `packages/runtime/src/operations/create-scope.ts`, `packages/runtime/src/operations/action.ts`, `packages/runtime/src/operations/sleep.ts`, `packages/runtime/src/operations/until.ts`, `docs/api.md` |
| B7 kernel 支持缺口回补（按触发）                  | Conditional | 仅在验证到签名错误或支持缺口时最小化调整 kernel，避免主动扩面。                       | `packages/kernel/src/plan-contract.ts`, `packages/kernel/src/primitives/index.ts`                                                                                                                     |

## 6. 后续方向

Build 阶段保持 runtime-first，近期按 `B2 -> B3 -> B4 -> B5 -> B6` 顺序推进。其中：

1. `B2` 出口条件：具备可被 runtime 调用的 kernel 执行入口，且入口契约与 `Plan/Blueprint` 类型一致。
2. `B3` 出口条件：`lowerPlan/liftPlan` 可覆盖 `then/terminate` 双路径，且不引入第二执行语义源。
3. `B4` 出口条件：`run` 端到端打通，从 `RuntimeBlueprint` 到 Promise 结果。

Prove 阶段仅在 Build 主链完成最小闭环后进入，重点验证 `terminate` 路径、失败传播与作用域收敛一致性。Operate 阶段保留给宿主环境联调与集成验收。
