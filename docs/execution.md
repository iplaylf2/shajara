# khora Execution Doc

## 1. 当前快照

Current Phase 为 **Build — Make it work**。runtime 的公开 API、原语桥接与宿主操作形状已基本闭合，当前主阻塞集中在 `kernel` 执行器实现（`ensureExecutor` 仍为占位实现），因此端到端执行路径尚未形成可运行闭环。当前基线文档为 `docs/README.md`、`docs/semantics.md`、`docs/runtime.md`、`docs/api.md` 与 `docs/design-constraints.md`。

## 2. 阶段看板

| Phase   | 当前定位                                                      |
| ------- | ------------------------------------------------------------- |
| Build   | 当前主阶段；完成 kernel 执行器落地并打通 runtime 端到端执行。 |
| Prove   | 非当前主阶段；待 Build 闭环后补足行为正确性验证。             |
| Operate | 非当前主阶段；待 Prove 后进入系统联调与运行环境验证。         |
| Ship    | 非当前阶段；待前三阶段收敛后进入交付准备。                    |

## 3. 当前现实与证据（Build）

1. 文档职责边界稳定：静态约束在 `docs/*.md`（不含 `docs/execution.md`），阶段状态集中在 Execution Doc。Evidence: `docs/README.md`, `docs/design-constraints.md`。
2. `kernel` 执行入口契约已收敛到 `rootScope + launch + post + terminate`，并通过 `ExecutionScope.result.onResult(...)` 暴露三态结果（`success | failure | interruption`）。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/index.ts`, `packages/runtime/src/operations-kit/runtime-launch.ts`。
3. `kernel` 执行器实现仍未落地：`ensureExecutor()` 当前仍调用 `notImplemented(...)`。这使 runtime 的 `run/createScope` 在运行期依赖未满足。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/internal/not-implemented.ts`, `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`。
4. runtime 语义桥接已闭环：`lowerPlan` 与 `liftPlan` 均已实现，`then/terminate` 路径接入 generator 协议；`all/race` 通过 tuple 降解入口统一对接 kernel primitive。Evidence: `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/adapter/plan-lift.ts`, `packages/runtime/src/primitives-kit/lower-runtime-blueprints.ts`, `packages/runtime/src/primitives/all.ts`, `packages/runtime/src/primitives/race.ts`。
5. runtime 宿主操作与结果收敛形状已落地：`run`、`createScope`、`action`、`sleep`、`until` 的调用协议与错误映射完整，`failure/interruption` 分别映射到 `RuntimeScopeFailedError/RuntimeScopeInterruptedError`；`run` 与 `scope.run` 统一复用 `RunOptions/StatefulPromise` 约束。Evidence: `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`, `packages/runtime/src/operations/action.ts`, `packages/runtime/src/operations/sleep.ts`, `packages/runtime/src/operations/until.ts`, `packages/runtime/src/operations-kit/runtime-launch.ts`, `packages/runtime/src/errors`。
6. 已验证 lint 与 typecheck 通过。Evidence: workspace 命令 `yarn lint`、`yarn typecheck`。

## 4. 相对设计基线增量（仅记录 delta）

### 4.1 增量：Build 聚焦点从“接口定型”收敛到“执行器落地”

Impact: 当前接口与桥接已基本定型，Build 剩余主任务收敛为 `kernel` 执行器实现与 runtime 端到端可运行闭环。Evidence: `packages/kernel/src/executor.ts`, `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`。

### 4.2 增量：runtime-first 保留，当前阻塞点显式化

Impact: runtime-first 路径下，runtime 侧桥接与宿主 API 已先行完成；当前阻塞集中在 kernel 执行器内部实现，而非 runtime 表面形状。Evidence: `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/adapter/plan-lift.ts`, `packages/runtime/src/operations/index.ts`, `packages/kernel/src/executor.ts`。

### 4.3 增量：runtime API 与错误收敛形状已固定

Impact: runtime 已统一 `ExecutionResult -> PromiseLike` 收敛策略，`failure/interruption` 分支异常类型已固定；`runtimeLaunch` 作为统一入口同时承载 launch、降解与 signal 终止治理。Evidence: `packages/runtime/src/operations-kit/runtime-launch.ts`, `packages/runtime/src/errors/runtime-scope-failed.ts`, `packages/runtime/src/errors/runtime-scope-interrupted.ts`。

### 4.4 增量：`receive` 最小垂直切片已实装并被 runtime 消费

Impact: kernel `receive` syscall/primitive 与 runtime `sleep/until/action` 的输入投递配对已成形，为后续端到端验证提供最小路径。Evidence: `packages/kernel/src/syscalls/receive.ts`, `packages/kernel/src/primitives/receive.ts`, `packages/runtime/src/operations/sleep.ts`, `packages/runtime/src/operations/until.ts`, `packages/runtime/src/operations/action.ts`。

### 4.5 增量：执行入口仍保留单一语义源约束

Impact: runtime 继续仅消费 kernel 契约，不引入第二执行循环；执行真相仍限定在 kernel。Evidence: `docs/runtime.md`, `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`。

## 5. 当前阶段执行切片（Build）

| Slice                                             | Status      | Output                                                                                                       | Evidence                                                                                                                                                                                                                       |
| ------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1 文档职责路由建立                               | Completed   | 文档职责边界已稳定，静态约束与动态状态分离。                                                                 | `docs/README.md`, `docs/design-constraints.md`, `docs/execution.md`                                                                                                                                                            |
| B2 kernel 执行入口契约与实现                      | In Progress | 契约形状已收敛，但 `ensureExecutor` 仍是占位实现。                                                           | `packages/kernel/src/executor.ts`, `packages/kernel/src/index.ts`                                                                                                                                                              |
| B3 runtime 语义桥闭环（lower/lift）               | Completed   | `RuntimePlan <-> Plan` 双向适配已落地，`then/terminate` 双路径接通。                                         | `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/adapter/plan-lift.ts`, `packages/runtime/src/primitives-kit/lower-runtime-blueprints.ts`                                                                   |
| B4 runtime 执行入口闭环（run）                    | In Progress | `run`/`scope.run` 已按目标契约接线到 `runtimeLaunch`（含 launch、降解、收敛与 signal 治理），但运行依赖 B2。 | `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`, `packages/runtime/src/operations-kit/runtime-launch.ts`, `packages/kernel/src/executor.ts`                                        |
| B5 primitive 垂直切片（最小集合）                 | Completed   | `receive` 垂直切片已接通到 runtime 宿主操作主路径。                                                          | `packages/kernel/src/syscalls/receive.ts`, `packages/kernel/src/primitives/receive.ts`, `packages/runtime/src/operations/sleep.ts`, `packages/runtime/src/operations/until.ts`, `packages/runtime/src/operations/action.ts`    |
| B6 宿主操作实现（createScope/action/sleep/until） | Completed   | API 形状与收敛逻辑已落地，包括 `state/closed/halt` 门闩、`post + receive` 结算与错误映射。                   | `packages/runtime/src/operations/create-scope.ts`, `packages/runtime/src/operations/action.ts`, `packages/runtime/src/operations/sleep.ts`, `packages/runtime/src/operations/until.ts`, `packages/runtime/src/errors/index.ts` |
| B7 基础验证（类型层）                             | Completed   | `@khora/runtime` 与 `@khora/kernel` typecheck 通过。                                                         | workspace 命令 `yarn workspace @khora/runtime typecheck`、`yarn workspace @khora/kernel typecheck`                                                                                                                             |

## 6. 后续方向

Build 阶段保持 runtime-first，近期按 `B2 -> B4 -> Prove` 推进：

1. `B2` 出口条件：`ensureExecutor()` 不再占位，具备可运行的 kernel 单例执行器。
2. `B4` 出口条件：`run/createScope` 可端到端执行，覆盖成功、失败、中断三态收敛。
3. Prove 入口条件：Build 主链闭环后，补充 `terminate`、作用域状态转换与异常传播验证。
