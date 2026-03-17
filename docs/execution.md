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
- 当前实现仍把 `RuntimeScope` / `RuntimeProcess` 按 ref 边界拆得过开：`RuntimeScope` 尚未真正成为 process 的结构宿主，`Interpreter` 仍承担大量 `scopeRef` / `processRef` 到 runtime 实体的寻址与编排。这个形态已被视为过度解耦，不应继续作为长期基线。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/runtime-process.ts`
- `RuntimeProcess.resonate()` 现在会在 resonance 产出 `RestingWisp` 时直接把 process 收敛为 completed；`step` 在得知 process 已终态时只返回 `exited`，不再额外触发退出后处理。  
  证据：`packages/kernel/src/interpreter/runtime-process.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `branch` / `self` 的 echo 公开语义已统一收口为 `*Handle`，不再使用 `*Descriptor` 命名。  
  证据：`packages/kernel/src/sigils/branch.ts`、`packages/kernel/src/sigils/self.ts`、`packages/kernel/src/primitives/self.ts`
- `RuntimeScope` 的 `parent` 构造契约已收紧为非空；根 scope 通过私有静态 sentinel 哨兵承接 `create(...)` 的特例，空值不再出现在正常实例构造面。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`docs/interpreter.md`
- `RuntimeScope.create(...)` / `branch(...)` 已改为直接接收 entry `Ritual`，并在 scope 内部构造和持有 entry process；entry process 的结构建立不再经由 `Interpreter` hook 装配。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `RuntimeScope.spawn(...)` 也已改为直接接收 spawned `Ritual` 与 `participation`，由 scope 内部构造 process，再交由 `Interpreter` 做 registry 登记。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `RuntimeGraph` 当前公开面已进一步收紧为 `registerScope / registerProcess / registerFuture` 与 `resolveScope / resolveProcess`；它只承担 registry/locator 角色，不再暴露额外的运行语义入口。  
  证据：`packages/kernel/src/interpreter/runtime-graph.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- future 当前实现仍以 `RuntimeScope` 内部记录为准：`FutureKey` / `FutureSettleKey` 只是 token，`RuntimeGraph` 只保留 future record 的登记索引，不再承担 future 创建语义。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/runtime-graph.ts`
- future 的运行时建模当前仍未稳定：放在 `RuntimeScope` 与放在 `RuntimeProcess` 都会出现不顺手的边界压力，因此已登记后续评估 `RuntimeFuture` 一类独立对象的需要；但这一方向当前只做设计留意，不进入本轮实现。  
  证据：`docs/interpreter.md`、`docs/execution.md`
- `observeRunnable(...)` 目前仍明确占位为 `notImplemented(...)`；runnable 事件应由 `Interpreter` 还是其他 runtime 协调层触发，尚未定案。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`
- `wait` / `receive` 的阻塞路径已按“进入等待态 + `primeContinuation(...)`”两步拆开；`receive` 同时显式区分了 `tryReceive` 与阻塞式 `receive`。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-process.ts`
- `RuntimeProcess` 与 `RuntimeScope` 当前都已按 interpreter 的直接依赖补出最小签名面，但 future / mailbox 相关多项能力仍刻意保持 `notImplemented(...)`；这轮提交强调的是对象边界与公开面收口，而不是这些运行时能力已经完成。  
  证据：`packages/kernel/src/interpreter/runtime-process.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`
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
- `README.md` 与 `interpreter.md` 已同步更新 interpreter runtime 的边界表述，不再把 `RuntimeScope` / `RuntimeProcess` 的绝对解耦当成目标设计。  
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

1. 继续完成 `Interpreter` review；重点不再是维持 `RuntimeScope` / `RuntimeProcess` 的绝对解耦，而是把 runtime 寻址和结构装配从 `Interpreter` 回收到 `RuntimeScope` 主导的模型。
2. 重做 process / scope 关系：应由 `RuntimeScope` 直接持有并组织本地 `RuntimeProcess` 状态，而 `RuntimeProcess` 继续只通过 `scopeRef` 与 scope 语义关联，不反向依赖 `RuntimeScope`。
3. 重做 future 处理：当前实现仍把 future record 暴露给 `RuntimeGraph` 做索引与等待队列管理，但后续更可能改成“由 locator 快速定位 owner scope，再由 `RuntimeScope` 完成 future 处理”。
   同时需要保留一个未决观察：若 future 操作继续卡在 `RuntimeScope` / `RuntimeProcess` 二者之间来回摆动，应转向评估 `RuntimeFuture` 一类独立建模。
4. 继续补完 `halt` / closing 协议；当前 `RuntimeScope.halt(...)`、closing subtree 扩散与 closing worker 形成仍是占位实现，而这部分正是检验依赖方向是否合理的关键场景。
5. 重新评估 `RuntimeGraph` 的命名；虽然其公开面现已收口为 registry/locator 风格，但名字是否最终改成 `RuntimeRegistry` 一类更贴近“登记/定位”的命名，仍待定。
6. 在恢复委派路径上继续收口 mailbox、future 与 `Scope` 的职责分工。
7. 评估 `all` / `race` 是否直接以 `spawn` + future 组合表达。

## 6. 验证基线

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
yarn workspace @shajara/host typecheck
yarn workspace @shajara/host lint
```

当前与本轮文档调整直接相关的验证状态：

- 已执行并通过：`@shajara/kernel typecheck`、`@shajara/kernel lint`。
