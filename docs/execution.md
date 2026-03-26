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
- `RuntimeProcess` 仍是 process 局部运行态的承接位，但它的主要运行协议还没有落地。  
  证据：`packages/kernel/src/interpreter/runtime-process.ts`
- 当前设计基线已经明确采用软约束边界：`RuntimeScope` 可以直接依赖 `RuntimeProcess`，但只把它当作 lifecycle member，不把它当作 ritual execution driver。  
  证据：`docs/interpreter.md`

---

## 当前偏差

当前真正阻塞下一步实现的偏差只有一条：

1. `RuntimeProcess` 的 lifecycle-facing 与 execution-facing 边界还没有在实现上收口；当前真实状态仍由 `status`、continuation、result 等平行字段隐式拼出，所以 `halt(failure)`、`cancel()`、等待与恢复协议还无法稳定落位。  
   证据：`packages/kernel/src/interpreter/runtime-process.ts`、`packages/kernel/src/interpreter/interpreter.ts`

---

## 下一步

1. 先明确 `RuntimeScope` 可直接调用 `RuntimeProcess` 的 lifecycle 面，冻结不应由 `RuntimeScope` 触碰的 execution 面。
2. 以 `RuntimeProcessState` 形式把 process 局部状态收口成 sum type，使 continuation、waiting reason、终态 result 与对应状态分支绑定。
3. 在已经收口的 `send/receive` 接线上继续保持边界稳定，不让 mailbox 重新回流到 process 执行协议里。
4. 完成 `RuntimeProcess` 的剩余运行协议实现，再回到 runnable observation 与 executor 对接。

---

## 验证

建议验证命令：

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```
