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
- interpreter runtime 文件已按职责拆分为 `runtime-scope.ts` 与 `runtime-process.ts`；原先聚合命名的 `runtime.ts` 已退出该结构。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/runtime-process.ts`
- `RuntimeProcess` 已收口为 process 局部状态对象：构造时直接接收 `scopeRef`、`exitFuture`、`ritual` 与 `participation`，自身负责 continuation、blocking 与终态收敛。  
  证据：`packages/kernel/src/interpreter/runtime-process.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `RuntimeScope` 与 `RuntimeProcess` 已先按 ref 边界拆开：两者都不直接依赖对方实例；`Interpreter` 负责在 `scopeRef` / `processRef`、`RuntimeScope` / `RuntimeProcess` 之间进行编排。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/runtime-process.ts`
- `RuntimeProcess.resonate()` 现在会在 resonance 产出 `RestingWisp` 时直接把 process 收敛为 completed；`step` 在得知 process 已终态时只返回 `exited`，不再额外触发退出后处理。  
  证据：`packages/kernel/src/interpreter/runtime-process.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `branch` / `self` 的 echo 公开语义已统一收口为 `*Handle`，不再使用 `*Descriptor` 命名。  
  证据：`packages/kernel/src/sigils/branch.ts`、`packages/kernel/src/sigils/self.ts`、`packages/kernel/src/primitives/self.ts`
- `RuntimeScope` 的 `parent` 构造契约已收紧为非空；根 scope 通过私有静态 sentinel 哨兵承接 `create(...)` 的特例，空值不再出现在正常实例构造面。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`docs/interpreter.md`
- `RuntimeScope.create(...)` / `branch(...)` 当前都通过 hook 接收 entry process 的 `ProcessRef`；该 hook 先拿到 scope 签发的 entry exit future，再由 `Interpreter` 构造并注册 entry process。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `RuntimeScope.spawn(...)` 当前也已收口为 hook 形态：scope 先签发 spawned process 的 exit future，再由 hook 返回 `ProcessRef`；`Interpreter` 在 hook 内完成 `RuntimeProcess` 构造与 `registerProcess(...)`。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- future 当前实现仍以 `RuntimeScope` 内部记录为准：`FutureKey` / `FutureSettleKey` 只是 token，`RuntimeGraph` 只保留快速定位与等待队列索引，不再承担 future 创建语义。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/runtime-graph.ts`
- `observeRunnable(...)` 目前仍明确占位为 `notImplemented(...)`；runnable 事件应由 `Interpreter` 还是其他 runtime 协调层触发，尚未定案。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`
- `wait` / `receive` 的阻塞路径已按“进入等待态 + `primeContinuation(...)`”两步拆开；`receive` 同时显式区分了 `tryReceive` 与阻塞式 `receive`。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-process.ts`
- mailbox runtime 已落位到 `RuntimeScope`：每个 scope 现直接维护按 `MessageKey` 分组的 mailbox，`send` / `receive` 的等待与恢复由 `RuntimeScope` 组织，`Interpreter` 只负责选定 sender scope 的上下文并发出状态变更意图。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `halt` 的主调用链已先行收口：`Interpreter` 现在负责把 `halt` 转写为对 `RuntimeScope.halt(...)` 的调用，并把 `onClosing(scope, processes, failure)` 包装成 closing worker factory 交给 `RuntimeScope`；`RuntimeScope` 侧的 closing 协议签名已经固定，但具体关闭流程仍是占位实现。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`
- `Interpreter.step(...)` 已先按 `RuntimeProcess.status` 分派，再在 `runnable` 分支内细分 interpret / resonate；其公开返回值也已从 `ProcessStage` 收口为 `ProcessStep`，并以 `disposition` 表达本次步进结果而不是复写 runtime `status`。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/process-step.ts`、`docs/interpreter.md`

## 4. 本轮新增文档锚点

- `api.md` 现在只承担使用者 API 文档职责，围绕入口、编排模型和原语使用方式组织。  
  证据：`docs/api.md`
- `semantics.md` 把“边界”收口为 `Scope` 的辅助说明词，并以 `Scope` 作为精确定义用语。  
  证据：`docs/semantics.md`
- `host.md` 只描述 host 如何承接 `Scope`、并发与结果收敛，不再代替 API 文档解释使用心智。  
  证据：`docs/host.md`
- `interpreter.md` 已补充 `#interpretWisp` 的三段式 case 风格锚点，用于约束实现阅读结构而不是补充 kernel 语义。  
  证据：`docs/interpreter.md`
- `README.md` 与 `interpreter.md` 已同步把 interpreter runtime 的边界表述收口到 `RuntimeScope` / `RuntimeProcess`。  
  证据：`docs/README.md`、`docs/interpreter.md`
- `interpreter.md` 现进一步记录阻塞路径上的 `setContinuation / primeContinuation` 区分，以及 `tryReceive / receive` 的双层命名约束。  
  证据：`docs/interpreter.md`
- `interpreter.md` 现进一步记录 `RuntimeScope` 对 entry ritual / mailbox 的职责，以及 `send` 应从 sender scope 上下文发起的交互约束。  
  证据：`docs/interpreter.md`
- `interpreter.md` 现进一步记录 `resonate` 路径上的退出收敛边界：`RuntimeProcess` 负责 process 局部终态收敛，`RuntimeScope` 只负责 completed 之后的结构性后处理。  
  证据：`docs/interpreter.md`
- `interpreter.md` 现进一步记录 `onClosing(scope, processes, failure)` 的参数语义，以及 `halt` 目前按“Interpreter 组织调用，RuntimeScope 承载 closing 协议签名”的方向收口。  
  证据：`docs/interpreter.md`
- `interpreter.md` 现进一步记录 closing 路径上的 failure 来源：直接触发 closing 的 scope 继承 origin failure，被迫取消的子树承接默认 termination failure；后者的具体 failure 形状仍待设计。  
  证据：`docs/interpreter.md`
- `execution.md` 现额外记录了本轮 `Interpreter` review 只完成部分收口；future 处理、scope close 处理与 runtime graph 命名仍处在待决状态。  
  证据：`docs/execution.md`

## 5. 下一步

1. 继续完成 `Interpreter` review；当前只完成了 `RuntimeScope` / `RuntimeProcess` 构造边界、entry/spawn hook 形态与 `step` 终态行为的部分收口。
2. 重做 future 处理：当前实现仍把 future record 暴露给 `RuntimeGraph` 做索引与等待队列管理，但后续很可能要改成“由 `RuntimeGraph` 快速定位 owner scope，再由 `RuntimeScope` 完成 future 处理”。
3. 重新评估 `RuntimeGraph` 的命名；当前名字可能过重，后续很可能改为 `RuntimeRegistry` 一类更贴近“快速寻址与登记”的命名。
4. 继续补完 `halt` / closing 协议；当前 `RuntimeScope.halt(...)`、closing subtree 扩散与 closing worker 形成仍是占位实现。
5. 在恢复委派路径上继续收口 mailbox、future 与 `Scope` 的职责分工。
6. 评估 `all` / `race` 是否直接以 `spawn` + future 组合表达。

## 6. 验证基线

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
yarn workspace @shajara/host typecheck
yarn workspace @shajara/host lint
```

当前与本轮文档调整直接相关的验证状态：

- 已执行并通过：`@shajara/kernel typecheck`、`@shajara/kernel lint`。
