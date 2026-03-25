# 实现状态

当前阶段：**Build — Make it work**。

---

## 当前焦点

当前迭代聚焦两件事：

1. 保持运行时边界稳定：运行态定义继续收回到 `RuntimeScope` / `RuntimeProcess` 自身，不重新引入 `cell` / `builder` 一类中介层。
2. 收口 `RuntimeScope` 的关闭编排：优先把正常收敛、失败传播、cleanup 触发的主路径表达清楚，其余复杂运行协议继续冻结在占位边界后面。

---

## 当前已落实

当前已经落地并可作为后续迭代基线的实现约束包括：

- `RuntimeProcess` 不再引入 `cell` 作为运行态承载位，`RuntimeProcess` 与 `RuntimeScope` 各自暴露自己的 `observe(...)`。
- `zone` 继续只作为 `RuntimeScope` 的结构承接位；`Interpreter.observeRunnable(listener)` 目前仍通过 root zone 的 `trackProcess(process)` 提供最小 runnable 观察面。
- `RuntimeScope` 通过监听直系 process 与 child scope 的状态变化表达收敛；正常收敛当前只关心入口 process、当前 scope 内的 structural process，以及子 scope 的关闭状态。
- `RuntimeScope` 当前状态基线为 `running / closing / canceling / failing / completed / failed / canceled`；`RuntimeProcess` 当前状态基线为 `running / waiting / completed / failed / canceled`。
- `RuntimeScope` 的事件表已经明确分成 child scope 与 owned process 两条观察链；`closing` 的目标终态是 `completed`，`canceling` 的目标终态是 `canceled`，`failing` 的目标终态是 `failed`。
- child scope 的失败传播判定在 child 进入 `failing` 时按 child 自身的 `failureMode` 完成；child 的 `failed` 负责交付失败结果。
- `RuntimeScope` 已按 structural process、detached process 与 `children` 分开承接容器语义；成员终态后会在观察回调中从对应容器移除。
- scope failure draft 已恢复为 `interpreter/` 内部建模；`ScopeFailure` 当前为 `cause + suppressedFailures` 形状，`cause` 是 `process | scope` 的 sum type。
- `RuntimeScope` 当前在 process failed 与 child scope 传播 failing 时初始化 failure draft，并在后续成员失败时把它们作为 `suppressedFailures` 追加收集；scope 起因的 draft 先锚定 child scope ref，对应 failure 要等 child `failed` 后再读取。
- `RuntimeScope` 的内部生命周期状态当前已收敛成判别联合：`failing` 携带 draft，`failed` 携带最终 failure；公开 `status` 只暴露 tag。
- `RuntimeScope` 当前阶段性把取消路径命名收为 `cancelManaged` / `isQuiet` / `isIdle`，并在 `canceling` / `failing` 时先对 managed processes / children 做 snapshot，再基于 snapshot 执行取消，避免遍历过程中被新成员扰动。
- `RuntimeScope.cancel()` 当前在 `failing` 上重入 `enterFailing(existingDraft)`，以继续复用成员取消而不改写 scope 自身的失败终态目标；其他状态仍沿既有 `enterCanceling()` 路径推进，并由既有 `unreachable` 分支兜底非法组合。
- `RuntimeScope` 已补回 `ScopeRef.exitFuture` 的 `completed / canceled / failed` settlement；派生 future 改为在 scope 确认最终收敛时统一以 canceled settle，并在此时结束本 scope 的追踪。
- `RuntimeScope` 当前把 `unreachable` 分支作为状态机门控本体，而不是额外叠加“调用失败”式 fallback；`Branch/Spawn` 在非终态下仍允许发生。
- `RuntimeScope` 当前把 membership 的 `add/delete` 聚合回 `registerChildScope / registerOwnedProcess / createFuture` 这些注册函数自身；`driveByChildScope / driveByOwnedProcess` 只承接状态机推进，不再负责容器移除。
- `RuntimeScope` 当前在 `notifyObservers()` 完成本轮通知后，若 scope 已进入终态则清空 observer 集合，以避免上层闭包继续滞留在已关闭的下层对象上。
- `defer` 的设计基线已落到代码：`RuntimeProcess` 保存 `CleanupTask`，task 接收 `ProcessSpawner` 并返回 `void`；`Interpreter` 在解释 `defer` 时把 cleanup ritual 封成 task，并在 task 内完成 cleanup process 的 `RuntimeIndex.registerProcess(...)`。
- cleanup 不再通过 `Interpreter.registerCleanups(...)` 这种 process observer 的事后副作用触发；它已经改为由 `RuntimeScope` 在 `completed / canceled / failed` 各自的关闭路径里显式触发，而 cleanup process 的登记仍复用 `Interpreter` 的统一入口。
- `RuntimeScope.enterFailing(...)` 当前已恢复 `enter...` 内部自带 `try...` 的调度风格；process failed 路径通过传入显式 callback，把 cleanup 触发插在 `cancelManaged()` 与 `tryFailed(...)` 之间，普通重入路径则显式传 `io.Do`。

---

## 当前偏差

当前实现与这两条焦点之间的偏差主要还有五条：

1. 当前实现已经移除了 `RuntimeCellBuilder` / `RuntimeCell` 这条旧路径，但 `RuntimeProcess` 的大部分运行协议仍明确停留在 `notImplemented(...)`。  
   证据：`packages/kernel/src/interpreter/runtime-process.ts`

2. `Interpreter.observeRunnable(listener)` 目前仍通过 root zone 的 `trackProcess(process)` 获得 runnable 视图；它还没有与 `RuntimeProcess.observe(...)` / `RuntimeScope.observe(...)` 建立新的统一关系。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`

3. `RuntimeScope` 的事件分派口径已经明确，并且当前阶段性实现已经补回 `ScopeRef.exitFuture` settlement、派生 future 在最终收敛时统一以 canceled settle 并结束追踪、cancel 时的 snapshot 编排、membership add/delete 在注册函数中的局部闭合，以及 cleanup task 的显式触发；但 `Interpreter.observeRunnable(listener)` 仍只通过 root zone 的 `trackProcess(process)` 获得 runnable 视图，这条观察面还没有与新的 process / scope 观察口统一。  
   证据：`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/interpreter.ts`

4. failure draft 与 `scope-failed` 的基本接线已经恢复，cleanup task 的 API 形状和 `RuntimeScope` 在 `failed / completed / canceled` 路径中的触发落点也已经落地；但 closing failure 的最终收束时机、`halt(failure)` / `cancel()` 的其余运行协议，以及更多 failure 收束细节仍未实现。  
   证据：`packages/kernel/src/interpreter/interpreter.ts`、`packages/kernel/src/interpreter/runtime-scope.ts`、`packages/kernel/src/interpreter/runtime-process.ts`

---

## 下一步

1. 继续补齐 `RuntimeProcess` 与 `RuntimeScope` 的运行协议，明确 `halt(failure)` 如何使 process 落到 `failed`，以及 `cancel()` 的最终承接语义。
2. 明确 `RuntimeProcess.observe(...)`、`RuntimeScope.observe(...)` 与 `Interpreter.observeRunnable(...)` 之间的长期边界，避免不同层重复承接同一类事件语义。
3. 继续补全 `RuntimeScope` 的收敛判定，明确“尝试进入完成/失败/取消收敛”各自依赖哪些成员状态，以及派生 future 与 failure 收束的最终接线。
4. 重新定义 closing failure 的收集语义与 failure draft 的最终接线位置，并把 cleanup task 在 `enterFailing(...)` 前后各自允许的触发点继续收口成实现内约束；不要重新引入 `onClosing` / `HaltHandler` 这类干预点，也不要再把它当成状态驱动主通道。
5. 继续实现 executor，并在那时确定它如何消费这些观察面；`zone` 继续只作为结构组织层来协作。

---

## 验证

建议验证命令：

```sh
yarn workspace @shajara/kernel typecheck
yarn workspace @shajara/kernel lint
```
