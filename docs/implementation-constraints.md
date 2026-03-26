# 实现约束

本文档记录实现设计过程中需要持续提醒、且会直接影响落地方式的约束条例。

本文档只保留实现阶段容易漂移、并直接影响落地方式的约束。

当实现约束因设计调整而变化时，须在同一变更中同步更新对应设计文档与本文档。

---

## 1. 边界与依赖

- host 负责 generator 编排与宿主桥接。
- 边界引用类型中，`ScopeRef` 与 `SelfHandle` 由 kernel 单源定义并导出；`ExecutionScopeRef` 作为 executor 衍生句柄对 host 暴露，host 不重复定义同语义包装。
- 依赖方向固定为 `executor → contracts/sigils`。
- `Processor`、`ExecutionScopeRef` 这类 executor 衍生句柄落在 `executor.ts`。
- cleanup 注册以 `Ritual` 为锚点，并归属于当前 process：同一条启动入口注册一次 cleanup。

## 2. 异常策略

- kernel 包实现以失败退出为主。
- 实现中通常不围绕运行路径添加异常捕获；异常默认视为运行时已经进入失败状态。
- 一旦出现未预期异常，语义预期是整个运行时失败退出。

## 3. 类型与命名治理

- kernel 公开类型参数不使用语义兜底默认值（如 `= unknown`）来隐式放宽约束。
- kernel 语义层优先使用 `Relic`（复数 `Relics`）命名结果语义；host 宿主承载层保留 `Return`（复数 `Returns`）；运行时值字段统一命名 `value`。
- kernel 中优先使用 `*Relic` 表达语义留存；`*Exit` 仅用于生命周期终态，不可混用。
- 角色命名使用 `*Scope`，控制面句柄使用 `*Ref`，消息/查找/future capability 令牌使用 `*Key`。
- 字段全必填时使用 `*Config`，不使用 `*Options`。
- 创建时固定、供运行时读取的对象声明信息使用 `*Descriptor`；不要以 `metadata` 或泛化的 `policy` 命名这类核心语义载体。
- 在 `Interpreter` 中，`resolve` / `touch` 这类名字保留给协议级 callout：`resolve` 表达从 `ref/key` 进入 runtime object，`touch` 表达新 runtime object 已被解释环境承认；不要用只强调类型技巧的名字弱化这层语义。
- 显式类型 shape 若已是稳定语义概念，应由对应语义宿主提供命名 alias；若只服务于某个实现边界，则 alias 应贴近该边界承载体。
- 不要恢复 `ScopeSpec` 或 `standard / supervisor / governor` 这类 scope taxonomy 作为 kernel 设计基线；若未来需要调度/回收治理扩展，应直接围绕 executor / governance 边界重新设计。

## 4. 实现落位

| 路径                                  | 职责                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| `kernel/src/contracts/`               | 核心类型契约                                                 |
| `kernel/src/contracts/wisp.ts`        | `Wisp/Ritual` 单源                                           |
| `kernel/src/contracts/scope.ts`       | `ScopeRef` 单源                                              |
| `kernel/src/contracts/process.ts`     | `ProcessRef` 单源                                            |
| `kernel/src/sigils/branch.ts`         | `branch` 与 `ScopeDescriptor/FailureMode` 单源               |
| `kernel/src/sigils/spawn.ts`          | `spawn` 与 `ProcessDescriptor/CompletionMode` 单源           |
| `kernel/src/contracts/message-key.ts` | `MessageKey` 单源                                            |
| `kernel/src/contracts/future-key.ts`  | `FutureKey/FutureSettleKey/FutureHandle` 单源                |
| `kernel/src/sigils/`                  | sigil 声明 + index                                           |
| `kernel/src/sigils.ts`                | sigil 公共入口                                               |
| `kernel/src/primitives/`              | 原语 + index                                                 |
| `kernel/src/interpreter/`             | `Interpreter` 单源；解释器局部 alias 贴近对应 runtime 承载体 |
| `kernel/src/interpreter.ts`           | `Interpreter` 公共入口                                       |
| `kernel/src/executor/`                | 执行入口契约与 executor 衍生句柄（如 `ExecutionScopeRef`）   |
| `host/src/contracts/`                 | host 公共契约（`RiteCoroutine/RiteRoutine`）                 |
| `host/src/primitives/`                | 原语 + index                                                 |
| `host/src/operations/`                | 宿主操作 + index                                             |
| `host/src/operations-kit/`            | 操作共享支撑                                                 |
| `host/src/boundary/`                  | host↔kernel 边界共享支撑                                     |
| `host/src/errors/`                    | 错误类型                                                     |

- kernel 对外导出采用根入口分组导出；不要再保留 `@shajara/kernel/scopes` 这类为历史 taxonomy 服务的子路径。

## 5. 示例约束

- example 以 generator 形态演示 host 用户侧写法，仅依赖 host 公共入口与 primitives，不触达 host 内部桥接或 kernel 细节。
