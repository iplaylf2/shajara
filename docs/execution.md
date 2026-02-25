# khora Execution Doc

## 1. 当前快照

Current Phase 为 **Build — Make it work**。当前主阻塞仍是 `kernel` 执行器实现未落地（`ensureExecutor` 仍为占位实现）；同时已进入一轮“原语失败通道收敛”重构准备，目标是为下一位 agent 提供明确重构入口与验收边界。

## 2. 当前现实与证据（Build）

1. 执行入口结果词已统一为 `success | failure | terminated`，runtime 收敛链同步到 `RuntimeScopeFailedError / RuntimeScopeTerminatedError`。Evidence: `packages/kernel/src/executor.ts`, `packages/runtime/src/operations-kit/runtime-launch.ts`, `packages/runtime/src/errors/runtime-scope-terminated.ts`。
2. `Scope` 过程态名称已统一为 `Closing`，`PollScope` 枚举与语义文档一致，不再使用 `Terminating`。Evidence: `packages/kernel/src/syscalls/poll-scope.ts`, `docs/semantics.md`。
3. `AwaitScope` 已升级为可观察终态通道（`completed | failed | terminated`），不再暴露 `pruned_to_limbo` 分支。Evidence: `packages/kernel/src/syscalls/await-scope.ts`, `docs/semantics.md`。
4. `all` 原语已改为“协调 scope + 分支 scope”结构，并以 `AwaitScope` 做分支收敛；当前失败路径采用 `halt(fault)` 通知执行引擎。Evidence: `packages/kernel/src/primitives/all.ts`, `packages/kernel/src/syscalls/halt.ts`, `packages/kernel/src/primitives/halt.ts`。
5. runtime 桥接主链持续可用：`lowerPlan/liftPlan`、`all/race` blueprint lowering、宿主入口收敛类型检查均通过。Evidence: `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/adapter/plan-lift.ts`, `packages/runtime/src/primitives-kit/lower-runtime-blueprints.ts`, `packages/runtime/src/primitives/all.ts`, `packages/runtime/src/primitives/race.ts`。
6. `kernel` 执行器实现仍未落地：`ensureExecutor()` 当前返回占位实现，端到端运行闭环尚未建立。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/internal/not-implemented.ts`, `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`。

## 3. 相对设计基线增量（仅记录 delta）

### 3.1 delta：终态/过程态命名统一完成一轮收敛

Impact: `terminated` 作为终态词、`Closing` 作为过程态词，跨 kernel/runtime/docs 对齐，降低“过程态误读为终态”的歧义。Evidence: `packages/kernel/src/executor.ts`, `packages/kernel/src/syscalls/poll-scope.ts`, `docs/semantics.md`, `docs/runtime.md`, `docs/api.md`。

### 3.2 delta：`AwaitScope` 观测语义从“结构状态”收敛到“终态结果”

Impact: `AwaitScopeExit` 现在承载终态结果（`completed/failed/terminated`）；`InLimbo` 仍为结构事实，但不作为该 syscall 的直接返回分支。Evidence: `packages/kernel/src/syscalls/await-scope.ts`, `docs/semantics.md`。

### 3.3 delta：`all` 进入“失败通道重构前状态”

Impact: `all` 已具备结构化并发骨架（协调 scope），但失败路径仍是“将带内失败提升为 `halt(fault)`”；该点被固定为下一位 agent 的重构入口。Evidence: `packages/kernel/src/primitives/all.ts`, `packages/kernel/src/syscalls/halt.ts`。

### 3.4 delta：Build 主阻塞未变

Impact: API/桥接/语义命名持续推进，但端到端运行能力仍受 `ensureExecutor` 占位实现阻塞。Evidence: `packages/kernel/src/executor.ts`, `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`。

## 4. 当前阶段执行切片（Build）

| Slice                        | Status      | Output                                                                    | Evidence                                                                                                                                            |
| ---------------------------- | ----------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1 kernel 执行器实现         | In Progress | 执行入口契约稳定，执行器仍为占位实现。                                    | `packages/kernel/src/executor.ts`, `packages/kernel/src/internal/not-implemented.ts`                                                                |
| B2 终态/过程态命名与契约收敛 | Completed   | `terminated`/`Closing` 命名统一，`AwaitScope` 结果语义统一。              | `packages/kernel/src/executor.ts`, `packages/kernel/src/syscalls/poll-scope.ts`, `packages/kernel/src/syscalls/await-scope.ts`, `docs/semantics.md` |
| B3 runtime 收敛链同步        | Completed   | runtime 错误类型和 `LaunchResult` 三态对齐。                              | `packages/runtime/src/operations-kit/runtime-launch.ts`, `packages/runtime/src/errors/runtime-scope-terminated.ts`, `docs/runtime.md`               |
| B4 `all` 结构化并发重排      | In Progress | coordinator scope 模型已落地，失败通道策略仍待重构（下一位 agent 入口）。 | `packages/kernel/src/primitives/all.ts`, `packages/kernel/src/syscalls/halt.ts`                                                                     |
| B5 runtime 宿主入口闭环      | In Progress | `run/createScope` 类型接线稳定，运行闭环仍依赖 B1。                       | `packages/runtime/src/operations/run.ts`, `packages/runtime/src/operations/create-scope.ts`, `packages/kernel/src/executor.ts`                      |

## 5. 后续方向

Build 阶段继续按 `B4 -> B1 -> B5 -> Prove` 推进：

1. `B4`（下一位 agent 优先）
   出口条件：`all` 的失败语义从“primitive 内策略性转换（当前 `halt(fault)`）”收敛为统一失败通道模型；同类 primitive（至少 `race/join/scoped/resource`）使用同一规则。
2. `B1`
   出口条件：`ensureExecutor()` 不再占位，具备可运行的 kernel 执行器实现。
3. `B5`
   出口条件：`run/createScope` 覆盖成功、失败、终止三态的端到端运行。
4. Prove 入口条件
   Build 主链闭环后补充 `terminate`、作用域状态转换、失败传播与结构性收敛验证。
