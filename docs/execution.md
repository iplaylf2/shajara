# 实现状态

当前阶段：**Build — Make it work**。

---

## 1. 当前目标

当前工作以文档基线收口为先。现行基线已经明确：

- `spawn` 是公开并发原语，返回分支结果的 `Future`
- `enclose`、`guard`、`resumable` 负责引入新的 `Scope`
- future 与上下文值都归属当前 `Scope`

证据：`docs/api.md`、`docs/semantics.md`

## 2. 当前实现与基线的差异

- `all` / `race` 仍带有 supervisor-driven 实现外壳。  
  证据：`packages/kernel/src/primitives/all.ts`、`packages/kernel/src/primitives/race.ts`
- mailbox 语义仍存在于实现层，并继续承担部分恢复委派协议。  
  证据：`packages/kernel/src/primitives-kit/resumable.ts`
- `halt` 的解释仍未落实为完整的 scope 关闭、失败传播与后代级联终止流程。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`

## 3. 当前已落地状态

- `spawn` 已成为公开并发 primitive，kernel/host 都直接返回分支结果 future。  
  证据：`packages/kernel/src/primitives/spawn.ts`、`packages/host/src/primitives/spawn.ts`
- `branch` 是 kernel 内部 scope-creation sigil，不在 public primitive 导出面。  
  证据：`packages/kernel/src/primitives/index.ts`、`packages/host/src/primitives/index.ts`、`packages/kernel/src/sigils/branch.ts`
- `send` / `receive` 已退出 public primitive 导出面；mailbox 仅保留为 kernel 内部消息协议能力。  
  证据：`packages/kernel/src/primitives/index.ts`、`packages/host/src/primitives/index.ts`、`apps/example/src/scenarios.ts`
- `all` 返回 `FutureKey<T>`。  
  证据：`packages/kernel/src/primitives/all.ts`
- `race` 返回 `FutureKey<T>`。  
  证据：`packages/kernel/src/primitives/race.ts`
- `resumable` 返回 `FutureKey<T>`，并把 entry result 与 traced scope 的后续失败传播拆开处理。  
  证据：`packages/kernel/src/primitives/resumable.ts`
- `guard(entry, recover)` 已落地，返回 guarded subtree 入口 scope 的 `FutureKey<void>`。  
  证据：`packages/kernel/src/primitives/guard.ts`、`packages/host/src/primitives/guard.ts`
- `enclose` 已落地为 blocking supervisor boundary。  
  证据：`packages/kernel/src/primitives/enclose.ts`、`packages/host/src/primitives/enclose.ts`
- `join` 包装层已删除，scope 等待统一经由 `wait(scopeRef.exitFuture)` 表达。  
  证据：`packages/kernel/src/primitives/index.ts`、`packages/host/src/primitives/index.ts`、`apps/example/src/scenarios.ts`

## 4. 本轮新增文档锚点

- `api.md` 现在只承担使用者 API 文档职责，围绕入口、编排模型和原语使用方式组织。  
  证据：`docs/api.md`
- `semantics.md` 把“边界”收口为 `Scope` 的辅助说明词，并以 `Scope` 作为精确定义用语。  
  证据：`docs/semantics.md`
- `host.md` 只描述 host 如何承接 `Scope`、并发与结果收敛，不再代替 API 文档解释使用心智。  
  证据：`docs/host.md`

## 5. 下一步

1. 评估 `all` / `race` 是否直接以 `spawn` + future 组合表达。
2. 在恢复委派路径上继续收口 mailbox、future 与 `Scope` 的职责分工。

## 6. 验证基线

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
yarn workspace @shajara/host typecheck
yarn workspace @shajara/host lint
```

当前与本轮文档调整直接相关的验证状态：

- 已执行并通过：`@shajara/kernel build`、`@shajara/kernel lint`、`@shajara/host build`、`@shajara/host typecheck`、`@shajara/host lint`、`@shajara/example build`、`@shajara/example typecheck`。
