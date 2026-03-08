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
- 设计单源已同步 future：对象模型、sigil 协议与跨层约束已纳入文档。  
  证据：`docs/semantics.md`、`docs/design-constraints.md`、`docs/README.md`

## 3. 相对设计基线的新增增量

- kernel 新增 `FutureKey` 与 `FutureResolverKey`，把 future 的观察能力与收敛能力拆成两个 capability。  
  影响：future 的可观察面与可收敛面不再依赖约定区分，后续可以更稳地替换部分 `MessageKey` 的 result-slot 用法。  
  证据：`packages/kernel/src/contracts/future-key.ts`、`docs/semantics.md`
- future 采用“值域即 `Either<Failure, T>`”的单泛型约束，并在 `future()` 返回 tuple 时同时交付观察 key 与收敛 key。  
  影响：future 的收敛结果保持单一结果型，能力分化直接编码进返回形状。  
  证据：`packages/kernel/src/contracts/future-key.ts`、`packages/kernel/src/sigils/await-future.ts`、`packages/kernel/src/sigils/settle-future.ts`
- `api.md` 未新增 future 用户面。  
  影响：这次变更仍停留在 kernel 基础层与设计文档层，没有提前扩张到 host 用户 API。  
  证据：`docs/api.md`

## 4. 下一步（Build 聚焦）

1. 在执行器中加入 `future / await-future / settle-future / poll-future` 的解释路径。
2. 定实 owner scope 关闭时 pending future 的强制 `Left<Failure>` 收敛机制。
3. 评估 `race`、`resource` 等内部 result-slot 模式，选择首批从 `MessageKey` 迁移到 `FutureKey/FutureResolverKey` 的目标。

## 5. 验证基线

```sh
yarn build
yarn typecheck
yarn lint
```

当前与本次实现同步相关的验证已通过：

- `yarn workspace @shajara/kernel lint`
- `yarn workspace @shajara/kernel typecheck`
