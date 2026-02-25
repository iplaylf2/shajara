# khora 设计约束（固化版）

本文档用于固化已确认的设计约束，避免在后续迭代中反复偏移。

## 1. 文档职责

静态设计文档集合为 `docs/*.md`（不含 `docs/execution.md`），用于描述目标设计与稳定边界。`docs/README.md` 维护静态设计文档集合与 `docs/execution.md` 的职责路由。`docs/execution.md` 是动态执行文档，记录当前进度、未完成项、阶段状态与证据。进度态信息不进入静态设计文档集合，稳定约束不在 `docs/execution.md` 作为主叙述重复。

静态设计文档不承载项目状态叙述（如“当前阶段”“进行中”“已完成”），仅描述稳定语义与约束。`docs/execution.md` 只记录实现现实：代码状态、测试结果、运行行为与阻塞项。文档修订本身不作为阶段完成依据；若文档变更影响实现，应以对应代码/测试/运行证据入账。

## 2. kernel 与 runtime 边界

`@khora/kernel` 承载 GADT 契约表达（如 `Plan`、`Syscall` 与类型化续延）。`@khora/runtime` 是封装层，负责协议转换与宿主边界，不把 generator 细节下沉到 kernel。桥接逻辑仅在 runtime 内部存在，不作为 example 的直接依赖。`Impure.then` 仅承接 syscall 成功值；可恢复业务失败是否以带内值表达由具体 syscall 语义决定，不在 `Plan` 层统一强制二元包裹。

作用域角色分层、执行入口能力语义与 syscall 语义定义以 `docs/semantics.md` 为单源；本文件不重复语义正文，只保留跨文档稳定约束。

边界引用类型（如 `ExecutionScopeRootRef`、`ExecutionScopeRef`、`ScopeRef`、`IngressScopeRef`、`SpawnRef`、`SelfDescriptor`）由 `kernel` 单源定义并导出。runtime 直接消费这些类型，不在 runtime 侧重复定义同语义包装类型。

命名约束固定为：语义角色使用 `*Scope`（不带 `Ref`），控制面能力句柄使用 `*Ref`。

结果类型后缀约束固定为：

- `*Return` 仅用于“调用返回载荷”语义（call-return payload），即某个调用/协议在返回通道中的值形状。
- `*Exit` 仅用于“生命周期终态”语义（lifecycle termination），即实体如何结束（如 `completed/failed/terminated`）。
- 这两类后缀不可混用：生命周期终态类型不得命名为 `*Return`，普通调用返回载荷类型不得命名为 `*Exit`。

作用域引用约束固定为：`ScopeRef` 与 `ScopeSpec` 基础类型定义在 `packages/kernel/src/contracts/scope.ts`；`IngressScopeRef` 定义在 `packages/kernel/src/scopes/ingress.ts`；`ExecutionScopeRootRef` 与 `ExecutionScopeRef` 作为执行入口控制引用类型定义在 `packages/kernel/src/executor.ts`。

依赖方向约束固定为：`executor -> contracts/syscalls`。`syscalls/contracts` 不反向依赖 `executor` 承载共同约束类型。

执行入口契约固定为：`Executor.rootScope` 是只读 root 锚点值（`ExecutionScopeRootRef`）；`launch` 接受 `ExecutionScopeRootRef | ExecutionScopeRef` 并返回 `LaunchHandle<T>`（含 `LaunchHandle<never>`）；`post` 的目标类型为 `IngressScopeRef`，`terminate` 的目标类型为 `ExecutionScopeRef`。`LaunchHandle` 暴露 `result: LaunchFuture<T>` 与 `state()`；`LaunchResult<T>` 采用三态 sum type（`success | failure | terminated`），runtime 通过 `result.onResult(...)` 做结果收敛，不把该 future 协议退化为 `PromiseLike` 绑定。

作用域与执行器解耦约束固定为：`Scope` 是语义对象，不以内核执行器实现形态命名。设计允许存在多个 executor 实例，只要 `ScopeRef`/`ExecutionScopeRef` 的身份与可见性规则保持一致。

术语方向固定如下：`lift` 表示 `kernel -> runtime` 适配，`lower` 表示 `runtime -> kernel` 适配。“上/下”按语义层级定义，kernel 是执行语义单源，runtime 是编排表达层。

## 3. primitive 约束

kernel primitive 直接产出 `Plan<T>`，表达一次性消费的计划片段，不默认承载可重放模板语义。`yield*` 消费的是 `RuntimePlan<T>`。primitive 可由一条或多条底层步骤组成，不假设“一原语 = 一指令”。

kernel primitive 的失败语义约束固定为：实现不得直接依赖宿主 `throw` 作为主要失败通道。primitive 应优先通过显式、可类型化的语义通道表达失败（例如生命周期终态或代数容器），由 runtime 边界决定是否将该失败降解为宿主异常。

`spawn/scoped` 可接收可选 `spec`；`spec` 由 `@khora/kernel/scopes` 的角色工厂生成，不在调用点直接构造固有字面量。该 `spec` 形状属于 primitive 编排策略层，不改写 syscall 基线语义。

## 4. 目录与结构边界

`packages/runtime/src/primitives` 是原语集合目录，该目录仅放 `index.ts` 与具体原语文件。`packages/runtime/src/operations` 是宿主操作集合目录，该目录仅放 `index.ts` 与具体 operation 文件；operation 共享支撑代码放在 `packages/runtime/src/operations-kit`。runtime 对外契约类型默认收敛在单文件 `packages/runtime/src/contracts.ts`，避免在无明确增长需求时提前拆目录；边界内部约束类型定义应靠近提出约束的实现位置。runtime 行为支撑代码按职责拆分为独立文件（如 `adapter/plan-lower.ts`、`adapter/plan-lift.ts`），不挂在集合目录下。

`packages/kernel/src/contracts/plan.ts` 是 kernel `Plan/Blueprint` 契约单源。`packages/kernel/src/contracts/scope.ts` 是 `ScopeRef/ScopeSpec` 基础类型单源；`packages/kernel/src/scopes` 仅承载角色条目，`packages/kernel/src/scopes-kit` 承载该边界共享支撑代码。`packages/kernel/src/executor.ts` 仅承载执行入口契约与作用域执行状态约束；与具体 syscall 语义直接绑定的类型（如 `SpawnRef`、`SelfDescriptor`）定义应靠近 `packages/kernel/src/syscalls`。`packages/kernel/src/syscalls` 目录仅承载 syscall 声明文件与 `index.ts`；非 syscall 的共享约束类型放在 `packages/kernel/src/contracts`。kernel 对外导出采用根入口分组导出，不单独暴露 `@khora/kernel/syscalls` 子路径。

## 5. runtime 对外表面

runtime 对外导出 runtime 语义类型（如 `RuntimeBlueprint`、`RuntimePlan`、`RuntimeScope`）与公开宿主入口（`run`、`createScope`），但不引导用户直接构造 kernel 层细节。输入投递能力与 resolver 组装属于 runtime 内部宿主适配层，不作为用户直接调用 API。

宿主输入投递与等待配对通过 runtime 内部适配完成（`post` 注入与 `receive` 等待），不在 runtime 公开 primitives 表面额外暴露输入读取入口。
runtime 在宿主输入投递点消费 `IngressScopeRef` 约束；必要的局部类型收敛只允许出现在 runtime 内部适配层，不外溢到用户侧 API。

宿主入口 `run/createScope` 的作用域挂载在全局 root 锚点下；`yield*` 语境中的上下文敏感入口沿当前执行上下文作用域分支绑定。`action` 作为上下文敏感宿主入口，以 `yield* action<T>()` 返回 `RuntimeAction<T>`，不作为顶级直接调用能力。

kernel 中 `Fork` 属于 syscall 语义，编排层不直接暴露 `fork` 原语；创建并发流程统一经 `spawn` 进入可控 `Scope`。`resource` 属于编排层资源作用域构造原语，调用方等待 `provide(value)` 返回首个值，资源作用域在 `provide` 后继续挂起并在父 scope 回收时清理。

用户侧生命周期控制粒度固定为 `Scope`，process 级句柄与 `awaitProcess` 不进入编排层公开表面。`spawn` 返回值作为编排层唯一的作用域控制句柄，不在公开 API 暴露其内部结构字段（如 `scope`）。作用域等待/控制 API 采用 `join/terminate` 对称命名，`join` 仅返回成功值，失败通过异常传播。`suspend` 表达持续挂起语义，恢复路径由父 scope 回收清理阶段触发，且以失败传播进入清理流程。

结构性监督语义通过 `scoped + resumable` 建模，不再以 `supervise` 作为公开编排原语。`scoped` 的第二参数是 `resumable` 路径异常的捕获 handler，不表示 `scoped` 对任意异常的本地兜底。编排层公开原语暂不包含输入读取能力（`receive` 不在公开 primitives 表面）。

## 6. example 约束

example 以 generator 形态演示 runtime 的用户侧写法，且仅依赖 runtime 公共入口与 primitives，不触达 runtime 内部桥接细节。

## 7. 变更协议

当需要突破上述约束时，必须在同一变更中同时更新本文档、对应静态设计文档（`docs/*.md`，不含 `docs/execution.md`）以及 `docs/execution.md`（变更原因、阶段影响、证据）。
