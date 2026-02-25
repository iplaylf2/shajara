# khora Execution Doc

## 1. 当前快照

Current Phase 为 **Build — Make it work**。当前主阻塞仍是 `kernel` 执行器实现未落地（`ensureExecutor` 仍为占位实现）；runtime 公开 API、原语桥接与宿主操作形状已形成可接线状态，但端到端运行闭环依赖执行器实现完成。

## 2. 当前现实与证据（Build）

1. 执行入口契约已稳定：`launch` 接受 `ExecutionScopeRootRef | ExecutionScopeRef`，`post` 仅接受 `IngressScopeRef`，`terminate` 仅接受 `ExecutionScopeRef`；结果收敛仍基于 `LaunchResult` 三态（`success | failure | interruption`）。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/contracts/scope.ts`, `packages/runtime/src/operations-kit/runtime-launch.ts`。
2. `kernel` 执行器实现仍未落地：`ensureExecutor()` 当前返回占位实现，导致 `run/createScope` 运行期依赖未满足。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/internal/not-implemented.ts`, `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`。
3. runtime 桥接主链已接通：`lowerPlan/liftPlan`、`then/terminate` 推进、`all/race` tuple 降解入口均已落地。Evidence: `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/adapter/plan-lift.ts`, `packages/runtime/src/primitives-kit/lower-runtime-blueprints.ts`, `packages/runtime/src/primitives/all.ts`, `packages/runtime/src/primitives/race.ts`。
4. 宿主操作形状已收敛：`run/createScope/action/sleep/until` 均接入 runtime 收敛协议，`failure/interruption` 分别映射到 runtime 错误类型。Evidence: `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`, `packages/runtime/src/operations/action.ts`, `packages/runtime/src/operations/sleep.ts`, `packages/runtime/src/operations/until.ts`, `packages/runtime/src/errors`。
5. scope spec 入口已完成结构重排：基础类型并入 `contracts/scope.ts`，角色条目收敛到 `scopes/*`，共享工厂放入 `scopes-kit/factory.ts`，运行时调用统一使用 `@khora/kernel/scopes`。Evidence: `packages/kernel/src/contracts/scope.ts`, `packages/kernel/src/scopes/index.ts`, `packages/kernel/src/scopes/ingress.ts`, `packages/kernel/src/scopes-kit/factory.ts`, `packages/runtime/src/primitives/spawn.ts`, `packages/runtime/src/primitives/scoped.ts`, `packages/runtime/src/operations/action.ts`。
6. kernel 计划模型已收敛为 `PurePlan/ImpurePlan` 命名，并将 syscall 返回类型绑定方式收敛为“`Syscall` 基础契约 + syscall 自身 `return` tuple 见证 + `SyscallReturn` 推导”；runtime `Plan <-> RuntimePlan` 适配链已同步该约束。Evidence: `packages/kernel/src/contracts/plan.ts`, `packages/kernel/src/contracts/syscall.ts`, `packages/kernel/src/syscalls/*.ts`, `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/adapter/plan-lift.ts`, `packages/runtime/src/contracts.ts`, `apps/example/src/scenarios.ts`。

## 3. 相对设计基线增量（仅记录 delta）

### 3.1 delta：scope spec 结构边界收敛

Impact: `scope spec` 基础类型与角色条目分离，`scopes` 目录保持“角色集合”语义，边界共享支撑迁至 `scopes-kit`，目录语义更清晰。Evidence: `packages/kernel/src/contracts/scope.ts`, `packages/kernel/src/scopes/index.ts`, `packages/kernel/src/scopes-kit/factory.ts`。

### 3.2 delta：kernel 子路径命名收敛到 `@khora/kernel/scopes`

Impact: 公开入口从单数命名收敛到集合命名，运行时侧调用与文档引用同步到 `@khora/kernel/scopes`。Evidence: `packages/kernel/package.json`, `packages/kernel/vite.config.ts`, `packages/runtime/src/primitives/spawn.ts`, `packages/runtime/src/primitives/scoped.ts`, `docs/api.md`, `docs/design-constraints.md`。

### 3.3 delta：Build 主阻塞未变

Impact: API/桥接/结构治理继续推进，但端到端运行能力仍受 `ensureExecutor` 占位实现阻塞。Evidence: `packages/kernel/src/executor.ts`, `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`。

### 3.4 delta：Plan/Syscall 类型契约从“syscall 泛型参数”收敛到“返回见证”

Impact: `Syscall` 保持基础对象契约，返回类型在 syscall 条目处显式声明，`then` 续延通过 `SyscallReturn<S>` 推导；`runtime` 适配层与示例代码已按该契约对齐。Evidence: `packages/kernel/src/contracts/plan.ts`, `packages/kernel/src/contracts/syscall.ts`, `packages/kernel/src/syscalls/*.ts`, `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/adapter/plan-lift.ts`, `packages/runtime/src/contracts.ts`, `apps/example/src/scenarios.ts`。

## 4. 当前阶段执行切片（Build）

| Slice                                | Status      | Output                                                                                                        | Evidence                                                                                                                                                                                          |
| ------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 kernel 执行器实现                 | In Progress | 执行入口类型约束已稳定，执行器实现仍为占位。                                                                  | `packages/kernel/src/executor.ts`, `packages/kernel/src/internal/not-implemented.ts`                                                                                                              |
| B2 runtime 桥接主链                  | Completed   | `RuntimePlan <-> Plan` 双向桥接与推进协议接通，并已对齐 `PurePlan/ImpurePlan + Syscall return witness` 契约。 | `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/adapter/plan-lift.ts`, `packages/runtime/src/contracts.ts`, `packages/runtime/src/primitives-kit/lower-runtime-blueprints.ts` |
| B3 runtime 宿主入口接线              | In Progress | `run/createScope` 已接线到 runtime 收敛入口，运行闭环依赖 B1。                                                | `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`, `packages/runtime/src/operations-kit/runtime-launch.ts`, `packages/kernel/src/executor.ts`           |
| B4 scope spec 结构重排与入口命名收敛 | Completed   | `contracts/scopes/scopes-kit` 边界分工落地，公开入口收敛到 `@khora/kernel/scopes`。                           | `packages/kernel/src/contracts/scope.ts`, `packages/kernel/src/scopes/index.ts`, `packages/kernel/src/scopes-kit/factory.ts`, `packages/kernel/package.json`                                      |

## 5. 后续方向

Build 阶段继续按 `B1 -> B3 -> Prove` 推进：

1. `B1` 出口条件：`ensureExecutor()` 不再占位，具备可运行的 kernel 执行器实现。
2. `B3` 出口条件：`run/createScope` 覆盖成功、失败、中断三态的端到端运行。
3. Prove 入口条件：Build 主链闭环后补充 `terminate`、作用域状态转换与异常传播验证。
