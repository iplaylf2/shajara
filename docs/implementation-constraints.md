# 实现约束

本文档记录实现设计过程中需要持续提醒、且会直接影响落地方式的约束条例。

它不定义 kernel 语义，也不承载 host API 设计；相关基线分别以 `semantics.md`、`host.md` 与 `api.md` 为单源。本文档只保留那些在实现阶段容易漂移、但又不应回流为新设计分支的约束。

当实现约束因设计调整而变化时，须在同一变更中同步更新对应设计文档与本文档。

---

## 1. 边界与依赖

- host 负责 generator 编排与宿主桥接，不将 generator 细节下沉到 kernel。
- 边界引用类型（`ScopeRef`、`ExecutionScopeRef`、`SelfDescriptor`）由 kernel 单源定义并导出，host 直接消费，不重复定义同语义包装。
- 依赖方向固定为 `executor → contracts/sigils`；kernel 基础契约不反向依赖 executor。
- executor 侧派生句柄不反向定义 kernel 基础概念；`Processor`、`ExecutionScopeRef` 这类 executor 衍生句柄落在 `executor.ts`，不回流到 `contracts/`。
- cleanup 注册以 `Ritual` 为锚点：同一条启动入口注册一次 cleanup。

## 2. 类型与命名治理

- kernel 公开类型参数不使用语义兜底默认值（如 `= unknown`）来隐式放宽约束。
- kernel 语义层优先使用 `Relic`（复数 `Relics`）命名结果语义；host 宿主承载层保留 `Return`（复数 `Returns`）；运行时值字段统一命名 `value`。
- kernel 中优先使用 `*Relic` 表达语义留存；`*Exit` 仅用于生命周期终态，不可混用。
- 角色命名使用 `*Scope`，控制面句柄使用 `*Ref`，消息/查找/future capability 令牌使用 `*Key`。
- 字段全必填时使用 `*Config`，不使用 `*Options`。

## 3. 实现落位

| 路径                                  | 职责                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `kernel/src/contracts/`               | 核心类型契约                                                            |
| `kernel/src/contracts/wisp.ts`        | `Wisp/Ritual` 单源                                                      |
| `kernel/src/contracts/scope.ts`       | `ScopeRef/ScopeSpec` 单源                                               |
| `kernel/src/contracts/message-key.ts` | `MessageKey` 单源                                                       |
| `kernel/src/contracts/future-key.ts`  | `FutureKey/FutureSettleKey` 单源                                        |
| `kernel/src/sigils/`                  | sigil 声明 + index                                                      |
| `kernel/src/sigils.ts`                | sigil 公共入口                                                          |
| `kernel/src/primitives/`              | 原语 + index                                                            |
| `kernel/src/scopes/`                  | 角色条目                                                                |
| `kernel/src/executor.ts`              | 执行入口契约与 executor 衍生句柄（如 `ExecutionScopeRef`、`Processor`） |
| `host/src/contracts/`                 | host 公共契约（`RiteCoroutine/RiteRoutine`）                            |
| `host/src/primitives/`                | 原语 + index                                                            |
| `host/src/operations/`                | 宿主操作 + index                                                        |
| `host/src/operations-kit/`            | 操作共享支撑                                                            |
| `host/src/boundary/`                  | host↔kernel 边界共享支撑                                                |
| `host/src/errors/`                    | 错误类型                                                                |

- kernel 对外导出采用根入口分组导出，`@shajara/kernel/scopes` 为 scope spec 公开子路径。

## 4. 示例约束

- example 以 generator 形态演示 host 用户侧写法，仅依赖 host 公共入口与 primitives，不触达 host 内部桥接或 kernel 细节。
