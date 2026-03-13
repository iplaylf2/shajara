# 实现状态

当前阶段：**Build — Make it work**。

---

## 1. 当前目标

当前工作以文档基线收口为先。现行基线已经明确：

- `fork` 是公开并发原语，返回分支结果的 `Future`
- `scoped`、`guard`、`resumable` 负责引入边界
- future 与上下文值都归属当前边界

证据：`docs/api.md`、`docs/semantics.md`

## 2. 当前实现与基线的差异

- 代码仍保留 `spawn` 作为 public primitive。  
  证据：`packages/kernel/src/primitives/spawn.ts`、`packages/host/src/primitives/spawn.ts`
- `all` / `race` 仍带有 supervisor-driven 实现外壳。  
  证据：`packages/kernel/src/primitives/all.ts`、`packages/kernel/src/primitives/race.ts`
- mailbox 语义仍存在于实现层，并继续承担部分恢复委派协议。  
  证据：`packages/kernel/src/primitives-kit/resumable.ts`

## 3. 当前已落地状态

- `all` 返回 `FutureKey<T>`。  
  证据：`packages/kernel/src/primitives/all.ts`
- `race` 返回 `FutureKey<T>`。  
  证据：`packages/kernel/src/primitives/race.ts`
- `resumable` 返回 `FutureKey<T>`，并把 entry result 与 traced scope 的后续失败传播拆开处理。  
  证据：`packages/kernel/src/primitives/resumable.ts`
- `guard(entry, recover)` 已落地，返回 guarded subtree 入口 scope 的 `FutureKey<void>`。  
  证据：`packages/kernel/src/primitives/guard.ts`、`packages/host/src/primitives/guard.ts`
- `scoped` 已落地为 blocking supervisor boundary。  
  证据：`packages/kernel/src/primitives/scoped.ts`、`packages/host/src/primitives/scoped.ts`
- `join` 包装层已删除，scope 等待统一经由 `wait(scopeRef.exitFuture)` 表达。  
  证据：`packages/kernel/src/primitives/index.ts`、`packages/host/src/primitives/index.ts`、`apps/example/src/scenarios.ts`

## 4. 本轮新增文档锚点

- `api.md` 现在只承担使用者 API 文档职责，围绕入口、编排模型和原语使用方式组织。  
  证据：`docs/api.md`
- `semantics.md` 把边界与 Scope 的关系收口为单一定义：边界就是某段计算对应的 Scope。  
  证据：`docs/semantics.md`
- `host.md` 只描述 host 如何承接边界、并发与结果收敛，不再代替 API 文档解释使用心智。  
  证据：`docs/host.md`

## 5. 下一步

1. 让代码导出面与文档基线一致，去掉 `spawn` 的 public primitive 地位。
2. 评估 `all` / `race` 是否直接以 `fork` + future 组合表达。
3. 在恢复委派路径上继续收口 mailbox 与 future 的职责边界。

## 6. 验证基线

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
yarn workspace @shajara/host typecheck
yarn workspace @shajara/host lint
```

当前与本轮文档调整直接相关的验证状态：

- 已执行并通过：`@shajara/kernel`、`@shajara/host` 与仓库全量的 `typecheck`。
