# shajara

shajara 由两层构成：

- **`@shajara/kernel`** — 纯代数执行内核，以 `Wisp`（free monad over `Sigil`）为承载面，定义 Scope 树、Process 生命周期与 sigil 协议。
- **`@shajara/host`** — 面向用户的 generator 编排层，桥接 kernel 语义并提供宿主 API（`run`、`createScope`、`action`、`sleep`、`until`）。

## 文档索引

| 文档                                                           | 职责                                                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [semantics.md](semantics.md)                                   | kernel 语义单源：核心语义、对象模型、执行循环、收敛与 sigil 协议。                                         |
| [api.md](api.md)                                               | 用户侧公开 API 与使用约束。                                                                                |
| [interpreter.md](interpreter.md)                               | `Interpreter` 的职责、驱动模型、runnable 驱动接面，以及 `RuntimeScope` / `RuntimeProcess` 的合理依赖边界。 |
| [executor.md](executor.md)                                     | `executor` 的环境治理职责，以及它如何建立在 `Interpreter` 之上。                                           |
| [host.md](host.md)                                             | host 分层架构与 kernel 适配协议。                                                                          |
| [implementation-constraints.md](implementation-constraints.md) | 实现期约束、命名治理与结构落位。                                                                           |
| [execution.md](execution.md)                                   | 当前实现状态快照，以及实现与文档基线之间仍存在的偏差。                                                     |

## 建议阅读顺序

按文档依赖方向阅读时，建议：

1. `semantics.md`：先看 kernel 语义定义。
2. `api.md`：再看用户侧公开 API 与使用模型。
3. `interpreter.md`：查看解释器对象的职责、驱动模型与接口边界。
4. `executor.md`：查看执行环境如何建立在 `Interpreter` 之上。
5. `host.md`：查看 host 暴露的适配面与边界。
6. `implementation-constraints.md`：最后看实现阶段必须持续遵守的约束。

`execution.md` 记录实现状态，可在需要了解当前实现进展时单独阅读。

## 语义单源

每个概念只在一处文档定义，其余文档仅引用：

- `wisp / sigil / echo / resonance / relic / ritual`、Scope / Process 语义、sigil 语义、执行循环 → `semantics.md`
- `Interpreter` 的对象设计、步进模型与接口语义 → `interpreter.md`
- `executor` 的环境治理职责与对 `Interpreter` 的依赖关系 → `executor.md`
- host 层架构与适配方向 → `host.md`
- 用户可见 API 形状 → `api.md`
- 实现期约束 → `implementation-constraints.md`
