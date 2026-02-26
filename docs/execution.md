# khora Execution Doc

## 1. 当前快照

Current Phase 为 **Build — Make it work**。当前主阻塞仍是 `kernel` 执行器实现未落地（`ensureExecutor` 仍为占位实现）；原语失败通道已完成一轮“kernel 显式建模 + runtime 边界收敛”的签名与适配重构，当前进入实现补全前的接口稳定化阶段。

## 2. 当前现实与证据（Build）

1. 执行入口结果词已统一为 `success | failure | terminated`，runtime 收敛链同步到 `RuntimeScopeFailedError / RuntimeScopeTerminatedError`。Evidence: `packages/kernel/src/executor.ts`, `packages/runtime/src/operations-kit/runtime-launch.ts`, `packages/runtime/src/errors/runtime-scope-terminated.ts`。
2. `Scope` 过程态名称已统一为 `Closing`，`PollScope` 枚举与语义文档一致，不再使用 `Terminating`。Evidence: `packages/kernel/src/syscalls/poll-scope.ts`, `docs/semantics.md`。
3. `AwaitScope` 已升级为可观察终态通道（`completed | failed | terminated`），不再暴露 `pruned_to_limbo` 分支。Evidence: `packages/kernel/src/syscalls/await-scope.ts`, `docs/semantics.md`。
4. kernel “收敛型 primitive” 的失败通道已统一为带内 `Either<unknown, T>`：`all/join/race/scoped/resource/resumable` 均采用该返回形状，替代 `all` 旧的 `halt(fault)` 路径；其中 `all` 已改为通过 `awaitScope` 观察结果并在 kit 中显式收敛为 `Either`。Evidence: `packages/kernel/src/primitives/all.ts`, `packages/kernel/src/primitives-kit/await-scope-converged.ts`, `packages/kernel/src/primitives/join.ts`, `packages/kernel/src/primitives/race.ts`, `packages/kernel/src/primitives/scoped.ts`, `packages/kernel/src/primitives/resource.ts`, `packages/kernel/src/primitives/resumable.ts`。
5. runtime 对应 primitive 已统一通过解包器收敛 kernel `Either`，并将 `Left` 映射为 `RuntimeScopeFailedError`，维持用户侧“成功返回/失败抛错”模型。Evidence: `packages/runtime/src/primitives-kit/unwrap-either.ts`, `packages/runtime/src/primitives/all.ts`, `packages/runtime/src/primitives/join.ts`, `packages/runtime/src/primitives/race.ts`, `packages/runtime/src/primitives/scoped.ts`, `packages/runtime/src/primitives/resource.ts`, `packages/runtime/src/primitives/resumable.ts`。
6. `kernel` 执行器实现仍未落地：`ensureExecutor()` 当前返回占位实现，端到端运行闭环尚未建立。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/internal/not-implemented.ts`, `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`。
7. 代码检查已通过当前改动范围：`@khora/kernel` 与 `@khora/runtime` 的 typecheck 均通过，仓库 lint 通过。Evidence: `yarn workspace @khora/kernel typecheck`, `yarn workspace @khora/runtime typecheck`, `yarn lint`。

## 3. 相对设计基线增量（仅记录 delta）

### 3.1 delta：终态/过程态命名统一完成一轮收敛

Impact: `terminated` 作为终态词、`Closing` 作为过程态词，跨 kernel/runtime/docs 对齐，降低“过程态误读为终态”的歧义。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/syscalls/poll-scope.ts`, `docs/semantics.md`, `docs/runtime.md`, `docs/api.md`。

### 3.2 delta：`AwaitScope` 观测语义从“结构状态”收敛到“终态结果”

Impact: `AwaitScopeExit` 现在承载终态结果（`completed/failed/terminated`）；`InLimbo` 仍为结构事实，但不作为该 syscall 的直接返回分支。Evidence: `packages/kernel/src/syscalls/await-scope.ts`, `docs/semantics.md`。

### 3.3 delta：收敛型 primitive 失败通道完成一轮统一

Impact: `all/join/race/scoped/resource/resumable` 在 kernel 层统一为 `Either<unknown, T>`，runtime 层统一在 primitive 边界收敛 `Left -> RuntimeScopeFailedError`。该变更把“primitive 内策略性升级为 `halt`”替换为显式失败容器，降低失败语义分散；`all` 的 `Either` 构造已下沉到 kit 复用层。Evidence: `packages/kernel/src/primitives/all.ts`, `packages/kernel/src/primitives-kit/await-scope-converged.ts`, `packages/kernel/src/primitives/join.ts`, `packages/kernel/src/primitives/race.ts`, `packages/kernel/src/primitives/scoped.ts`, `packages/kernel/src/primitives/resource.ts`, `packages/kernel/src/primitives/resumable.ts`, `packages/runtime/src/primitives-kit/unwrap-either.ts`。

### 3.4 delta：Build 主阻塞未变

Impact: API/桥接/语义命名持续推进，但端到端运行能力仍受 `ensureExecutor` 占位实现阻塞。Evidence: `packages/kernel/src/executor.ts`, `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`。

### 3.5 delta：`spawn/awaitScope` 契约完成一轮解耦收敛

Impact: `spawn` syscall 返回契约不再随 `SupervisorScope` 变化；`awaitScope` 泛型由 `ScopeRef` 单源推导；`all` 通过 `awaitScope` 观察并显式构造 `Either`，同时新增 scope 终止失败构造与 `unreachable` 占位工具，减少局部重复与不安全兜底。Evidence: `packages/kernel/src/syscalls/spawn.ts`, `packages/kernel/src/syscalls/await-scope.ts`, `packages/kernel/src/primitives/all.ts`, `packages/kernel/src/primitives-kit/await-scope-converged.ts`, `packages/kernel/src/contracts/scope.ts`, `packages/kernel/src/utils/unreachable.ts`。

## 4. 当前阶段执行切片（Build）

| Slice                        | Status      | Output                                                                   | Evidence                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------- | ----------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 kernel 执行器实现         | In Progress | 执行入口契约稳定，执行器仍为占位实现。                                   | `packages/kernel/src/executor.ts`, `packages/kernel/src/internal/not-implemented.ts`                                                                                                                                                                                                                                                                                                        |
| B2 终态/过程态命名与契约收敛 | Completed   | `terminated`/`Closing` 命名统一，`AwaitScope` 结果语义统一。             | `packages/kernel/src/executor.ts`, `packages/kernel/src/syscalls/poll-scope.ts`, `packages/kernel/src/syscalls/await-scope.ts`, `docs/semantics.md`                                                                                                                                                                                                                                         |
| B3 runtime 收敛链同步        | Completed   | runtime 错误类型和 `LaunchResult` 三态对齐。                             | `packages/runtime/src/operations-kit/runtime-launch.ts`, `packages/runtime/src/errors/runtime-scope-terminated.ts`, `docs/runtime.md`                                                                                                                                                                                                                                                       |
| B4 原语失败通道收敛          | Completed   | 收敛型 primitive 在 kernel 侧统一 `Either`，runtime 侧统一边界解包收敛。 | `packages/kernel/src/primitives/all.ts`, `packages/kernel/src/primitives-kit/await-scope-converged.ts`, `packages/kernel/src/primitives/join.ts`, `packages/kernel/src/primitives/race.ts`, `packages/kernel/src/primitives/scoped.ts`, `packages/kernel/src/primitives/resource.ts`, `packages/kernel/src/primitives/resumable.ts`, `packages/runtime/src/primitives-kit/unwrap-either.ts` |
| B5 runtime 宿主入口闭环      | In Progress | `run/createScope` 类型接线稳定，运行闭环仍依赖 B1。                      | `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`, `packages/kernel/src/executor.ts`                                                                                                                                                                                                                                                              |

## 5. 后续方向

Build 阶段继续按 `B1 -> B5 -> Prove` 推进：

1. `B1`
   出口条件：`ensureExecutor()` 不再占位，具备可运行的 kernel 执行器实现。
2. `B5`
   出口条件：`run/createScope` 覆盖成功、失败、终止三态的端到端运行。
3. Prove 入口条件
   Build 主链闭环后补充 `terminate`、作用域状态转换、失败传播与结构性收敛验证。
