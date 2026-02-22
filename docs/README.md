# khora 文档分工

本文档是 `docs/` 的导航页，只提供职责定位与阅读入口。

## 1. 文档地图

| 文档                         | 主要职责                                                           | 不负责                                       |
| ---------------------------- | ------------------------------------------------------------------ | -------------------------------------------- |
| `docs/semantics.md`          | kernel 执行语义单源，包括对象模型、执行循环、收敛与 syscall 协议。 | runtime 对外 API 设计与迭代阶段状态。        |
| `docs/runtime.md`            | runtime 分层、边界适配协议、推进机制与术语方向约束。               | 逐项列出用户 API 与迭代进度。                |
| `docs/api.md`                | 对外 API 面、公开入口与使用约束。                                  | kernel 内部语义推导与运行期实现细节。        |
| `docs/design-constraints.md` | 跨文档稳定约束与变更协议。                                         | 阶段性执行状态与待办清单。                   |
| `docs/execution.md`          | 当前阶段代码状态、完成度、阻力与实现证据（动态快照）。             | 稳定设计基线、长期约束定义与文档完成度追踪。 |

## 2. 治理入口

规范性约束与变更协议见 `docs/design-constraints.md`，迭代期动态状态见 `docs/execution.md`。

## 3. 去重规则

术语与语义定义只在其单源文档出现；其余文档只做职责内引用，不重复给出同义定义：

1. `Scope` 角色分层、执行入口能力视图与 syscall 语义定义只在 `docs/semantics.md`。
2. `docs/runtime.md` 只描述 runtime 分层、适配协议与边界消费方式。
3. `docs/api.md` 只描述对外 API 形状与使用约束。
4. `docs/design-constraints.md` 只固化约束与变更协议，不复制语义正文。
5. `docs/execution.md` 只记录阶段代码状态、增量与实现证据，不承载稳定设计定义与文档完成度追踪。

## 4. Scope 语义入口

`Scope` 角色分层（`SchedulerScope` / `ReaperScope` / `IngressScope` / `PortalScope`）与执行入口能力视图（`ExecutionScopeRoot` / `ExecutionScope`）定义以 `docs/semantics.md` 为单源；跨文档稳定约束见 `docs/design-constraints.md`。

## 5. Runtime 变更后的联动校验

runtime API 或语义变更时，按以下顺序确认联动一致性：

1. 先更新 `docs/api.md` 与 `docs/runtime.md`，确保对外表面和边界语义描述一致。
2. 同步调整 `apps/example`，保证示例仅使用当前公开 API（避免引用已移除或重命名能力）。
3. 在仓库根目录执行 `yarn typecheck` 与 `yarn build`，以 `@khora/example` 作为 runtime 对外契约回归样例。
