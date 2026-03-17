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
- `Interpreter` 已把 process ready 信号公开为 `onProcessReady(listener)`，不再以 `onReady` 保护钩子承担调度接缝。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`
- `RuntimeProcess` 已收口为显式持有状态迁移的实例；`Interpreter` 在 resonance / future unblock / handle 产出路径上不再直接改写 process 内部细节。  
  证据：`packages/kernel/src/interpreter/runtime.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `RuntimeProcess.resonate()` 现在会在 resonance 产出 `RestingWisp` 时直接把 process 收敛为 exited；`Interpreter` 不再显式提醒 `ScopeFrame` 完成 process，`ScopeFrame` 只承接 exited 之后的结构性后处理。  
  证据：`packages/kernel/src/interpreter/runtime.ts`、`packages/kernel/src/interpreter/scope-frame.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `RuntimeProcess` 只保留 `scopeRef`，不再直接持有 `RuntimeScope`；scope runtime 实体解析统一经由 `ScopeFrame`。  
  证据：`packages/kernel/src/interpreter/runtime.ts`、`packages/kernel/src/interpreter/scope-frame.ts`
- `branch` / `self` 的 echo 公开语义已统一收口为 `*Handle`，不再使用 `*Descriptor` 命名。  
  证据：`packages/kernel/src/sigils/branch.ts`、`packages/kernel/src/sigils/self.ts`、`packages/kernel/src/primitives/self.ts`
- `ScopeFrame` 已直接暴露 branch scope 的 `entryProcess`，`Interpreter` 不再通过全局 process 表回查 branch 入口 process。  
  证据：`packages/kernel/src/interpreter/scope-frame.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `ScopeFrame.create(...)` / `branch(...)` 现直接接收 `entry ritual` 并在内部生成 entry process；原先由 `Interpreter` 提供的 entry-process 创建 hook 已删除。  
  证据：`packages/kernel/src/interpreter/scope-frame.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- 普通 future 已按创建时的当前 Scope 归属登记，不再默认挂到 root；`ScopeFrame` 现保有 owner scope 上的 future 集合。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/scope-frame.ts`、`packages/kernel/src/interpreter/runtime.ts`
- process ready 通知的注册与分发已收回 `ScopeFrame`；`Interpreter.onProcessReady(...)` 现在只是对根 frame 的公开代理。  
  证据：`packages/kernel/src/interpreter/scope-frame.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `wait` / `receive` 的阻塞路径已按“进入等待态 + `primeContinuation(...)`”两步拆开；`receive` 同时显式区分了 `tryReceive` 与阻塞式 `receive`。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime.ts`
- mailbox runtime 已落位到 `ScopeFrame` / `RuntimeScope`：每个 scope 现直接维护按 `MessageKey` 分组的 mailbox，`send` / `receive` 的等待与恢复由 `ScopeFrame` 组织，`Interpreter` 只负责选定 sender scope 的上下文并发出状态变更意图。  
  证据：`packages/kernel/src/interpreter/scope-frame.ts`、`packages/kernel/src/interpreter/runtime.ts`、`packages/kernel/src/interpreter/interpreter.ts`

## 4. 本轮新增文档锚点

- `api.md` 现在只承担使用者 API 文档职责，围绕入口、编排模型和原语使用方式组织。  
  证据：`docs/api.md`
- `semantics.md` 把“边界”收口为 `Scope` 的辅助说明词，并以 `Scope` 作为精确定义用语。  
  证据：`docs/semantics.md`
- `host.md` 只描述 host 如何承接 `Scope`、并发与结果收敛，不再代替 API 文档解释使用心智。  
  证据：`docs/host.md`
- `interpreter.md` 已补充 `#interpretWisp` 的三段式 case 风格锚点，用于约束实现阅读结构而不是补充 kernel 语义。  
  证据：`docs/interpreter.md`
- `interpreter.md` 现进一步记录阻塞路径上的 `setContinuation / primeContinuation` 区分，以及 `tryReceive / receive` 的双层命名约束。  
  证据：`docs/interpreter.md`
- `interpreter.md` 现进一步记录 `ScopeFrame` 对 entry ritual / mailbox 的职责，以及 `send` 应从 sender scope 上下文发起的交互约束。  
  证据：`docs/interpreter.md`
- `interpreter.md` 现进一步记录 `resonate` 路径上的退出收敛边界：`RuntimeProcess` 负责 process 局部终态收敛，`ScopeFrame` 只负责 exited 后的结构性后处理。  
  证据：`docs/interpreter.md`

## 5. 下一步

1. 评估 `all` / `race` 是否直接以 `spawn` + future 组合表达。
2. 在恢复委派路径上继续收口 mailbox、future 与 `Scope` 的职责分工。
3. 基于 `Interpreter.onProcessReady(...)` 明确最小 `perform` / ready-queue 驱动闭环的落点。

## 6. 验证基线

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
yarn workspace @shajara/host typecheck
yarn workspace @shajara/host lint
```

当前与本轮文档调整直接相关的验证状态：

- 已执行并通过：`@shajara/kernel typecheck`、`@shajara/kernel lint`。
