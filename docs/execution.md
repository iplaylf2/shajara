# 实现状态

当前阶段：**Build — Make it work**。

---

## 1. 当前目标

当前工作以文档基线收口为先。现行基线已经明确：

- `spawn` 是公开并发原语，返回分支结果的 `Future`
- `enclose`、`guard`、`resumable` 负责引入新的 `Scope`
- future 与上下文值都归属当前 `Scope`
- `Scope` / `Process` 都带创建时固定的 descriptor；`FailureMode` 与 `CompletionMode` 是其中稳定进入 kernel 语义的字段
- `observeRunnable` 收口为 scope 子树级的 runnable 驱动接面，采用遮蔽而不是广播语义

证据：`docs/api.md`、`docs/semantics.md`

## 2. 当前实现与基线的差异

- `all` / `race` 仍带有 supervisor-driven 实现外壳。  
  证据：`packages/kernel/src/primitives/all.ts`、`packages/kernel/src/primitives/race.ts`
- mailbox 语义仍存在于实现层，并继续承担部分恢复委派协议。  
  证据：`packages/kernel/src/primitives-kit/resumable.ts`
- `halt` 的解释仍未落实为完整的 scope 关闭、失败传播与后代级联终止流程。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`
- `governor` 相关 descriptor 扩展仍停留在 `kernel/src/scopes/`，但尚未重新挂接到新的 interpreter / executor 主调用链。  
  证据：`packages/kernel/src/scopes/governor.ts`、`packages/kernel/src/executor/*.ts`

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
- `enclose` 已落地为 blocking 的独立收敛子 `Scope`。  
  证据：`packages/kernel/src/primitives/enclose.ts`、`packages/host/src/primitives/enclose.ts`
- `join` 包装层已删除，scope 等待统一经由 `wait(scopeRef.exitFuture)` 表达。  
  证据：`packages/kernel/src/primitives/index.ts`、`packages/host/src/primitives/index.ts`、`apps/example/src/scenarios.ts`
- interpreter runtime 文件已按职责拆分为 `runtime-scope.ts` 与 `runtime-process.ts`；原先聚合命名的 `runtime.ts` 已退出该结构。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/runtime-process.ts`
- `RuntimeProcess` 已收口为 process 局部状态对象：构造时直接接收 `scopeRef`、`ritual` 与 `ProcessDescriptor`，并自治创建和持有自己的 `exitFuture`；自身继续负责 continuation、blocking 与终态收敛。  
  证据：`packages/kernel/src/interpreter/runtime-process.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- 当前实现仍把 `RuntimeScope` / `RuntimeProcess` 按 ref 边界拆得过开：`RuntimeScope` 虽已成为 entry/spawn 的结构宿主，但 `Interpreter` 仍承担 runtime index 的登记、`scopeRef` / `processRef` 的寻址与部分 future 编排。这个形态仍不应作为长期基线。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/runtime-process.ts`
- `RuntimeProcess.resonate()` 现在会在 resonance 产出 `RestingWisp` 时直接把 process 收敛为 completed；`step` 在得知 process 已终态时只返回 `exited`，不再额外触发退出后处理。  
  证据：`packages/kernel/src/interpreter/runtime-process.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `branch` / `self` 的 echo 公开语义已统一收口为 `*Handle`，不再使用 `*Descriptor` 命名。  
  证据：`packages/kernel/src/sigils/branch.ts`、`packages/kernel/src/sigils/self.ts`、`packages/kernel/src/primitives/self.ts`
- `RuntimeScope` 的 `parent` 构造契约已收紧为非空；根 scope 通过私有静态 sentinel 哨兵承接 `create(...)` 的特例，空值不再出现在正常实例构造面。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`docs/interpreter.md`
- `RuntimeScope.create(...)` / `branch(...)` 已改为直接接收 entry `Ritual`，并在 scope 内部构造和持有 entry process；但相关 runtime index 登记仍未完全从 `Interpreter` 侧退出。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `RuntimeScope.spawn(...)` 也已改为直接接收 spawned `Ritual` 与 `ProcessDescriptor`，由 scope 内部构造 process；当前 `Interpreter` 仍会补做 process registry 登记。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `RuntimeScope` 对动态对象的内部追踪已改为“派生对象集合”：`#derivedFutures` 只记录 `createFuture(...)` 产物，`#spawnedProcesses` 只记录 `spawn(...)` 产物；构造期恒有对象（scope 自身 `exitFuture` 与 `entryProcess`）不再重复放入这两类集合。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`
- `RuntimeIndex` 当前公开面已进一步收紧为 `registerScope / registerProcess / registerFuture` 与 `resolveScope / resolveProcess / resolveFuture / resolveFutureBySettle`；它只承担 index/locator 角色，不再暴露额外的运行语义入口，内部索引容器也已改为 `WeakMap`。  
  证据：`packages/kernel/src/interpreter/runtime-index.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- future 当前实现已收口为“双来源”：`RuntimeScope.createFuture(...)` 负责 scope 派生 future，`RuntimeProcess` 自治持有 process `exitFuture`；`RuntimeIndex` 统一承担 token 到 runtime future 的解析索引。`FutureKey` / `FutureSettleKey` 仍只是 token，对应 key pair tuple 形状已在 `contracts` 收口为 `FutureHandle`；`poll / wait / settle` 目前仍是占位实现。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/runtime-future.ts`、`packages/kernel/src/interpreter/runtime-index.ts`
- `Interpreter.processRoot` 与 `branch` 返回值里的 `processRef` 现统一从 `RuntimeScope.entryProcess.ref` 读取，不再依赖 `RuntimeScope.processRef` 别名。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`
- `observeRunnable(...)` 的边界已进一步收口：`Interpreter.observeRunnable(scopeRef, ...)` 只按 ref 寻址并转发给目标 `RuntimeScope.observeRunnable(...)`；与此对应，`RunnableListener` / `Unsubscribe` 这类 alias 也已贴近 `RuntimeScope` 落位，而没有回流到 kernel 基础 `contracts/`；但其具体语义仍停留在旧的“广播观察”理解之外，遮蔽式驱动接线协议尚未落地。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`
- `wait` / `receive` 的阻塞路径已按"进入等待态 + `primeContinuation(...)`"两步拆开；`receive` 同时显式区分了 `tryReceive`（尝试立即从 mailbox 取值）与 `receive`（scope-level 等待登记）两层动作。其中 `wait` 所依赖的 runtime future 行为当前仍是占位实现。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-process.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`
- `RuntimeProcess` 已从 future 状态读写里收口回 process 局部状态对象；future、mailbox 与 closing 相关多项能力仍刻意保持 `notImplemented(...)`。这轮提交强调的是对象边界、公开面与解释器编排面的收口，而不是全部运行时能力已经完成。  
  证据：`packages/kernel/src/interpreter/runtime-process.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/runtime-future.ts`
- `halt` 的主调用链已先行收口：`Interpreter` 现在负责把 `halt` 转写为对 `RuntimeScope.halt(...)` 的调用，并把 `onClosing(scope, processes, failure)` 包装成 closing worker factory 交给 `RuntimeScope`；`RuntimeScope` 侧的 closing 协议签名已经固定，但具体关闭流程仍是占位实现。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`
- `RuntimeScope.isClosed` 当前仍是占位实现（`notImplemented(...)`），解释环境关闭判定尚未落地。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`
- `Interpreter.step(...)` 已先按 `RuntimeProcess.status` 分派，再在 `runnable` 分支内细分 interpret / resonate；其公开返回值也已从 `ProcessStage` 收口为 `ProcessStep`，并以 `disposition` 表达本次步进结果而不是复写 runtime `status`。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/process-step.ts`、`docs/interpreter.md`
- `RuntimeProcess` 的 exit 失败注入路径已实现：新增公开方法 `fail(failure: FailureShape)`；现存的 `#complete(value)` 与新增 `#fail(failure)` 都最终调用 `#finish(result)` 启动 process 终态收敛。这允许 `Scope.halt(...)` 协议从外部将源失败或级联终止失败注入到 process 的 exit future。  
  证据：`packages/kernel/src/interpreter/runtime-process.ts` lines 96–111
- `RuntimeScope` 状态机已实现：新增私有字段 `#status: RuntimeScopeStatus = "open"`，状态值为 `"open" | "closing" | "closed"`；新增公开 getter `status`；`branch(...)` 与 `spawn(...)` 其间若 `#status !== "open"` 则抛出异常。这为 halt 的关闭级联提供了结构基础。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts` lines 138, 140, 163–171, 180–189
- `ScopeDescriptor` / `ProcessDescriptor` 的基础契约已进入实现主路径：`FailureMode = "propagate" | "contain"` 与 `CompletionMode = "structural" | "detached"` 已在 `contracts/` 落位；`branch` / `spawn` sigil、`RuntimeScope` / `RuntimeProcess`、以及 `Interpreter` 根入口默认值都改为直接读取 descriptor，而不再依赖 `ScopeSpec` 或 `participation`。  
  证据：`packages/kernel/src/contracts/scope.ts`、`packages/kernel/src/contracts/process.ts`、`packages/kernel/src/sigils/branch.ts`、`packages/kernel/src/sigils/spawn.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/runtime-process.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- 旧 scope taxonomy 已开始退出实际调用面：`enclose` / `race` / `resolvePrimary` 现直接以内联 descriptor 建立本地失败收敛边界；`guard` 的恢复 worker 也已直接以内联 process descriptor 表达 detached 语义，不再经由 `auxiliary` 旧命名表达。  
  证据：`packages/kernel/src/primitives/enclose.ts`、`packages/kernel/src/primitives/race.ts`、`packages/kernel/src/primitives-kit/process.ts`、`packages/kernel/src/primitives/guard.ts`
- `branch` / `spawn` 的默认 descriptor 也已收口为 sigil 层的默认参数，而不是额外的 helper factory；`RuntimeScope` entry process 与 `Interpreter.spawn(...)` 也直接以内联 descriptor 表达默认 structural 语义。  
  证据：`packages/kernel/src/sigils/branch.ts`、`packages/kernel/src/sigils/spawn.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- host 侧 `self` 的公开 echo 命名也已与 kernel 保持一致：`SelfDescriptor` 残留已收口为 `SelfHandle`。  
  证据：`packages/host/src/contracts/kernel.ts`、`packages/host/src/primitives/self.ts`
- `send` / `receive` 协议已以 scope-centric 语义完整落地。`receive` 的语义主语确立为 scope：`RuntimeScope.receive(process, messageKey)` 是公开协议登记入口，表达"在当前 scope 上登记某 process 对某 messageKey 的接收等待"；`RuntimeProcess.receive(messageKey)` 只负责 process 局部等待态迁移，不再单独承担协议主语语义。`Interpreter.#receive(...)` 改为调用 `scope.receive(process, messageKey)` 而不是直接操作 process。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/runtime-process.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `RuntimeScope.send(...)` 第三个参数统一命名为 `value`（与 sigil 层、Interpreter 层对齐，不再用 `message`）；send 路径已完整落地：`#acceptMessage` 优先尝试经由 `#deliverToReceiver` 直接投递给 receiverQueue 队首的等待 process；若无等待者则回退到 `#bufferMessage` 入 mailbox FIFO 队列。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`
- `RuntimeProcess.accept(value)` 新增：承接 scope 投递的 value，将 process 从 waiting 恢复为 runnable，并以 value 为 echo 安置已就绪的 continuation；如果在非 receive-waiting 状态或 continuation 尚未 prime 时被调用，则抛出协议违约错误。  
  证据：`packages/kernel/src/interpreter/runtime-process.ts`
- `RuntimeScope` 内部新增 `#receiverQueues: WeakMap<MessageKey, RuntimeProcess[]>` 记录各 messageKey 的 FIFO 等待者队列，与 `#mailboxes`（消息缓冲）并列。两个容器均以 WeakMap 承载，生命期随 key 自然回收，不做额外空队列清理。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`
- `Interpreter` 的 `#send` 处理已完成委托简化：先通过 `RuntimeIndex` 解析双方 scope ref，再转调 sender 的 `RuntimeScope.send(targetScope, ...)`；自身不再承载消息路由逻辑。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`
- `Interpreter.processRoot` 与 `branch` 返回值中 `processRef` 的来源已完全统一：均从 `RuntimeScope.entryProcess.ref` 读取，移除了对 `RuntimeScope.processRef` 别名的依赖。  
  证据：`packages/kernel/src/interpreter/interpreter.ts` lines 82, 212

## 4. 本轮工作总结

**完成的设计锚点：**

- RuntimeProcess 的 exit failure injection 通道开放：外部可以通过 `fail(failure)` 方法即时注入失败，为 halt closing 协议提供故障传播支撑。
- RuntimeScope 状态机的公开面定型：`open → closing → closed` 状态流转已通过 status 字段和检查门控确立。
- Mailbox 精确化定名与生命期管理：MessageKey / message 语义分离已通过字段命名明确，WeakMap 采用自动化了 key 生命期。
- Send 方法合约清晰化：enqueue 步骤完成，wake-up 缺失通过显式 `notImplemented` 占位标记，避免虚假"已完成"错觉。
- Interpreter 的 send 委托已完全收口：ref 解析与消息路由现完全分离，Interpreter 只负责前者。
- 设计基线已重写：`Scope` 的稳定语义核不再围绕旧的 role taxonomy 展开，而是收口为 failure 上传语义；`observeRunnable` 的定位也已从开放观察面改写为带遮蔽语义的驱动接面。

**当前实现阅读锚点：**

- `step(...)` 先按 `RuntimeProcess.status` 分派，再在 `runnable` 分支内细分 interpret / resonate。
- `#interpretWisp` 继续采用 top-down case 风格；单个 sigil case 通常按“解释 sigil、安置 `resonate`、包装 `ProcessStep`”组织。
- 阻塞路径继续区分“进入等待态”与“预置 continuation”两步，分别对应 `wait/receive` 与 `primeContinuation(...)`。
- `receive` 继续区分 `tryReceive` 与 `receive` 两层动作：前者尝试立即消费 mailbox，后者登记 scope-level 等待。
- `setContinuation(resonate, echo)` 与 `primeContinuation(resonate)` 继续表达两种不同状态：前者进入待执行 continuation，后者表示 continuation 已就位但仍待外部恢复值。

**当前占位符轮廓：**

- `RuntimeScope.halt(...)` 方法签名已定，closing flow 仍是占位。
- `RuntimeScope.send` 的 wake-up protocol 已显式 `notImplemented`。
- `RuntimeScope.isClosed` 仍是占位实现。
- Future 路径（`poll / wait / settle` 与 receiver wake-up）仍是占位。
- `standard / supervisor / governor` 子路径仍保留在 `kernel/src/scopes/`，但其中只有 descriptor 常量与 `governor` 扩展仍有留存；它们不再代表另一套稳定 taxonomy。
- `governor` 相关 descriptor 扩展仍保留 executor-oriented capability 字段，但这层能力尚未重新挂接到新的 interpreter / executor 主调用链；它目前只是 descriptor 形状上的兼容承载位，而不是稳定语义闭环。
- `Interpreter.observeRunnable(...)` 的代码形态仍未跟上新的文档基线；其目标语义已收口为 scope 子树级、带遮蔽关系的 runnable 驱动接面。

## 5. 下一步

1. 同步重写 `RuntimeScope.observeRunnable(...)` 与调用协议，把 runnable 接口落成遮蔽式驱动接面，而不是普通广播监听。
2. 补完 `RuntimeScope.halt(...)` 的 closing 协议，落实 scope 状态转移、failure 级联、child 子树终止，以及 closing worker 与 exit future 的交互方式。
3. 继续完成 future 路径：当前 `RuntimeFuture` 只提供 key pair 与占位方法，`poll / wait / settle` 与 receiver 恢复都仍未补完。
4. 在恢复委派路径上继续收口 mailbox、future 与 `Scope` 的职责分工。

## 6. 验证基线

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
yarn workspace @shajara/host typecheck
yarn workspace @shajara/host lint
```

当前与本轮文档调整直接相关的验证状态：

- 已执行并通过：`yarn lint`（所有包，@shajara/example / @shajara/host / @shajara/kernel）、`@shajara/kernel typecheck`。
