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
2. `kernel` 执行入口契约维持“显式 scope 锚点 + 单一 launch + post(scope, value)”；`post` 目标类型已收敛为 `PostRef`，`ScopeRef/SpawnRef/SelfDescriptor` 由 `kernel` 统一定义并导出；执行入口实现仍为占位。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/index.ts`。
3. `kernel` 已新增 syscall 子路径 `@khora/kernel/syscalls`，当前落地 `receive` 最小签名；同时在 primitives 中提供 `receive` 计划片段，供 runtime 通过 `liftPlan` 使用。Evidence: `packages/kernel/src/syscalls/receive.ts`, `packages/kernel/src/syscalls/index.ts`, `packages/kernel/src/primitives/receive.ts`, `packages/kernel/src/primitives/index.ts`, `packages/kernel/package.json`, `packages/kernel/vite.config.ts`。
4. runtime 语义桥已闭环：`lowerPlan` 与 `liftPlan` 都已落地，`then/terminate` 路径按 generator 协议推进；桥接已收敛到 `lowerPlan` 单入口，去除 `lowerBlueprint/lowerPrimitiveTuple` 中间包装。Evidence: `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/adapter/plan-lift.ts`, `packages/runtime/src/operations-kit/launch-runtime-blueprint.ts`, `packages/runtime/src/primitives/all.ts`, `packages/runtime/src/primitives/race.ts`。
5. runtime 宿主操作主路径已接通：`until` 采用 `scoped + receive + post`，`sleep` 采用 `scoped + try/finally(clearTimeout) + receive`，`action` 采用 `spawn + receive + post` 返回宿主结算句柄；相关 `scope/spawn/self` 描述类型直接消费 kernel 导出类型，不再由 runtime 重新包装。Evidence: `packages/runtime/src/operations/until.ts`, `packages/runtime/src/operations/sleep.ts`, `packages/runtime/src/operations/action.ts`, `packages/runtime/src/primitives/self.ts`, `packages/runtime/src/primitives/spawn.ts`。
6. runtime 的 `operations-kit` 已收敛到执行入口桥接（`await-execution`、`launch-runtime-blueprint`），不再承载 `until/receive` 状态抽象。Evidence: `packages/runtime/src/operations-kit/await-execution.ts`, `packages/runtime/src/operations-kit/launch-runtime-blueprint.ts`, `packages/runtime/src/operations`。
7. 本轮改动已通过 `@khora/runtime` 与 `@khora/kernel` 的 lint/typecheck。Evidence: `packages/runtime`, `packages/kernel`。
8. 文档治理已收敛：静态设计文档移除状态化措辞与待办式元描述，项目状态统一归档到 Execution Doc。Evidence: `docs/design-constraints.md`, `docs/semantics.md`, `docs/execution.md`。

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

Impact: kernel 对外导出面已清理未使用的 `Execution*Ref` 兼容别名，runtime 侧移除 `RuntimeSelfDescriptor/RuntimeSpawnRef` 包装定义并直接消费 kernel 类型，边界契约收敛到“单源定义 + 单点消费”。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/index.ts`, `packages/runtime/src/contracts.ts`, `packages/runtime/src/primitives/self.ts`, `packages/runtime/src/primitives/spawn.ts`。

### 4.10 增量：kernel 输入等待与输入投递配对契约

Impact: `receive` 以 syscall 最小单元落地并在 primitives 提供单步计划片段，runtime 通过 `liftPlan` 消费；宿主输入注入通过执行入口 `post` 签名承接，避免把 Promise 语义下沉到 kernel primitive。Evidence: `packages/kernel/src/syscalls/receive.ts`, `packages/kernel/src/primitives/receive.ts`, `packages/kernel/src/executor.ts`, `packages/runtime/src/operations/until.ts`。

### 4.11 增量：runtime 宿主操作改为“内联收敛”实现

Impact: `until/sleep/action` 去除过度中间抽象，直接在 operation 内部完成 `self/scope` 绑定、`receive` 等待与 `post` 结算，降低跨文件状态传递成本。Evidence: `packages/runtime/src/operations/until.ts`, `packages/runtime/src/operations/sleep.ts`, `packages/runtime/src/operations/action.ts`。

### 4.12 增量：Plan 续延契约改为“成功值直通”，失败建模下放到 syscall 语义

Impact: `Impure.then` 从统一二元包裹收敛为只接收 syscall 成功值；可恢复业务失败是否带内表达改由具体 syscall 决定。runtime 桥接同步改为成功值直通，执行器异常保持带外传播，减少跨层固定失败塑形假设。Evidence: `packages/kernel/src/contracts.ts`, `packages/kernel/src/primitives/receive.ts`, `packages/runtime/src/adapter/plan-lift.ts`, `packages/runtime/src/adapter/plan-lower.ts`, `docs/runtime.md`, `docs/semantics.md`, `docs/design-constraints.md`。

### 4.13 增量：文档职责治理收敛到“静态约束 vs 动态状态”

Impact: 静态设计文档仅保留稳定语义与约束，不再夹带项目阶段状态与待办式叙述；项目状态统一集中在 Execution Doc，降低跨文档职责混淆。Evidence: `docs/design-constraints.md`, `docs/semantics.md`, `docs/README.md`, `docs/execution.md`。

## 5. 当前阶段执行切片（Build）

| Slice                                             | Status      | Output                                                                                                                                  | Evidence                                                                                                                                                                                                                         |
| ------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 文档职责路由建立                               | Completed   | `docs/` 职责边界已可单点检索。                                                                                                          | `docs/README.md`                                                                                                                                                                                                                 |
| B2 kernel 执行入口契约与最小实现                  | In Progress | 执行入口契约维持 `rootScope()` + `launch(scope, blueprint)` + `createScope` + `post(scope, value)`；目标引用类型收敛为 `PostRef/ScopeRef/SpawnRef/SelfDescriptor`，实现仍占位。 | `packages/kernel/src/executor.ts`, `packages/kernel/src/index.ts`, `packages/kernel/src/contracts.ts`, `docs/semantics.md`                                                                                                       |
| B3 runtime 语义桥闭环（lower/lift）               | Completed   | `RuntimePlan -> Plan` 与 `Plan -> RuntimePlan` 适配已落地，`then/terminate` 双路径已接入 generator 协议，且桥接入口收敛为 `lowerPlan`。 | `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/adapter/plan-lift.ts`, `packages/runtime/src/operations-kit/launch-runtime-blueprint.ts`, `docs/runtime.md`                                                  |
| B4 runtime 执行入口闭环（run）                    | In Progress | `run(RuntimeBlueprint)` 已提交到 kernel 执行入口并接入 Future 结果；受 `lowerPlan` 与 kernel 占位实现限制，尚未形成可运行闭环。         | `packages/runtime/src/operations/run.ts`, `packages/runtime/src/adapter/plan-lower.ts`, `packages/kernel/src/executor.ts`                                                                                                        |
| B5 primitive 垂直切片（最小集合）                 | In Progress | `receive` 已作为最小 syscall/primitive 垂直切片接入，其他 primitives 语义实现仍待补齐。                                                 | `packages/kernel/src/syscalls/receive.ts`, `packages/kernel/src/primitives/receive.ts`, `packages/runtime/src/operations/until.ts`                                                                                               |
| B6 宿主操作实现（createScope/action/sleep/until） | In Progress | `createScope`、`run`、`action`、`sleep`、`until` 形状已接通；依赖 kernel 执行入口与 primitive 语义实现完成后才能形成端到端运行闭环。    | `packages/runtime/src/operations/create-scope.ts`, `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/action.ts`, `packages/runtime/src/operations/sleep.ts`, `packages/runtime/src/operations/until.ts` |
| B7 kernel 支持缺口回补（按触发）                  | In Progress | 已触发并回补最小支持缺口（`post` 签名、`receive` syscall/primitive）；后续继续按触发条件最小化扩面。                                    | `packages/kernel/src/executor.ts`, `packages/kernel/src/syscalls/receive.ts`, `packages/kernel/src/primitives/receive.ts`                                                                                                        |

## 6. 后续方向

Build 阶段保持 runtime-first，近期按 `B2 -> B3 -> B4 -> B5 -> B6` 顺序推进。其中：

1. `B2` 出口条件：具备可被 runtime 调用的 kernel 执行入口，且入口契约与 `Plan/Blueprint` 类型一致。
2. `B4` 出口条件：`run` 端到端打通，从 `RuntimeBlueprint` 到 Promise 结果。
3. `B6` 出口条件：宿主操作在不引入第二执行语义源前提下完成 `post + receive` 结算路径，并与执行入口契约对齐。

Prove 阶段仅在 Build 主链完成最小闭环后进入，重点验证 `terminate` 路径、失败传播与作用域收敛一致性。Operate 阶段保留给宿主环境联调与集成验收。
