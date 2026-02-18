# khora 运行时

本文档描述 runtime 分层、边界适配协议与推进机制。

## 1. 分层与职责

runtime 由适配层与宿主桥接层构成。`kernel` 作为执行语义单源，负责解释 `Plan`、执行 syscall、维护 Scope 树索引并推进可运行队列；runtime 负责把用户侧 generator 表达映射为 `kernel` 可执行 `Plan`，并在宿主边界承载 `run/createScope/action/sleep/until` 等 API。

## 2. 运行时承载面

运行时承载面以 GADT 方式表达类型关系：`Syscall<A>` 把 syscall 与返回类型 `A` 绑定，`Plan<T>` 把计算与最终结果类型 `T` 绑定，`Impure` 在类型上同时量化 `A` 与 `T`，使续延只接收本次 syscall 对应的返回类型。内核内部可以使用“返回类型见证”把 syscall 构造子与 `A` 对齐；该见证只用于内核分派与类型对齐，不参与对外表面的类型参数。

## 3. 中止续延

`Impure` 节点包含两条推进路径：`then(response)` 处理带内响应到达后的推进，`terminate()` 处理等待响应期间发生关闭或打断时的推进。边界层以固定协议触发这两条路径，响应推进走 `then`，关闭推进走 `terminate`。

## 4. 推进与调度

执行推进由 `kernel` 完成：`EventQueue` 存放待执行 `Process`，`drive()` 从队列取出一个 `Process` 并解释其 `Plan`，直到遇到阻塞型 syscall 或退出；当队列为空时，运行一次 `Scheduler`，由 `Scheduler` 通过 `Arm` 将目标 `Process` 放入队列。runtime 不引入第二执行循环，仅通过执行入口把降解后的 `Blueprint` 提交给 `kernel`。

## 5. 运行期索引

运行期索引由 `kernel` 维护：Scope 树索引（父子关系与状态）、Process 表（当前 `Plan`、退出信息与等待者）、等待登记（`Receive`、`AwaitProcess`、`AwaitScope`）、输入缓冲 `Sink` 与其等待队列，以及 Capability 到目标 Scope Portal 的解析索引。runtime 仅消费这些语义能力，不复制维护同构状态机。

## 6. Scope 树锚点

运行时维护单例 `Scope` 树，存在全局 `root scope` 作为锚点。`root scope` 不作为业务收敛目标，不参与常规清理退出流程；`limbo scope` 作为特殊子作用域承接被结构性修剪后的孤儿子树。

## 7. 边界适配协议

边界层承接宿主 API 与用户侧编排表达，并把入口调用协议映射到 `kernel` 推进协议。用户侧以 `RuntimeBlueprint<T>`（generator function）书写流程，通过 `yield*` 组合原语。原语在 `kernel` 侧构造 `Plan<T>`，runtime 侧通过 `liftPlan` 提升为 `RuntimePlan<T>` 供 `yield*` 消费；跨包适配以 `lowerPlan` 为主入口，`lowerBlueprint` 作为蓝图入口薄包装。`run/createScope` 把降解后的蓝图提交到 `kernel` 执行入口；响应推进走 `then`，关闭推进走 `terminate`，输入投递通过 runtime 内部宿主适配层完成。

## 8. 术语与方向约束

`lift` 固定表示 `kernel -> runtime` 的语义适配，即把 `Plan<T>` 嵌入为可被 generator `yield*` 消费的 `RuntimePlan<T>`；`lower` 固定表示 `runtime -> kernel` 的语义适配，即把 runtime 侧编排表达降解为 kernel 可执行表达。“上/下”按语义层级而非实现位置命名：kernel 是执行语义单源，runtime 是用户编排与宿主边界表达层。该命名约束用于避免把 runtime 误当作第二语义源，保持 `then/terminate` 的执行真相只在 kernel 收敛。

## 9. 内部表达与对外表面

内核内部使用代数数据结构表达带内错误与可选值，并将其封装在内核边界内。syscall 返回类型参数 `A` 表达对外表面可见的响应类型，内部用于表达与组合的结构不进入 `Plan` 与 `Syscall<A>` 的类型参数。编排原语在语义上归属于 `Plan` 组合层，不等同于单个 syscall。对外 API 面定义与使用约束见 `docs/api.md`。
