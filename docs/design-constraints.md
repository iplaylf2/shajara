# khora 设计约束（固化版）

本文档用于固化已确认的设计约束，避免在后续迭代中反复偏移。

## 1. 文档职责

- `docs/*.md` 是静态设计文档，描述目标设计与稳定边界。
- `execution.md` 是动态执行文档，记录当前进度、未完成项、阶段状态与证据。
- 进度态信息不进入 `docs/*.md`。

## 2. kernel 与 runtime 边界

- `@khora/kernel` 承载 GADT 契约表达（如 `Plan`、`Syscall`、`Result`）。
- `@khora/runtime` 是封装层，负责协议转换与宿主边界，不把 generator 细节下沉到 kernel。
- 桥接逻辑仅在 runtime 内部存在，不作为 example 的直接依赖。

## 3. primitive 约束

- primitive 是 thunk 语义（蓝图语义），不是已执行的实例。
- `yield*` 消费的是 `RuntimePlan<T>`。
- primitive 可由一条或多条底层步骤组成；不假设“一原语 = 一指令”。

## 4. 目录与结构边界

- `packages/runtime/src/primitives` 是原语集合目录。
- 该目录仅放 `index.ts` 与具体原语文件。
- runtime 共享支撑代码放在边界内的 `...kit` 目录（当前为 `runtime-kit`），不挂在 `primitives` 集合目录下。

## 5. runtime 对外表面

- runtime 对外导出 runtime 语义类型（如 `RuntimeBlueprint`、`RuntimePlan`、`RuntimePrimitive`）与公开启动入口（`run`）。
- runtime 对外不引导用户直接构造 kernel 层细节。
- 输入投递能力与 resolver 组装属于 runtime 内部宿主适配层，不作为用户直接调用 API。
- kernel 中 `Fork` 属于 syscall 语义；编排层不直接暴露 `fork` 原语，创建并发流程统一经 `spawn` 进入可控 `Scope`。
- 用户侧生命周期控制粒度固定为 `Scope`；process 级句柄与 `awaitProcess` 不进入编排层公开表面。
- `spawn` 返回值作为编排层唯一的作用域控制句柄；不在公开 API 暴露其内部结构字段（如 `scope`）。
- 结构性监督语义通过 `scoped + resumable` 建模；不再以 `supervise` 作为公开编排原语。
- `scoped` 的第二参数是 `resumable` 路径异常的捕获 handler，不表示 `scoped` 对任意异常的本地兜底。
- 编排层公开原语暂不包含输入读取能力（`receive` 不在公开 primitives 表面）。

## 6. example 约束

- example 以 generator 形态演示 runtime 的用户侧写法。
- example 仅依赖 runtime 公共入口与 primitives，不触达 runtime 内部桥接细节。

## 7. 变更协议

当需要突破上述约束时，必须在同一变更中同时更新：

1. 本文档（设计约束变化）
2. 对应设计文档（`docs/*.md`）
3. `execution.md`（变更原因、阶段影响、证据）
