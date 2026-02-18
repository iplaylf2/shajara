# khora Execution Doc

## 1. 当前快照

Current Phase 为 **Build — Make it work**。当前基线文档为 `docs/README.md`、`docs/semantics.md`、`docs/runtime.md`、`docs/api.md` 与 `docs/design-constraints.md`。本轮文档治理属于 Build 阶段内的短暂停靠，用于降低后续实现迭代的沟通成本，不改变主阶段判断。

## 2. 阶段看板

| Phase   | 当前定位                                                               |
| ------- | ---------------------------------------------------------------------- |
| Build   | 当前主阶段；实现工作持续推进中，本轮插入文档治理以清理职责与语义边界。 |
| Prove   | 当前未作为主阶段，仅保留后续验证方向。                                 |
| Operate | 当前未作为主阶段，仅保留后续联调方向。                                 |
| Ship    | 非当前阶段；仅保留收敛导向，不展开执行细节。                           |

## 3. 当前现实与证据（Build）

1. `docs/` 已建立职责路由入口，并明确各文档“负责/不负责”边界。Evidence: `docs/README.md`。
2. API 文档已收敛到“对外 API 面与使用约束”，运行时分层和语义信息改为引用关系。Evidence: `docs/api.md`。
3. runtime 文档已收敛到“分层、适配协议、推进机制与术语方向”，不再承载逐项 API 清单。Evidence: `docs/runtime.md`。
4. 设计约束文档已固化“静态文档与动态执行文档”的边界规则。Evidence: `docs/design-constraints.md`。

## 4. 相对设计基线增量（仅记录 delta）

### 4.1 增量：文档入口从分散说明升级为集中路由

Impact: `docs/` 下职责边界可在单点检索，降低跨文档重复叙述。Evidence: `docs/README.md`。

### 4.2 增量：API 与 runtime 文档边界重新切分

Impact: `docs/api.md` 聚焦对外表面，`docs/runtime.md` 聚焦内部模型与适配协议，同题复述显著减少。Evidence: `docs/api.md`, `docs/runtime.md`。

### 4.3 增量：execution 文档回到动态快照角色

Impact: 执行文档回到“Build 主阶段 + 文档治理停靠”的快照表达，不复写静态设计基线。Evidence: `docs/execution.md`。

## 5. 当前阶段执行切片（Build）

| Slice                   | Status      | Output                                                                         | Evidence                                                                               |
| ----------------------- | ----------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| B1 文档职责路由建立     | Completed   | `docs/README.md` 已作为职责入口并集中维护文档导航。                            | `docs/README.md`                                                                       |
| B2 API/runtime 文档去重 | Completed   | `docs/api.md` 与 `docs/runtime.md` 已按职责边界重排并互相引用。                | `docs/api.md`, `docs/runtime.md`                                                       |
| B3 约束与执行文档对齐   | Completed   | `docs/design-constraints.md` 与 `docs/execution.md` 已对齐“静态 vs 动态”边界。 | `docs/design-constraints.md`, `docs/execution.md`                                      |
| B4 实现迭代主线恢复     | In Progress | 文档治理完成后恢复 runtime 实现主线推进。                                      | `packages/runtime/src/adapter/plan-lower.ts`, `packages/runtime/src/operations/run.ts` |

## 6. 后续方向

Build 阶段将继续推进 runtime 实现闭环，并把文档治理作为伴随约束而非独立目标。Prove 阶段将补一轮文档与行为一致性检查。Operate 阶段将持续保持 `docs/execution.md` 只记录阶段状态与证据。
