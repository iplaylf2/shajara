# 实现状态

当前阶段：**Build — Make it work**。

---

## 当前主题

当前迭代的主题是把 `RuntimeProcess` 的内部运行协议落地到可执行状态，并保留下一轮继续修正 stepper / waiting-resume 语义所需的上下文。

---

## 当前现实

当前仍然影响这一轮工作的事实只有这些：

- `RuntimeProcess` 已不再是 `notImplemented(...)` 空壳；`transitionTo(...)` 已直接承接 `running / waiting / completed / failed / canceled` 的状态迁移，keeper / runner 两侧都从同一份内部状态读取。  
  证据：`packages/kernel/src/interpreter/runtime-process/process.ts`
- `RuntimeProcess` 的 `running` / `waiting` 分支都显式保存 `Stepper`，因此等待态不会丢失 runner 侧的内部推进对象。  
  证据：`packages/kernel/src/interpreter/runtime-process/process.ts`
- `Stepper` 已从简单的 next 值缓存改成可旋转的内部状态机；它内部持有 `echo / resonate / relic` 三类源状态，并由 `next()` 把内部状态投影成公开 `RuntimeProcessRunnerNext`。  
  证据：`packages/kernel/src/interpreter/runtime-process/stepper.ts`
- `Stepper` 当前的 `resonate` 状态不再保存预计算后的后继，而是保存 `continue: () => Wisp<Relic>` thunk；初始 `worker` 调用与后续 `wisp.resonate(echo)` 都被延迟到命中 `resonate` 时执行。  
  证据：`packages/kernel/src/interpreter/runtime-process/stepper.ts`
- `RuntimeProcessRunnerNext` 的公开 `resonate` 载荷仍保留 `sigil`，并由 `Stepper` 在 thunk 执行后、结果进入新的 stirring 状态时投影出来。  
  证据：`packages/kernel/src/interpreter/runtime-process/runner.ts`、`packages/kernel/src/interpreter/runtime-process/stepper.ts`
- `RuntimeScope` 仍然是 lifecycle 协调者：它负责 `complete / halt / cancel / wait / receive` 的编排，而 `RuntimeProcess` 只消费这些迁移，不承担 scope 侧治理职责。  
  证据：`packages/kernel/src/interpreter/runtime-scope/runtime-scope.ts`

---

## 当前偏差

当前最值得在下一轮继续处理的偏差有两条：

1. `waiting -> running` 的恢复路径现在通过 `current.stepper.next().accept(input)` 重新取一次 `next()` 后推进；这很可能不符合预期，因为恢复语义更像是应当回到先前已准备好的 accept continuation，而不是再次执行一次新的 `next()`。这条问题已在代码里留下注释，当前先保留现状以便阶段性提交。  
   证据：`packages/kernel/src/interpreter/runtime-process/process.ts`
2. `Stepper` 的内部状态机虽然已经具备明显的不对称性，但它的最终语义还没有被行为测试固定，尤其是 `resonate -> relic`、`resonate -> echo`、以及 waiting 恢复之后的连续步进路径。  
   证据：`packages/kernel/src/interpreter/runtime-process/stepper.ts`、`packages/kernel/src/interpreter/runtime-process/process.ts`

---

## 相对设计基线的增量

- 相对文档基线，`RuntimeProcess` 现在已经实际拥有 keeper / runner 双面共享的内部状态，而不再只是接口占位。
- 相对早前实现尝试，`Stepper` 已从“直接缓存下一步结果”改成“保存内部源状态并在 `next()` 时投影公开结果”的结构；这使内部状态与公开 `RuntimeProcessRunnerNext` 明确不对称。
- 相对设计预期，waiting 恢复语义仍未收敛；当前实现只是可运行快照，不应视为最终正确模型。

---

## 下一步

1. 修正 `waiting -> running` 的恢复模型，避免恢复时通过新的 `next()` 重新生成 accept 路径。
2. 为 `Stepper` 的 `echo / resonate / relic` 旋转路径补行为验证，先固定当前 intended semantics，再继续细修内部状态形状。
3. 在 `RuntimeProcess` 语义稳定后，再回到 runnable observation / executor 对接。

---

## 验证

当前可复现的检查命令：

```sh
yarn workspace @shajara/kernel run -T oxlint src/interpreter/runtime-process/process.ts src/interpreter/runtime-process/stepper.ts src/interpreter/runtime-process/runner.ts
yarn workspace @shajara/kernel typecheck
```
