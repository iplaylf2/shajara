# khora 文档分工

本文档是 `docs/` 的导航页，只提供职责定位与阅读入口。

## 1. 文档地图

| 文档                         | 主要职责                                                           | 不负责                                |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| `docs/semantics.md`          | kernel 执行语义单源，包括对象模型、执行循环、收敛与 syscall 协议。 | runtime 对外 API 设计与迭代阶段状态。 |
| `docs/runtime.md`            | runtime 分层、边界适配协议、推进机制与术语方向约束。               | 逐项列出用户 API 与迭代进度。         |
| `docs/api.md`                | 对外 API 面、公开入口与使用约束。                                  | kernel 内部语义推导与运行期实现细节。 |
| `docs/design-constraints.md` | 跨文档稳定约束与变更协议。                                         | 阶段性执行状态与待办清单。            |
| `docs/execution.md`          | 当前阶段、完成状态、阻力与证据（动态快照）。                       | 稳定设计基线与长期约束定义。          |

## 2. 治理入口

规范性约束与变更协议见 `docs/design-constraints.md`，迭代期动态状态见 `docs/execution.md`。

## 3. Runtime 变更后的联动校验

runtime API 或语义变更时，按以下顺序确认联动一致性：

1. 先更新 `docs/api.md` 与 `docs/runtime.md`，确保对外表面和边界语义描述一致。
2. 同步调整 `apps/example`，保证示例仅使用当前公开 API（避免引用已移除或重命名能力）。
3. 在仓库根目录执行 `yarn typecheck` 与 `yarn build`，以 `@khora/example` 作为 runtime 对外契约回归样例。
