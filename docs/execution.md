# 实现状态

当前阶段：**Build — Make it work**。

---

## 1. 当前目标与阻塞

当前主目标仍是打通 kernel 的可运行闭环，同时把新引入的 `future` 基础语义接入设计单源。

- 主阻塞：`ensureExecutor()` 仍为占位实现，sigil 解释路径尚未建立，future 目前停留在 contracts/sigils/primitives 形状层。  
  证据：`packages/kernel/src/executor.ts`

## 2. 当前已落地状态（Build 相关）

- kernel 已新增 `FutureKey` 与 `FutureResolverKey` 契约，结果域约束为 `Either<Failure, T>`。  
  证据：`packages/kernel/src/contracts/future-key.ts`
- kernel 已新增 `future / awaitFuture / settleFuture / pollFuture` 四个 sigil 声明。  
  证据：`packages/kernel/src/sigils/future.ts`、`packages/kernel/src/sigils/await-future.ts`、`packages/kernel/src/sigils/settle-future.ts`、`packages/kernel/src/sigils/poll-future.ts`
- kernel 已新增与同名 sigil 对齐的 primitive 包装层。  
  证据：`packages/kernel/src/primitives/future.ts`、`packages/kernel/src/primitives/await-future.ts`、`packages/kernel/src/primitives/settle-future.ts`、`packages/kernel/src/primitives/poll-future.ts`
- `ScopeRef` 与 `ProcessRef` 已新增 `exitFuture` 观察面，值域分别固定为 `Right<ScopeExit<T>>` 与 `Right<ProcessExit<T>>`。  
  证据：`packages/kernel/src/contracts/scope.ts`、`packages/kernel/src/contracts/process.ts`
- kernel 已移除公开的 `await-scope / await-process` sigil，内部等待路径改为通过 `awaitFuture(...exitFuture)` 观察生命周期终态。  
  证据：`packages/kernel/src/sigils/index.ts`、`packages/kernel/src/primitives-kit/await-scope-in-band.ts`、`packages/kernel/src/primitives-kit/await-process-in-band.ts`、`packages/kernel/src/primitives-kit/await-scope-converged.ts`
- 设计单源已同步 future：对象模型、sigil 协议与实现约束已纳入文档。  
  证据：`docs/semantics.md`、`docs/implementation-constraints.md`、`docs/README.md`

## 3. 相对设计基线的新增增量

- kernel 新增 `FutureKey` 与 `FutureResolverKey`，把 future 的观察能力与收敛能力拆成两个 capability。  
  影响：future 的可观察面与可收敛面不再依赖约定区分，后续可以更稳地替换部分 `MessageKey` 的 result-slot 用法。  
  证据：`packages/kernel/src/contracts/future-key.ts`、`docs/semantics.md`
- future 采用“值域即 `Either<Failure, T>`”的单泛型约束，并在 `future()` 返回 tuple 时同时交付观察 key 与收敛 key。  
  影响：future 的收敛结果保持单一结果型，能力分化直接编码进返回形状。  
  证据：`packages/kernel/src/contracts/future-key.ts`、`packages/kernel/src/sigils/await-future.ts`、`packages/kernel/src/sigils/settle-future.ts`
- `ScopeRef / ProcessRef` 开始显式承载生命周期观察面，且该观察面的值域固定为 `Right<Exit>`，而不是继续通过独立 `await-scope / await-process` sigil 暴露等待协议。  
  影响：Scope/Process 的终态观察收口到 future 协议，同时不再把对象终态观察误写成普通 `Either<Failure, T>` future。  
  证据：`packages/kernel/src/contracts/scope.ts`、`packages/kernel/src/contracts/process.ts`、`packages/kernel/src/sigils/index.ts`
- `api.md` 未新增 future 用户面。  
  影响：这次变更仍停留在 kernel 基础层与设计文档层，没有提前扩张到 host 用户 API。  
  证据：`docs/api.md`

## 4. 下一步（Build 聚焦）

1. 在执行器中加入 `future / await-future / settle-future / poll-future` 的解释路径。
2. 定实 `scopeRef.exitFuture` / `processRef.exitFuture` 的生产与收敛路径，并在 executor 中去掉对旧 `await-scope / await-process` 的解释假设。
3. 定实 owner scope 关闭时 pending future 的强制 `Left<Failure>` 收敛机制。
4. 评估 `race`、`resource` 等内部 result-slot 模式，选择首批从 `MessageKey` 迁移到 `FutureKey/FutureResolverKey` 的目标。

## 5. 验证基线

```sh
yarn build
yarn typecheck
yarn lint
```

当前与本次暂存变更直接相关的验证状态：

- `yarn workspace @shajara/kernel typecheck`：本轮尚未在当前暂存内容上重新确认。
- `yarn workspace @shajara/kernel lint`：本轮尚未在当前暂存内容上重新确认。
