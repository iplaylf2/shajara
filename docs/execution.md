# 实现状态

当前阶段：**Build — Make it work**。

---

## 1. 当前目标与阻塞

当前主目标是把 kernel 中“创建新 scope 的 primitive 返回 `FutureKey`”这条语义收敛成稳定机制，同时避免把阶段性状态混入产品文档。

- 当前主阻塞已收窄：`resumable` 的 recovery 回传路径已经切到 future settle，但仍需补一轮整体验证，确认没有留下旧 mailbox 依赖。  
  证据：`packages/kernel/src/primitives/resumable.ts`、`packages/kernel/src/primitives/spawn.ts`
- 协作文档边界已明确：阶段性状态放在执行文档，不放在 `docs/README.md`。  
  证据：`docs/README.md`

## 2. 当前已落地状态（Build 相关）

- `scoped` 已不再作为 kernel 公开 primitive 导出。  
  证据：`packages/kernel/src/primitives/index.ts`
- `all` 已改为返回 `FutureKey<T>`，其内部结算结果固定为 `Either<Failure, T>`，并直接复用 supervisor process 的 `exitFuture`。  
  证据：`packages/kernel/src/primitives/all.ts`
- `race` 已改为返回由 arena 内部 settle 的 `FutureKey<T>`，其内部结算结果固定为 `Either<Failure, T>`，外层不再隐式 await。  
  证据：`packages/kernel/src/primitives/race.ts`
- `resource` 已改为返回由 supervisor `exitFuture` 经 `forkFuture` relay 收敛的 `FutureKey<T>`，其内部结算结果固定为 `Either<Failure, T>`。  
  证据：`packages/kernel/src/primitives/resource.ts`
- `resumable` 已改为返回 `FutureKey<T>`，其内部结算结果固定为 `Either<Failure, T>`，外层通过 `scopeRef.exitFuture` 接到 recovery 逻辑。  
  证据：`packages/kernel/src/primitives/resumable.ts`
- `resumable` recovery 路径已从 “mailbox 回传结果” 切换为 “传递 `FutureSettleKey` 后直接 settle future”，最终结果 future 现在直接由 `forkFuture(scopeRef.exitFuture, ...)` 派生。  
  影响：去掉了 `delegateWorker` 那层额外 scope；`resumable` 现在由单个 result future + `forkFuture` relay 表达最终收敛，恢复结果走单次收敛语义而不是额外 mailbox。  
  证据：`packages/kernel/src/primitives/resumable.ts`、`packages/kernel/src/primitives/spawn.ts`、`packages/kernel/src/primitives-kit/resumable.ts`

## 3. 相对设计基线的新增增量

- 设计基线原本允许部分 primitive 在调用方 process 内隐式等待；当前增量是把这类“创建新 scope 的等待协议”外显成 `FutureKey`。  
  影响：启动结构与结果等待解耦，调用方需要显式决定是否以及何时 `wait`。  
  证据：`packages/kernel/src/primitives/all.ts`、`packages/kernel/src/primitives/race.ts`、`packages/kernel/src/primitives/resource.ts`
- `scoped` 被 `spawn(..., supervisorScopeSpec())` 这一更基础的 supervisor boundary 表达替代。  
  影响：kernel primitive 面减少一个专门入口，supervisor 语义收口到 `spawn`。  
  证据：`packages/kernel/src/primitives/index.ts`、`packages/kernel/src/primitives/all.ts`
- `resumable` recovery request 的消息载荷已从单纯 `failure` 扩展为 `{ failure, recoverySettleKey }`。  
  影响：消息仍只负责委派，结果回传已从 mailbox 语义切换为 future 收敛语义，契约更贴近 `FutureKey / FutureSettleKey` 的设计基线。  
  证据：`packages/kernel/src/primitives-kit/resumable.ts`

## 4. 下一步（Build 聚焦）

1. 跑通 `@shajara/kernel` 的 typecheck / lint，确认 `resumable` 新契约没有遗漏类型窄化或未使用导入。
2. 复核 `resource` 是否还能进一步收窄到更接近旧版主干的改法。
3. 等 kernel 语义完全对齐后，再向上游包同步这些返回值变化。

## 5. 验证基线

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```

当前与本次暂存变更直接相关的验证状态：

- `yarn workspace @shajara/kernel typecheck`：已通过。
- `yarn workspace @shajara/kernel lint`：已通过。
