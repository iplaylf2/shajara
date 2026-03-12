# 实现状态

当前阶段：**Build — Make it work**。

---

## 1. 当前目标与阻塞

当前主目标是先把 primitives 的失败传播契约收敛成稳定文档基线，再按该基线重构代码；当前设计基线是“默认失败上传，由 `scoped` 承载显式隔离边界，由 `guard` 承载 `resumable` 的恢复委派边界”。

- 协作文档边界已明确：阶段性状态放在执行文档，不放在 `docs/README.md`。  
  证据：`docs/README.md`
- 当前主阻塞已从 `spawn/guard/scoped` 的 primitive 拆分转移到后续清理项：`all` / `race` 仍保留 supervisor-driven 实现外壳。  
  证据：`packages/kernel/src/primitives/all.ts`、`packages/kernel/src/primitives/race.ts`

## 2. 当前已落地状态（Build 相关）

- `all` 已改为返回 `FutureKey<T>`，其内部结算结果固定为 `Either<Failure, T>`，并直接复用 supervisor process 的 `exitFuture`。  
  证据：`packages/kernel/src/primitives/all.ts`
- `race` 已改为返回由 arena 内部 settle 的 `FutureKey<T>`，其内部结算结果固定为 `Either<Failure, T>`，外层不再隐式 await。  
  证据：`packages/kernel/src/primitives/race.ts`
- `resumable` 已改为返回 `FutureKey<T>`，其内部结算结果固定为 `Either<Failure, T>`；当前实现把 entry process 的结果归约与 traced scope 的后续失败传播拆成两条路径。  
  证据：`packages/kernel/src/primitives/resumable.ts`
- `resource` 已从 kernel / host 的公开 primitive 面移除。当前判断是：它的主要语义与资源 cleanup 紧耦合，属于 host 资源协议而不是 kernel 并发代数；本轮仅移除，不引入替代 operation，也不下沉为 host bridge operation。  
  证据：`docs/api.md`、`docs/semantics.md`、`packages/kernel/src/primitives/index.ts`、`packages/host/src/primitives/index.ts`
- `resumable` recovery 路径已从 “mailbox 回传结果” 切换为 “传递 `FutureSettleKey` 后直接 settle future”；当前 future 对应的是 entry process 的结果，而不是整个 supervisor boundary 的最终收敛。  
  影响：去掉了 `delegateWorker` 那层额外 scope；恢复结果现在走单次收敛语义而不是额外 mailbox，同时避免了 “entry 已成功但又被后续 traced failure 改写为 recovery 值” 的冲突。  
  证据：`packages/kernel/src/primitives/resumable.ts`、`packages/kernel/src/primitives/guard.ts`、`packages/kernel/src/primitives-kit/resumable.ts`
- `spawn` 已纯化为 standard-only primitive；supervisor boundary 与恢复委派已分别拆到 `scoped` 与 `guard`，并同步导出到 kernel / host 公共 primitive 面。  
  证据：`packages/kernel/src/primitives/spawn.ts`、`packages/kernel/src/primitives/scoped.ts`、`packages/kernel/src/primitives/guard.ts`、`packages/kernel/src/primitives/index.ts`、`packages/host/src/primitives/spawn.ts`、`packages/host/src/primitives/scoped.ts`、`packages/host/src/primitives/guard.ts`、`packages/host/src/primitives/index.ts`
- `join` 包装层已从 kernel / host 删除；scope 等待统一经由 `wait(scopeRef.exitFuture)` 表达，示例调用点也已同步收口。  
  证据：`packages/kernel/src/primitives/index.ts`、`packages/host/src/primitives/index.ts`、`apps/example/src/scenarios.ts`、`docs/api.md`

## 3. 相对设计基线的新增增量

- 设计基线原本允许部分 primitive 在调用方 process 内隐式等待；当前增量是把这类“创建新 scope 的等待协议”外显成 `FutureKey`。  
  影响：启动结构与结果等待解耦，调用方需要显式决定是否以及何时 `wait`。  
  证据：`docs/semantics.md`、`packages/kernel/src/primitives/all.ts`、`packages/kernel/src/primitives/race.ts`
- 设计基线现已明确：`spawn` 只创建 standard scope；`scoped` 创建 supervisor boundary 并阻塞收敛；`guard` 为 `resumable` 提供恢复委派点并返回该边界的 future。  
  影响：原先折叠在 `spawn(..., { mode: ... })` 的 supervisor / recovery 语义已拆回独立 primitive；后续调用点与文档应直接使用 `spawn` / `scoped` / `guard` 的分离模型。  
  证据：`docs/semantics.md`、`docs/api.md`
- `resumable` 当前语义已收口为“entry failure 可恢复，entry success 之后的晚到 traced failure 只传播不恢复”。  
  影响：`resumable` 继续返回 future，但其 future 只代表 entry result；boundary 级失败传播由独立的 propagation path 处理。  
  证据：`packages/kernel/src/primitives/resumable.ts`
- 设计基线现已移除 `join`：scope 等待统一经由 `wait(scopeRef.exitFuture)` 表达。  
  影响：调用面已收口到单一等待模型，后续不再需要额外的 `join` 包装。  
  证据：`docs/semantics.md`、`docs/api.md`、`packages/kernel/src/primitives/index.ts`、`packages/host/src/primitives/index.ts`
- 部分并发构造 primitive 已不再承诺“以子 scope 作为正常收敛边界”，因此实现面可以从 scope 驱动收口到更轻的 process/future 组合。  
  影响：`all` / `race` 一类组合子后续可优先评估以 `fork`、局部 future 与显式 relay 直接表达编排，而不是继续保留 supervisor scope 外壳。  
  证据：`docs/semantics.md`、`packages/kernel/src/primitives/all.ts`、`packages/kernel/src/primitives/race.ts`
- `resumable` recovery request 的消息载荷已从单纯 `failure` 扩展为 `{ failure, recoverySettleKey }`。  
  影响：消息仍只负责委派，结果回传已从 mailbox 语义切换为 future 收敛语义，契约更贴近 `FutureKey / FutureSettleKey` 的设计基线。  
  证据：`packages/kernel/src/primitives-kit/resumable.ts`

## 4. 下一步（Build 聚焦）

1. 以文档基线为准，恢复 `scoped` 并把它收口为 blocking supervisor boundary。
2. 引入 `guard(entry, recover)`，承接当前 `spawn` recovery mode 中的恢复委派协议与 future 返回面。
3. 让 `spawn` 回到 standard-only，并让 `all` / `race` 回到默认失败上传语义。
4. 基于当前 `resumable` 的 entry-result / late-failure 分离语义，继续评估 `guard` 与 `spawn` recovery mode 的收口方案。
5. 完成后再跑通 `@shajara/kernel` 的 typecheck / lint，并向上游包同步 API 变化。

当前状态更新：

1. `scoped` 已恢复并收口为 blocking supervisor boundary。  
   证据：`packages/kernel/src/primitives/scoped.ts`、`packages/host/src/primitives/scoped.ts`
2. `guard(entry, recover)` 已落地，并与 `resumable` 配对形成恢复边界；其返回面已收口到 entry-result future。  
   证据：`packages/kernel/src/primitives/guard.ts`、`packages/host/src/primitives/guard.ts`
3. `spawn` 已回到 standard-only，并完成 kernel / host API 同步。  
   证据：`packages/kernel/src/primitives/spawn.ts`、`packages/host/src/primitives/spawn.ts`
4. `join` 包装层已删除，scope 等待调用点已统一收口到 `wait(scopeRef.exitFuture)`。  
   证据：`packages/kernel/src/primitives/index.ts`、`packages/host/src/primitives/index.ts`、`apps/example/src/scenarios.ts`
5. 下一步聚焦在继续评估 `all` / `race` 的实现收口。  
   证据：`packages/kernel/src/primitives/all.ts`、`packages/kernel/src/primitives/race.ts`

## 5. 验证基线

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
yarn workspace @shajara/host typecheck
yarn workspace @shajara/host lint
```

当前与本次文档调整直接相关的验证状态：

- 已执行并通过：`@shajara/kernel` 与 `@shajara/host` 的 `typecheck`、`lint`。
