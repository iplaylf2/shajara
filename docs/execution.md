# 实现状态

当前阶段：**Build — Make it work**。

---

## 当前主题

当前迭代的主题不是继续铺开更多运行协议，而是先稳定 `RuntimeProcess` 的实现前置边界。

当前只聚焦这一件事：

- 明确 `RuntimeScope` 与 `RuntimeProcess` 的分工，并收口 `send/receive` 与 process lifecycle 的接线方式。

---

## 当前现实

当前可以作为这一轮实现前提的事实只有这些：

- `RuntimeScope` 已经承接 scope lifecycle、member ownership、mailbox、derived future 与 cleanup 触发时机。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`
- `send/receive` 的结构归属已经收口在 `RuntimeScope`；`RuntimeMailbox` 只承接 message buffer、receiver queue 与匹配结果，不再直接依赖 `RuntimeProcess`。  
  证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/runtime-mailbox.ts`
- `RuntimeProcess` 已经独占 `runtime-process/` 子目录，并分出 `Handle / Keeper / Runner` 三个公开面；但它的主要运行协议还没有落地。  
  证据：`packages/kernel/src/interpreter/runtime-process/process.ts`
- `RuntimeProcessKeeper` 的设计基线已经开始收口到显式 `RuntimeProcessState`：keeper 负责公开 `stateAs(...)`，供 `RuntimeScope` 读取挂在状态分支上的 process 终态信息。  
  证据：`packages/kernel/src/interpreter/runtime-process/keeper.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`、`docs/interpreter.md`
- `ProvideRuntimeProcess` 这条统一出生口已经落在 `runtime-process` 侧，并被 `Interpreter` 用来把 process 创建与 `touch(...)` 登记收在同一处；相对地，`resolve(...)` 继续面向 `ref / key` 这类抽象 token。  
  证据：`packages/kernel/src/interpreter/runtime-process/keeper.ts`、`packages/kernel/src/interpreter/interpreter.ts`、`docs/interpreter.md`
- 当前设计基线已经明确采用软约束边界：`RuntimeScope` 可以直接依赖 `RuntimeProcess`，但只把它当作 lifecycle member，不把它当作 ritual execution runner。  
  证据：`docs/interpreter.md`

---

## 当前偏差

当前真正阻塞下一步实现的偏差只有一条：

1. `RuntimeProcess` 的 keeper 侧虽然已经开始以 `RuntimeProcessState` 作为状态基线，但 `RuntimeProcess` 内部还没有真正按这个 sum type 驱动状态迁移，所以 `halt(failure)`、`cancel()`、等待与恢复协议仍未落位。  
   证据：`packages/kernel/src/interpreter/runtime-process/process.ts`、`packages/kernel/src/interpreter/interpreter.ts`

设计文档中关于切面划分的标准，当前已经在实现上部分落地：分类不再只按抽象语义，而是按 `RuntimeScope` / `Interpreter` 谁实际直接依赖这项能力来划分。  
证据：`packages/kernel/src/interpreter/runtime-process/keeper.ts`、`packages/kernel/src/interpreter/runtime-process/runner.ts`

---

## 下一步

1. 在已经分出的 `RuntimeProcessKeeper / RuntimeProcessRunner` 切面上，继续冻结 `RuntimeScope` 不应触碰的 execution 面。
2. 继续把 `RuntimeProcess` 内部状态迁移到 `RuntimeProcessState`，使 completed result、failed failure 以及其余待冻结的状态载荷真正由状态机承载，而不是停留在设计层投影。
3. 在已经收口的 `send/receive` 接线上继续保持边界稳定，不让 mailbox 重新回流到 process 执行协议里。
4. 完成 `RuntimeProcess` 的剩余运行协议实现，再回到 runnable observation 与 executor 对接。

---

## 验证

建议验证命令：

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```
