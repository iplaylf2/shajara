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

## 6. 边界层入口

边界层承接宿主 API 与用户侧编排表达：

- 用户侧以 `RuntimeBlueprint<T>`（generator function）书写流程，并通过 `yield*` 组合原语。
- 宿主侧通过 `run` 启动流程，通过 `post` 向 `ScopeHandle` 指向的作用域投递输入。

该层负责把边界入口的调用协议映射到核心层推进协议。

---

## 7. 内部表达与对外表面

内核内部使用代数数据结构表达带内错误与可选值，并将其封装在内核边界内。

- syscall 返回类型参数 `A` 表达对外表面可见的响应类型。
- 内部用于表达与组合的结构不进入 `Plan` 与 `Syscall<A>` 的类型参数。
- 边界层与核心层通过 `then` 与 `terminate` 两条路径闭合推进。
