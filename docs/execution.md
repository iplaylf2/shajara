# 实现状态

当前阶段：**Build — Make it work**。

---

## 1. 当前目标与阻塞

当前主目标是把 kernel 中“创建新 scope 的 primitive 返回 `FutureKey`”这条语义收敛成稳定机制，同时避免把阶段性状态混入产品文档。

- 主阻塞：`resumable` 还没有按这条新语义完成重构，目前已回退到可继续演进的干净基线。  
  证据：`packages/kernel/src/primitives/resumable.ts`
- 协作文档边界已明确：阶段性状态放在执行文档，不放在 `docs/README.md`。  
  证据：`docs/README.md`

## 2. 当前已落地状态（Build 相关）

- `scoped` 已不再作为 kernel 公开 primitive 导出。  
  证据：`packages/kernel/src/primitives/index.ts`
- `all` 已改为返回 `FutureKey<Either<Failure, T>>`，并直接复用 supervisor process 的 `exitFuture`。  
  证据：`packages/kernel/src/primitives/all.ts`
- `race` 已改为返回由 arena 内部 settle 的 `FutureKey<Either<Failure, T>>`，外层不再隐式 await。  
  证据：`packages/kernel/src/primitives/race.ts`
- `resource` 已改为返回由 supervisor / failure relay 收敛的 `FutureKey<Either<Failure, T>>`。  
  证据：`packages/kernel/src/primitives/resource.ts`
- `resumable` 已改为返回 `FutureKey<Either<Failure, T>>`，外层通过 `scopeRef.exitFuture` 接到 recovery 逻辑。  
  证据：`packages/kernel/src/primitives/resumable.ts`

## 3. 相对设计基线的新增增量

- 设计基线原本允许部分 primitive 在调用方 process 内隐式等待；当前增量是把这类“创建新 scope 的等待协议”外显成 `FutureKey`。  
  影响：启动结构与结果等待解耦，调用方需要显式决定是否以及何时 `awaitFuture`。  
  证据：`packages/kernel/src/primitives/all.ts`、`packages/kernel/src/primitives/race.ts`、`packages/kernel/src/primitives/resource.ts`
- `scoped` 被 `spawn(..., supervisorScopeSpec())` 这一更基础的 supervisor boundary 表达替代。  
  影响：kernel primitive 面减少一个专门入口，supervisor 语义收口到 `spawn`。  
  证据：`packages/kernel/src/primitives/index.ts`、`packages/kernel/src/primitives/all.ts`
- `resumable` 当前仍通过 `delegateWorker` + mailbox channel 回传 recovery 结果，而不是把 `FutureResolverKey` 传下去并由 recovery 路径直接 settle 对应 future。  
  影响：现状会多占一个额外 scope；后续若改成传递 future resolver，可以去掉这层 channel 回传与额外 scope。  
  证据：`packages/kernel/src/primitives/resumable.ts`

## 4. 下一步（Build 聚焦）

1. 把 `resumable` 的 `delegateWorker` 从 channel 回传改成直接 resolve future，去掉一层额外 process。
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
