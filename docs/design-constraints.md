# 设计约束

本文档固化跨层稳定约束。突破约束时，须在同一变更中同步更新本文档与相关设计文档。

---

## 1. kernel / host 边界

- kernel 承载 `Wisp`、`Sigil` 与类型化续延。host 负责 generator 适配与宿主桥接，不将 generator 细节下沉到 kernel。
- cleanup 注册以 `Ritual` 为锚点：同一条启动入口注册一次 cleanup。
- 边界引用类型（`ScopeRef`、`ExecutionScopeRef`、`SpawnDescriptor`、`SelfDescriptor`）由 kernel 单源定义并导出，host 直接消费，不重复定义。
- 依赖方向：`executor → contracts/sigil`，反向不允许。
- executor 侧派生结果句柄不反向定义 kernel 基础概念；kernel 级 `future` 语义单源属于 `contracts/sigils/primitives`。
- 术语方向：`lift` = kernel → host，`lower` = host → kernel。
- 命名：角色用 `*Scope`，控制面句柄用 `*Ref`，selector / lookup token / future capability 用 `*Key`。

## 2. 类型契约

- kernel 公开类型参数不使用语义兜底默认值（如 `= unknown`）来隐式放宽约束。
- 后缀约束：kernel 中优先使用 `*Relic` 表达语义留存；`*Exit` 仅用于生命周期终态，不可混用。
- 泛型命名分层：kernel 语义层优先使用 `Relic`（复数 `Relics`），host 宿主承载层保留 `Return`（复数 `Returns`）；运行时值字段统一命名 `value`。
- 角色 spec 的配置命名遵循语义准确性：字段全必填时使用 `*Config`，不使用 `*Options`。
- 治理角色统一为 `GovernorScope`，并通过显式 handler 契约承载策略，不以内置固定策略替代；具体签名单源定义于 `semantics.md`。

## 3. 失败通道

- kernel primitive 通过显式代数通道（`Either<Failure, T>`）表达失败，不依赖宿主 `throw`。
- `FutureKey` 与 `FutureResolverKey` 的结果域固定为 `Either<Failure, T>`；future 不引入第二条独立失败通道。
- `halt` 的失败分层固定为：Process 失败 → 所属 Scope 失败；父 Scope 是否失败由 Scope 角色语义决定。
- host 在 primitive 适配边界统一解包 `Either`，将 `Left` 收敛为 `ShajaraError` 抛出。
- `Failure` 由 kernel 定义，host 包装为 `ShajaraError`（`Error` 子类），不向用户暴露 kernel 失败类型。
- `AwaitProcess/AwaitScope` 仅观察终态，不承担失败拦截；失败上传由 Scope 角色语义决定。

## 4. primitive 约束

- kernel primitive 直接产出 `Wisp<T>`，表达一次性消费的显现片段。
- primitive 可由多条底层步骤组成，不假设"一原语 = 一指令"。
- primitive 层 `spawn` 暴露 `options`（sum type）而非 `spec`：当前支持 `supervisor`（边界收敛）与 `recovery`（`resumable` 委派恢复点）；`ScopeSpec` 不向 primitive 调用点直接暴露。
- host 的 `spawn` 对 `recovery` handler 采用 host 语义（返回值=恢复成功，抛异常=恢复失败），并在适配边界转换为 kernel 所需失败通道形状。
- 编排层不暴露 `fork` 原语；`fork` 仅作为 primitive 内部组合步骤使用。
- 用户侧生命周期粒度为 Scope，`process` 级句柄不进入公开表面。
- `suspend` 恢复路径由父 scope 回收阶段以失败传播触发。

## 5. 执行入口契约

- `Executor.rootScope` 为只读 root 锚点值（`ExecutionScopeRef`）。
- `launch` 接受 `ExecutionScopeRef`，返回 `LaunchHandle<T>`。
- `LaunchHandle` 暴露 `result: LaunchFuture<T>` 与 `state()`。
- `LaunchResult<T>` 为三态 sum type（`success | failure | terminated`）。
- host 通过 `result.onResult(...)` 做结果收敛，不退化为 `PromiseLike` 绑定。
- `send` 目标为 `ScopeRef` + `MessageKey<T>`；`terminate` 目标为 `ExecutionScopeRef`（含 root）。

## 6. 目录结构

| 路径                                  | 职责                                         |
| ------------------------------------- | -------------------------------------------- |
| `kernel/src/contracts/`               | 核心类型契约                                 |
| `kernel/src/contracts/wisp.ts`        | `Wisp/Ritual` 单源                           |
| `kernel/src/contracts/scope.ts`       | `ScopeRef/ScopeSpec` 单源                    |
| `kernel/src/contracts/message-key.ts` | `MessageKey` 单源                            |
| `kernel/src/contracts/future-key.ts`  | `FutureKey/FutureResolverKey` 单源           |
| `kernel/src/sigils/`                  | sigil 声明 + index                           |
| `kernel/src/sigils.ts`                | sigil 公共入口                               |
| `kernel/src/primitives/`              | 原语 + index                                 |
| `kernel/src/scopes/`                  | 角色条目                                     |
| `kernel/src/executor.ts`              | 执行入口契约与作用域执行状态                 |
| `host/src/contracts/`                 | host 公共契约（`RiteCoroutine/RiteRoutine`） |
| `host/src/primitives/`                | 原语 + index                                 |
| `host/src/operations/`                | 宿主操作 + index                             |
| `host/src/operations-kit/`            | 操作共享支撑                                 |
| `host/src/boundary/`                  | host↔kernel 边界共享支撑                     |
| `host/src/errors/`                    | 错误类型                                     |

kernel 对外导出采用根入口分组导出，`@shajara/kernel/scopes` 为 scope spec 公开子路径。

## 7. example 约束

example 以 generator 形态演示 host 用户侧写法，仅依赖 host 公共入口与 primitives，不触达 host 内部桥接或 kernel 细节。
