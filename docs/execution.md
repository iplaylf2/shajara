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
- `RuntimeProcess` 仍是 process 局部运行态的承接位，但它的主要运行协议还没有落地。  
  证据：`packages/kernel/src/interpreter/runtime-process.ts`
- 当前设计基线已经明确采用软约束边界：`RuntimeScope` 可以直接依赖 `RuntimeProcess`，但只把它当作 lifecycle member，不把它当作 ritual execution driver。  
  证据：`docs/interpreter.md`

---

## 当前偏差

当前真正阻塞下一步实现的偏差只有三条：

1. `RuntimeProcess` 的 lifecycle-facing 与 execution-facing 边界还没有在实现上收口；当前真实状态仍由 `status`、continuation、result 等平行字段隐式拼出，所以 `halt(failure)`、`cancel()`、等待与恢复协议还无法稳定落位。  
   证据：`packages/kernel/src/interpreter/runtime-process.ts`、`packages/kernel/src/interpreter/interpreter.ts`

2. `send/receive` 的结构归属虽然已经落在 `RuntimeScope`，但 message registration 与 process waiting-resume 协议的分工还没有收口。  
   证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`

3. receiver queue 目前缺少与 process lifecycle 对齐的解绑语义；process 关闭后仍可能残留在消费队列中。  
   证据：`packages/kernel/src/interpreter/runtime-scope.ts`

---

## 下一步

1. 先明确 `RuntimeScope` 可直接调用 `RuntimeProcess` 的 lifecycle 面，冻结不应由 `RuntimeScope` 触碰的 execution 面。
2. 以 `RuntimeProcessState` 形式把 process 局部状态收口成 sum type，使 continuation、waiting reason、终态 result 与对应状态分支绑定。
3. 在这个边界下重画 `send/receive` 的接线，明确 mailbox、receiver registration、waiting、resume 分别由谁承接。
4. 给 receiver registration 补上生命周期约束，使 closed process 不再保留为活跃 receiver。
5. 完成 `RuntimeProcess` 的剩余运行协议实现，再回到 runnable observation 与 executor 对接。

---

## 验证

建议验证命令：

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```
