# 实现状态

当前阶段：**Build — Make it work**。

---

## 当前焦点

当前要收口的问题有两条：

1. 把运行时状态相关的定义收回到 `RuntimeScope` / `RuntimeProcess` 自身，并去掉 `cell` / `builder` 这类过度设计的中介层。
2. 先把 `RuntimeScope` 的正常收敛表达清楚，把 `halt` / closing / future settlement 这些复杂路径继续冻结在占位边界后面。

其中第一条当前已经明确的方向是：

- `RuntimeProcess` 不需要再引入 `cell` 作为运行态承载位
- `RuntimeProcess` 与 `RuntimeScope` 各自暴露自己的 `observe(...)`
- `zone` 保留为 `RuntimeScope` 的结构承接位，而不是通过 builder 深度嵌入 process/runtime 主链路
- `Interpreter.observeRunnable(listener)` 目前仍通过 root zone 的 `trackProcess(process)` 提供最小 runnable 观察面

第二条目前已经确认的阶段性事实是：

- `RuntimeScope` 通过监听直系 Process 与子 Scope 的状态变化表达正常收敛
- 正常收敛当前只关心入口 process、当前 scope 内的 structural process，以及子 scope 的关闭状态
- `RuntimeScope` 当前采用 `running / completing / failing / completed / failed` 这组状态；`isClosed` 只表达“已终态”
- `RuntimeScope` 已按 structural process、detached process 与 `children` 分开承接容器语义；成员终态后的移除逻辑仍停留在观察回调后的 `notImplemented(...)`
- `halt`、closing 级联、`ScopeRef.exitFuture`、派生 future 的 settle，以及 closing failure 收束仍未恢复；当前继续留待后续实现

---

## 当前偏差

当前实现与这两条焦点之间的偏差主要还有五条：

1. 当前实现已经移除了 `RuntimeCellBuilder` / `RuntimeCell` 这条旧路径，但 `RuntimeProcess` 的大部分运行协议仍明确停留在 `notImplemented(...)`。  
   证据：`packages/kernel/src/interpreter/runtime-process.ts`

2. `Interpreter.observeRunnable(listener)` 目前仍通过 root zone 的 `trackProcess(process)` 获得 runnable 视图；它还没有与 `RuntimeProcess.observe(...)` / `RuntimeScope.observe(...)` 建立新的统一关系。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`

3. `RuntimeScope` 现在只表达正常收敛；`halt` 与 closing 仍未重新设计，`ScopeRef.exitFuture` 的 settle、派生 future 的强制收敛，以及 closing failure 的归并也都还没有重新建立。  
   证据：`packages/kernel/src/interpreter/runtime-scope.ts`

4. `packages/kernel/src/interpreter/scope-closing.ts` 当前不应承载主链路职责；在 `halt` 语义重新收束前，不应急着恢复新的 closing 编排对象。  
   证据：`packages/kernel/src/interpreter/scope-closing.ts`

5. closing failure 的收集与 `scope-failed` 的构造位置仍需要在后续重构中重新定义；在那之前，不应再通过解释器扩展点或额外 builder 注入去干预关闭路径上的 failure。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`

---

## 下一步

1. 继续补齐 `RuntimeProcess` 的运行协议，决定哪些状态推进应恢复为真实实现，哪些仍保持 `notImplemented(...)`。
2. 明确 `RuntimeProcess.observe(...)`、`RuntimeScope.observe(...)` 与 `Interpreter.observeRunnable(...)` 之间的长期边界，避免不同层重复承接同一类事件语义。
3. 在正常收敛语义稳定后，再决定 `halt` / closing 应该如何回到 `RuntimeScope`，以及何时补回 scope `exitFuture`、派生 future 与 failure 收束的接线。
4. 重新建立 `packages/kernel/src/interpreter/scope-closing.ts` 的职责边界，只在语义重新收束后再恢复其实现。
5. 重新定义 closing failure 的收集语义与 `ScopeFailureBuilder` 的最终接线位置，但不要重新引入 `onClosing` / `HaltHandler` 这类干预点，也不要再把 builder 当成状态驱动主通道。
6. 继续实现 executor，并在那时确定它如何消费这些观察面；`zone` 继续只作为结构组织层来协作。

---

## 验证

建议验证命令：

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```
