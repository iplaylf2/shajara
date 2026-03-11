# 实现状态

当前阶段：**Build — Make it work**。

---

## 1. 当前目标与阻塞

当前主目标是先把 primitives 的失败传播契约收敛成稳定文档基线，再按该基线重构代码；当前设计基线是“默认失败上传，由 `scoped` 承载显式隔离边界，由 `guard` 承载 `resumable` 的恢复委派边界”。

- 当前主阻塞是设计基线与代码现状不一致：文档基线已收口到 `spawn` standard-only、`scoped` 阻塞收敛、`guard` future-returning 且承载恢复委派，当前实现仍把这些语义折叠在 `spawn` options 与若干 supervisor-based primitive 中。  
  证据：`docs/semantics.md`、`docs/api.md`、`packages/kernel/src/primitives/all.ts`、`packages/kernel/src/primitives/race.ts`、`packages/kernel/src/primitives/resource.ts`、`packages/kernel/src/primitives/resumable.ts`、`packages/kernel/src/primitives/spawn.ts`
- 协作文档边界已明确：阶段性状态放在执行文档，不放在 `docs/README.md`。  
  证据：`docs/README.md`

## 2. 当前已落地状态（Build 相关）

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
- 代码当前仍未导出 `scoped`，并且 `spawn` 仍暴露 supervisor / recovery 两类 mode。  
  证据：`packages/kernel/src/primitives/index.ts`、`packages/kernel/src/primitives/spawn.ts`
- 代码当前仍保留 `join` primitive，文档基线已改为统一通过 `wait(scopeRef.exitFuture)` 等待 scope 收敛。  
  证据：`packages/kernel/src/primitives/join.ts`、`packages/host/src/primitives/join.ts`、`docs/api.md`

## 3. 相对设计基线的新增增量

- 设计基线原本允许部分 primitive 在调用方 process 内隐式等待；当前增量是把这类“创建新 scope 的等待协议”外显成 `FutureKey`。  
  影响：启动结构与结果等待解耦，调用方需要显式决定是否以及何时 `wait`。  
  证据：`docs/semantics.md`、`packages/kernel/src/primitives/all.ts`、`packages/kernel/src/primitives/race.ts`、`packages/kernel/src/primitives/resource.ts`
- 设计基线现已明确：`spawn` 只创建 standard scope；`scoped` 创建 supervisor boundary 并阻塞收敛；`guard` 为 `resumable` 提供恢复委派点并返回该边界的 future。  
  影响：现有 `spawn(..., { mode: "supervisor" | "recovery" })` 需要拆回独立 primitive，`scoped` 需要从 future-returning 形态回到 blocking 形态，recovery mode 的返回面则迁到 `guard`。  
  证据：`docs/semantics.md`、`docs/api.md`
- 设计基线现已移除 `join`：scope 等待统一经由 `wait(scopeRef.exitFuture)` 表达。  
  影响：后续代码清理可直接删除 kernel/host 的 `join` 包装层，并把示例与调用点收口到 `wait`。  
  证据：`docs/semantics.md`、`docs/api.md`
- 部分并发构造 primitive 已不再承诺“以子 scope 作为正常收敛边界”，因此实现面可以从 scope 驱动收口到更轻的 process/future 组合。  
  影响：`all` / `race` 一类组合子后续可优先评估以 `fork`、局部 future 与显式 relay 直接表达编排，而不是继续保留 supervisor scope 外壳；`resource` 也可据此重新审视 body 与提供值路径的最小实现骨架。  
  证据：`docs/semantics.md`、`packages/kernel/src/primitives/all.ts`、`packages/kernel/src/primitives/race.ts`、`packages/kernel/src/primitives/resource.ts`
- `resumable` recovery request 的消息载荷已从单纯 `failure` 扩展为 `{ failure, recoverySettleKey }`。  
  影响：消息仍只负责委派，结果回传已从 mailbox 语义切换为 future 收敛语义，契约更贴近 `FutureKey / FutureSettleKey` 的设计基线。  
  证据：`packages/kernel/src/primitives-kit/resumable.ts`

## 4. 下一步（Build 聚焦）

1. 以文档基线为准，恢复 `scoped` 并把它收口为 blocking supervisor boundary。
2. 引入 `guard(entry, recover)`，承接当前 `spawn` recovery mode 中的恢复委派协议与 future 返回面。
3. 让 `spawn` 回到 standard-only，并让 `all` / `race` / `resource` 回到默认失败上传语义。
4. 移除 kernel/host 的 `join` 包装层，并把 scope 等待调用点统一收口到 `wait(scopeRef.exitFuture)`。
5. 对不再承诺 scope 边界收敛的并发 primitive，优先评估以 `fork`、future 与最小 relay 直接表达实现，去掉为收敛而保留的 supervisor 外壳。
6. 完成后再跑通 `@shajara/kernel` 的 typecheck / lint，并向上游包同步 API 变化。

## 5. 验证基线

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```

当前与本次文档调整直接相关的验证状态：

- 未执行。当前变更仅更新设计文档与执行快照，尚未进入代码重构阶段。
