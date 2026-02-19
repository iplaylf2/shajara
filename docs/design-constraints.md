# khora 设计约束（固化版）

本文档用于固化已确认的设计约束，避免在后续迭代中反复偏移。

## 1. 文档职责

静态设计文档集合为 `docs/*.md`（不含 `docs/execution.md`），用于描述目标设计与稳定边界。`docs/README.md` 维护静态设计文档集合与 `docs/execution.md` 的职责路由。`docs/execution.md` 是动态执行文档，记录当前进度、未完成项、阶段状态与证据。进度态信息不进入静态设计文档集合，稳定约束不在 `docs/execution.md` 作为主叙述重复。

## 2. kernel 与 runtime 边界

`@khora/kernel` 承载 GADT 契约表达（如 `Plan`、`Syscall`、`Result`）。`@khora/runtime` 是封装层，负责协议转换与宿主边界，不把 generator 细节下沉到 kernel。桥接逻辑仅在 runtime 内部存在，不作为 example 的直接依赖。

术语方向固定如下：`lift` 表示 `kernel -> runtime` 适配，`lower` 表示 `runtime -> kernel` 适配。“上/下”按语义层级定义，kernel 是执行语义单源，runtime 是编排表达层。

## 3. primitive 约束

kernel primitive 直接产出 `Plan<T>`，表达一次性消费的计划片段，不默认承载可重放模板语义。`yield*` 消费的是 `RuntimePlan<T>`。primitive 可由一条或多条底层步骤组成，不假设“一原语 = 一指令”。

## 4. 目录与结构边界

`packages/runtime/src/primitives` 是原语集合目录，该目录仅放 `index.ts` 与具体原语文件。`packages/runtime/src/operations` 是宿主操作集合目录，该目录仅放 `index.ts` 与具体 operation 文件；operation 共享支撑代码放在 `packages/runtime/src/operations-kit`。runtime 契约类型默认收敛在单文件 `packages/runtime/src/contracts.ts`，避免在无明确增长需求时提前拆目录。runtime 行为支撑代码按职责拆分为独立文件（如 `adapter/plan-lower.ts`、`adapter/plan-lift.ts`），不挂在集合目录下。

## 5. runtime 对外表面

runtime 对外导出 runtime 语义类型（如 `RuntimeBlueprint`、`RuntimePlan`、`RuntimePrimitive`）与公开宿主入口（`run`、`createScope`），但不引导用户直接构造 kernel 层细节。输入投递能力与 resolver 组装属于 runtime 内部宿主适配层，不作为用户直接调用 API。

宿主入口 `run/createScope` 的作用域挂载在全局 root 锚点下；`yield*` 语境中的上下文敏感入口沿当前执行上下文作用域分支绑定。`action` 作为上下文敏感宿主入口，以 `yield* action<T>()` 返回 `RuntimeAction<T>`，不作为顶级直接调用能力。

kernel 中 `Fork` 属于 syscall 语义，编排层不直接暴露 `fork` 原语；创建并发流程统一经 `spawn` 进入可控 `Scope`。`resource` 属于编排层资源作用域构造原语，调用方等待 `provide(value)` 返回首个值，资源作用域在 `provide` 后继续挂起并在父 scope 回收时清理。

用户侧生命周期控制粒度固定为 `Scope`，process 级句柄与 `awaitProcess` 不进入编排层公开表面。`spawn` 返回值作为编排层唯一的作用域控制句柄，不在公开 API 暴露其内部结构字段（如 `scope`）。作用域等待/控制 API 采用 `join/terminate` 对称命名，`join` 仅返回成功值，失败通过异常传播。`suspend` 表达持续挂起语义，恢复路径由父 scope 回收清理阶段触发，且以失败传播进入清理流程。

结构性监督语义通过 `scoped + resumable` 建模，不再以 `supervise` 作为公开编排原语。`scoped` 的第二参数是 `resumable` 路径异常的捕获 handler，不表示 `scoped` 对任意异常的本地兜底。编排层公开原语暂不包含输入读取能力（`receive` 不在公开 primitives 表面）。

## 6. example 约束

example 以 generator 形态演示 runtime 的用户侧写法，且仅依赖 runtime 公共入口与 primitives，不触达 runtime 内部桥接细节。

## 7. 变更协议

当需要突破上述约束时，必须在同一变更中同时更新本文档、对应静态设计文档（`docs/*.md`，不含 `docs/execution.md`）以及 `docs/execution.md`（变更原因、阶段影响、证据）。
