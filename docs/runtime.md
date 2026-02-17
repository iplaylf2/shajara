# khora 运行时

## 1. 分层与职责

- 核心层负责解释 `Plan`、执行 syscall、维护运行期索引、推进可运行队列。
- 边界层负责把用户侧 generator 表达映射为核心层的 `Plan` 推进。

---

## 2. 运行时承载面

运行时承载面以 GADT 的方式表达类型关系。

- `Syscall<A>` 将 syscall 与其返回类型 `A` 绑定。
- `Plan<T>` 将计算与其最终结果类型 `T` 绑定。
- `Impure` 在类型上同时量化 `A` 与 `T`，使续延只接收本次 syscall 对应的返回类型。

内核内部可以使用“返回类型见证”把 syscall 的构造子与 `A` 对齐。该见证只用于内核分派与类型对齐，不参与对外表面的类型参数。

---

## 3. 中止续延

`Impure` 节点包含两条推进路径：

- `then(response)` 处理带内响应到达后的推进。
- `terminate()` 处理等待响应期间发生关闭或打断时的推进。

边界层以固定协议触发这两条路径：响应推进走 `then`，关闭推进走 `terminate`。

---

## 4. 推进与调度

核心层围绕一个可运行队列推进。

- `EventQueue` 存放待执行的 `Process`。
- `drive()` 从队列取出一个 `Process` 并解释其 `Plan`，直到遇到阻塞型 syscall 或退出。
- 当队列为空时，运行一次 `Scheduler`。`Scheduler` 通过 `Arm` 将目标 `Process` 放入队列。

推进由宿主提供的 `enqueue(drive)` 触发。产生新可运行实体或唤醒等待者的路径会安排一次推进。

---

## 5. 运行期索引

核心层维护以下索引以支撑推进与唤醒：

- Scope 树索引，包含父子关系与状态。
- Process 表，包含当前 `Plan`、退出信息与等待者。
- 等待登记，覆盖 `Receive`、`AwaitProcess`、`AwaitScope`。
- 输入缓冲 `Sink` 与其等待队列。
- Capability 解析，定位到目标 Scope 的 Portal。

---

## 6. Scope 树锚点

- 运行时维护单例 `Scope` 树，存在全局 `root scope` 作为锚点。
- `root scope` 不作为业务收敛目标，不参与常规清理退出流程。
- `limbo scope` 作为特殊子作用域承接被结构性修剪后的孤儿子树。

---

## 7. 边界层入口

边界层承接宿主 API 与用户侧编排表达：

- 用户侧以 `RuntimeBlueprint<T>`（generator function）书写流程，并通过 `yield*` 组合原语。
- 原语在 kernel 侧构造 `Plan<T>`，runtime 侧通过 `liftPlan` 将其提升为 `RuntimePlan<T>` 供 `yield*` 消费。
- 用户侧并发创建以 `spawn` 为结构入口，不直接暴露 process 级创建原语。
- 用户侧观察与控制以 `Scope` 为粒度，不暴露 process 级句柄。
- 用户侧通过 `spawn` 句柄进行 `join/terminate`，不透出底层 scope 结构字段。
- 用户侧结构性监督以 `scoped + resumable` 组合表达：`scoped` 提供收敛与捕获边界，`resumable` 声明可恢复传播点；`scoped` 的捕获 handler 只接收 `resumable` 子孙路径的异常。
- generator 边界只返回成功值；失败路径由运行时映射为异常抛出并沿 `yield*` 传播。
- 宿主侧 `run` 在全局 `root scope` 下创建并启动一次运行作用域，并等待其结果。
- 宿主侧可通过 `createScope` 创建托管作用域；该托管作用域同样挂在全局 `root scope` 下，并通过 `scope.run/scope.halt`（或 `scope[Symbol.asyncDispose]`）进行生命周期治理。
- 在 `blueprint/plan` 中通过 `yield*` 使用的入口属于上下文敏感 API，其作用域归属由当前执行上下文决定。
- 上下文敏感 API 若创建作用域，该作用域附着在当前上下文作用域树分支。
- `action` 以 `yield* action<T>()` 的形式在上下文内产出 `{ scope, resolve, reject }`，用于宿主侧结算回填。
- `run` 的失败作为当前调用失败返回调用方，`root scope` 继续作为生命周期锚点。
- `scope.run` 失败返回当前运行失败；托管作用域关闭由 `scope.halt`（或 `scope[Symbol.asyncDispose]`）承接，当前阶段通过 `scope.state` 观察，关闭完成结果通过 `scope.closed` 观察。
- 输入投递通过 runtime 内部宿主适配层完成。

该层负责把边界入口的调用协议映射到核心层推进协议。

---

## 8. 内部表达与对外表面

内核内部使用代数数据结构表达带内错误与可选值，并将其封装在内核边界内。

- syscall 返回类型参数 `A` 表达对外表面可见的响应类型。
- 内部用于表达与组合的结构不进入 `Plan` 与 `Syscall<A>` 的类型参数。
- 编排原语在语义上归属于 `Plan` 组合层，不等同于单个 syscall。
- 边界层与核心层通过 `then` 与 `terminate` 两条路径闭合推进。
