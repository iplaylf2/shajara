# 实现状态

当前阶段：**Build — Make it work**。

---

## 1. 主阻塞

kernel 执行器实现未落地——`ensureExecutor()` 仍返回占位实现，端到端运行闭环尚未建立。

## 2. 已完成

| 切片                        | 产出                                                                                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 终态/过程态命名统一         | `terminated` 为终态词、`Closing` 为过程态词，跨 kernel/runtime/docs 对齐。                                                                                                                                                                  |
| `AwaitScope` 观察语义统一   | `AwaitScopeExit` 承载终态结果（`completed/failed/terminated`），`InLimbo` 不作为返回分支。                                                                                                                                                  |
| 原语失败通道统一            | `all/join/race/scoped/resource/resumable` 在 kernel 层统一为 `Either<Failure, T>`，runtime 统一解包为 `KhoraError`。                                                                                                                        |
| runtime 收敛链同步          | `LaunchResult` 三态对齐，错误类型统一。                                                                                                                                                                                                     |
| 可选/默认参数治理           | kernel 合约与核心 syscall/primitives 默认泛型已移除。                                                                                                                                                                                       |
| `spawn` 恢复委派模式        | `spawn` 支持 `mode: "recovery"`，在子 Scope 内建立 `resumable` 委派恢复点并处理失败请求（见 `packages/kernel/src/primitives/spawn.ts`）。                                                                                                   |
| runtime `spawn` 适配收敛    | runtime `spawn` 提供独立 `SpawnOptions`，`recovery` handler 采用 runtime 语义并在边界转换为 kernel 失败通道（见 `packages/runtime/src/primitives/spawn.ts`）。                                                                              |
| Fork 参与策略契约           | `Fork` syscall 增加 `participation` 确定字段，构造期通过 `options` 默认化为 `tracked`（见 `packages/kernel/src/syscalls/fork.ts`）。                                                                                                        |
| 治理角色合并与 handler 契约 | `SchedulerScope`/`ReaperScope` 已合并为 `GovernorScope`；`GovernorScopeSpec` 通过 `capabilities.coverage = scheduler \| reaper \| full` 承载策略组合。具体签名单源见 `docs/semantics.md`，实现见 `packages/kernel/src/scopes/governor.ts`。 |
| Channel 消息队列            | `Channel<T>` 为 phantom-typed 令牌，`Send/Receive` 以 Channel 为匹配键，per-(scope, channel) FIFO 队列缓存消息。                                                                                                                            |
| `race` 实现                 | 基于双 Channel 的调用者直接接收架构。                                                                                                                                                                                                       |
| `send/receive` 原语升格     | `kernel/runtime` 同步暴露 `send/receive` primitive，`example` 增加场景覆盖。                                                                                                                                                                |
| `halt` 语义分层文档收敛     | 已明确 `halt` 的失败链路为“Process 失败 → 所属 Scope 失败 → 父 Scope 策略判定是否继续失败传播”，语义单源见 `docs/semantics.md` §1.2、§3.3、§5.3、§6.4。                                                                                     |

## 3. 进行中

| 切片                       | 状态                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| kernel 执行器实现（B1）    | 执行入口契约稳定，执行器仍为占位实现。                                                                                                                |
| runtime 宿主入口闭环（B5） | `run/createScope` 类型接线稳定，运行闭环依赖 B1。                                                                                                     |
| 治理 handler 执行接线      | `GovernorScope` 的 spec-level capabilities 形状已确定；executor 侧触发、校验与消费返回值的执行接线待实现。                                            |
| cleanup 语义归属           | 待决：仅在 **kernel primitive 不再编排 `terminate` 路径** 的前提下，才考虑废弃 `Plan.terminate`，并由 executor 与 runtime adapter 提供 cleanup 能力。 |

## 4. 后续方向

1. **B1**：`ensureExecutor()` 落地，具备可运行的 kernel 执行器。
2. **B5**：`run/createScope` 覆盖 success/failure/terminated 三态端到端运行。
3. **Cleanup 决策**：先确认前提（kernel primitive 是否继续编排 `terminate`）；仅此前提不成立时，才下沉 cleanup 到 executor/runtime adapter，并据此收敛 `Plan.terminate` 的去留。
4. **Prove**：Build 闭环后补充 terminate、作用域状态转换、失败传播与结构性收敛验证。

## 5. 验证

```sh
yarn typecheck   # @khora/kernel + @khora/runtime 类型检查
yarn build        # 全量构建
yarn lint         # 代码风格
```

`@khora/example` 作为 runtime 对外契约回归样例。
