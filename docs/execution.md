# 实现状态

当前阶段：**Build — Make it work**。

---

## 1. 主阻塞

kernel 执行器实现未落地——`ensureExecutor()` 仍返回占位实现，端到端运行闭环尚未建立。

## 2. 已完成

| 切片                       | 产出                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 终态/过程态命名统一        | `terminated` 为终态词、`Closing` 为过程态词，跨 kernel/runtime/docs 对齐。                                                       |
| `AwaitScope` 观察语义统一  | `AwaitScopeExit` 承载终态结果（`completed/failed/terminated`），`InLimbo` 不作为返回分支。                                       |
| 原语失败通道统一           | `all/join/race/scoped/resource/resumable` 在 kernel 层统一为 `Either<KhoraFailure, T>`，runtime 统一解包为 `RuntimeKhoraError`。 |
| runtime 收敛链同步         | `LaunchResult` 三态对齐，错误类型统一。                                                                                          |
| 可选/默认参数治理          | kernel 合约与核心 syscall/primitives 默认泛型已移除。                                                                            |
| `scoped` 失败 handler 收敛 | `onResumableBranchFailure` 消费 `RuntimeKhoraError`，不暴露 kernel `KhoraFailure`。                                              |
| Channel 消息队列           | `Channel<T>` 为 phantom-typed 令牌，`Send/Receive` 以 Channel 为匹配键，per-(scope, channel) FIFO 队列缓存消息。                 |
| `race` 实现                | 基于双 Channel 的调用者直接接收架构。                                                                                            |

## 3. 进行中

| 切片                       | 状态                                              |
| -------------------------- | ------------------------------------------------- |
| kernel 执行器实现（B1）    | 执行入口契约稳定，执行器仍为占位实现。            |
| runtime 宿主入口闭环（B5） | `run/createScope` 类型接线稳定，运行闭环依赖 B1。 |

## 4. 后续方向

1. **B1**：`ensureExecutor()` 落地，具备可运行的 kernel 执行器。
2. **B5**：`run/createScope` 覆盖 success/failure/terminated 三态端到端运行。
3. **Prove**：Build 闭环后补充 terminate、作用域状态转换、失败传播与结构性收敛验证。

## 5. 验证

```sh
yarn typecheck   # @khora/kernel + @khora/runtime 类型检查
yarn build        # 全量构建
yarn lint         # 代码风格
```

`@khora/example` 作为 runtime 对外契约回归样例。
