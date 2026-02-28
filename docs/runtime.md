# khora 运行时

本文档描述 runtime 分层、边界适配协议与推进机制。

## 1. 分层与职责

runtime 由适配层与宿主桥接层构成。`kernel` 作为执行语义单源，负责解释 `Plan`、执行 syscall、维护 Scope 树索引并推进可运行队列；runtime 负责把用户侧 generator 表达映射为 `kernel` 可执行 `Plan`，并在宿主边界承载 `run/createScope/action/sleep/until` 等 API。

## 2. 运行时承载面

运行时承载面的 GADT-like 编码主体是 `Plan<T>`：`ImpurePlan<S, T, E>` 把“当前 syscall 与续延参数类型”绑定在同一节点上（`S extends Syscall`），使 `then` 只接收 `SyscallReturn<S>`。`Syscall` 本身不是 GADT，而是基础对象契约（非泛型）；具体返回类型由各 syscall 自身的 `return` tuple 见证声明，再由 `SyscallReturn<S>` 推导给 `Plan` 的续延。该见证仅用于内核分派与类型对齐，不扩散为对外表面的泛型负担。

## 3. 中止续延

`Impure` 节点包含两条推进路径：`then(value)` 处理 syscall 成功值到达后的推进，`terminate()` 处理等待响应期间发生关闭或打断时的推进。边界层以固定协议触发这两条路径，成功响应推进走 `then`，关闭推进走 `terminate`。失败是否作为带内值建模由具体 syscall 语义决定，执行器异常与不可恢复错误走带外异常路径。

## 4. 推进与调度

执行推进由 `kernel` 完成：`EventQueue` 存放待执行 `Process`，`drive()` 从队列取出一个 `Process` 并解释其 `Plan`，直到遇到阻塞型 syscall 或退出；当队列为空时，运行一次 `Scheduler`，由内核调度策略选择可运行 `Process` 入队。当前版本不经由公开 `Arm` syscall；`Arm` 是否回归公开表面仍待设计决策。runtime 不引入第二执行循环，仅通过执行入口把降解后的 `Blueprint` 提交给 `kernel`。

## 5. 运行期索引

运行期索引由 `kernel` 维护：Scope 树索引（父子关系与状态）、Process 表（当前 `Plan`、退出信息与等待者）、等待登记（`Receive`、`AwaitProcess`、`AwaitScope`）、以及各 Scope 的输入缓冲 `Sink` 与其等待队列。runtime 仅消费这些语义能力，不复制维护同构状态机。

## 6. Scope 树锚点与术语

`Scope` 树锚点由 `kernel` 维护。runtime 通过执行入口消费 `rootScope` 锚点并提交 `launch`；`root scope` 不作为业务收敛目标，不参与常规清理退出流程；`limbo scope` 作为特殊子作用域承接被结构性修剪后的孤儿子树。

运行时边界按统一 `Scope` 对象消费作用域（角色名与句柄名分离：角色用 `*Scope`，句柄用 `*Ref`）：

- `ScopeRef`：结构层引用，不承诺宿主控制能力。
- `IngressScopeRef`：可接收 `post` 输入投递的引用能力。
- `SpawnRef`：编排侧子作用域引用。
- `ExecutionScopeRootRef`：执行入口 root 锚点引用。
- `ExecutionScopeRef`：执行入口 launch 返回引用。

运行时控制面统一使用 `*Ref`。

`Scope` 角色分层与执行入口能力语义定义在 `docs/semantics.md`，runtime 文档不重复展开定义。

## 7. 边界适配协议

边界层承接宿主 API 与用户侧编排表达，并把入口调用协议映射到 `kernel` 推进协议。用户侧以 `RuntimeBlueprint<T>`（generator function）书写流程，通过 `yield*` 组合原语。原语在 `kernel` 侧构造 `Plan<T>`，runtime 侧通过 `liftPlan` 提升为 `RuntimePlan<T>` 供 `yield*` 消费；跨包适配以 `lowerPlan` 为主入口。`run/createScope` 把降解后的蓝图提交到 `kernel` 执行入口；成功响应推进走 `then`，关闭推进走 `terminate`。

宿主输入投递统一通过执行入口 `post` 注入，且目标能力固定为 `IngressScopeRef`；编排侧等待通过 `receive` 配对收敛。`action/sleep/until` 这类宿主桥接操作通过 `spawn/scoped` 的可选 `spec` 把目标作用域声明为 ingress 角色，再在 runtime 内部完成局部类型收敛，不把该收敛约束暴露为用户侧 API 负担。

`self/spawn/join` 涉及的 `SelfDescriptor/SpawnRef/ScopeRef/IngressScopeRef/ExecutionScopeRootRef/ExecutionScopeRef` 等边界类型由 `kernel` 统一定义并导出；runtime 不再定义同语义包装类型，只负责 `Plan <-> RuntimePlan` 的形态适配与宿主 API 组合。

runtime 执行入口以 `runtimeLaunch` 为收敛锚点：该入口负责 `launch`、`RuntimeBlueprint -> Plan` 降解、`LaunchResult<T>` 到 Promise 语义收敛，以及可选 `AbortSignal` 到 `terminate` 的映射。收敛后返回 `StatefulPromise<T>`（`PromiseLike<T> + state()`）并暴露被启动作用域的 `ExecutionScopeRef`。其中 `terminated` 映射为 runtime 侧终止异常，`failure` 映射为 runtime 侧失败异常。

## 8. 术语与方向约束

`lift` 固定表示 `kernel -> runtime` 的语义适配，即把 `Plan<T>` 嵌入为可被 generator `yield*` 消费的 `RuntimePlan<T>`；`lower` 固定表示 `runtime -> kernel` 的语义适配，即把 runtime 侧编排表达降解为 kernel 可执行表达。“上/下”按语义层级而非实现位置命名：kernel 是执行语义单源，runtime 是用户编排与宿主边界表达层。该命名约束用于避免把 runtime 误当作第二语义源，保持 `then/terminate` 的执行真相只在 kernel 收敛。

## 9. 内部表达与对外表面

内核内部可使用代数数据结构表达带内错误与可选值，并将其封装在内核边界内。syscall 的成功响应类型由各 syscall 的 `return` tuple 见证表达；可恢复业务失败是否以带内值表达由具体 syscall 决定，不由 `Plan` 统一强制二元包裹。编排原语在语义上归属于 `Plan` 组合层，不等同于单个 syscall。runtime `contracts` 仅保留 `RuntimePlan/RuntimeBlueprint`，不承载 kernel 语义引用类型定义。对外 API 面定义与使用约束见 `docs/api.md`。

失败通道职责分层固定为：kernel primitive 应优先通过显式、可类型化语义通道表达失败（如生命周期终态或代数结果），而不是依赖宿主异常；runtime 在宿主边界负责把该失败语义收敛为 TS 生态可消费形态（例如抛出错误对象）。该分层用于保持 kernel 语义可组合与可推理，同时维持 runtime API 的使用习惯。

当前编排原语中，“等待并收敛子执行结果”的一组 primitive（`all/join/race/scoped/resource/resumable`）在 kernel 侧以 `Either<KhoraFailure, T>` 表达带内失败；该 `Either` 的来源语义由 kernel `Scope` 角色与 syscall 语义定义（见 `docs/semantics.md`）。runtime primitives 侧通过统一解包步骤把 `Left` 收敛为 `RuntimeKhoraError` 抛出，对用户侧继续维持“成功返回值、失败抛异常”的使用模型。
