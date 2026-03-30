# 实现状态

当前阶段：**Build — Make it work**。

---

## 当前主题

当前迭代的主题是完成 `RuntimeProcess` 的内部状态机实现，使 keeper / runner 两侧已冻结的状态视图真正由内部状态驱动。

---

## 当前现实

当前可以作为这一轮实现前提的事实只有这些：

- `RuntimeScope` 已经完整承接 scope lifecycle、member ownership、mailbox、derived future、cleanup 触发时机，以及对所属 process 的状态迁移编排（complete / halt / cancel / wait / receive）。scope 知道 process 该怎么变，变完后驱动自身收敛或通过 zone 上报。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`
- `send/receive` 的结构归属已经收口在 `RuntimeScope`；`RuntimeMailbox` 只承接 message buffer、receiver queue 与匹配结果，不再直接依赖 `RuntimeProcess`。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/runtime-mailbox.ts`
- `RuntimeProcess` 已经独占 `runtime-process/` 子目录，并分出 `Handle / Keeper / Runner` 三个公开面；但它的主要运行协议还没有落地。  
  证据：`packages/kernel/src/interpreter/runtime-process/process.ts`
- `RuntimeProcessKeeper` 已冻结 scope-facing 状态视图：`transitionTo(...)` 接受 `RuntimeProcessKeeperTransition`（`running` 必须携带 `input`，`waiting` 必须携带 `dispose` 回调，`completed` 携带 `result`，`failed` 携带 `failure`，`canceled` 无载荷）；`stateAs(...)` 供 scope 读取终态载荷。keeper 不再暴露 `accept`、`cancel`、`receive` 等独立方法——状态迁移统一由 scope 通过 `transitionTo(...)` 驱动。  
  证据：`packages/kernel/src/interpreter/runtime-process/keeper.ts`
- `RuntimeProcessRunner` 已冻结 interpreter-facing 状态视图：`running` 状态通过 `next()` 返回 tagged union（`echo` / `resonate` / `relic`）；`waiting` 与 closed 分支各自承接对应载荷。runner 不再暴露 `wait(...)` 或 `halt(...)`——这些能力已迁移到 scope 侧。  
  证据：`packages/kernel/src/interpreter/runtime-process/runner.ts`、`packages/kernel/src/interpreter/interpreter.ts`
- `Interpreter` 在 `step` 中对 `relic` 结果调用 `scope.complete(keeper, relic)`，对 `halt` sigil 调用 `scope.halt(keeper, failure)`，对 `wait` sigil 调用 `scope.wait(keeper, future)`——sigil 解释的副作用统一经由 scope 协调，而不是直接操作 process。  
  证据：`packages/kernel/src/interpreter/interpreter.ts`
- `ProvideRuntimeProcess` 这条统一出生口已经落在 `runtime-process` 侧，并被 `Interpreter` 用来把 process 创建与 `touch(...)` 登记收在同一处；相对地，`resolve(...)` 继续面向 `ref / key` 这类抽象 token。  
  证据：`packages/kernel/src/interpreter/runtime-process/keeper.ts`、`packages/kernel/src/interpreter/interpreter.ts`、`docs/interpreter.md`
- 当前设计基线已经明确采用软约束边界：`RuntimeScope` 可以直接依赖 `RuntimeProcess`，但只把它当作 lifecycle member，不把它当作 ritual execution runner。  
  证据：`docs/interpreter.md`

---

## 当前偏差

当前真正阻塞下一步实现的偏差只有一条：

1. keeper / runner 两侧的状态视图已经冻结，但 `RuntimeProcess` 内部仍主要由 `notImplemented(...)` 占位承接，还没有真正按这些状态视图驱动内部状态迁移。`transitionTo(...)` 的实现、`next()` 的 tagged union 产出、以及 `stateAs(...)` 的内部状态读取均未落位。  
   证据：`packages/kernel/src/interpreter/runtime-process/process.ts`

---

## 下一步

1. 实现 `RuntimeProcess` 内部状态机，使 `transitionTo(...)` 真正驱动内部状态迁移，并使 `stateAs(...)` 从内部状态正确读取。
2. 实现 runner 侧 `next()` 的 tagged union 产出（echo / resonate / relic），使 `Interpreter.step(...)` 的完整路径可执行。
3. 完成后回到 runnable observation 与 executor 对接。

---

## 验证

建议验证命令：

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```
