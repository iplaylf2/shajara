# khora

khora 是一个并发计算内核，目标是把并发计算的生命周期管理下沉到一组最小机制里。

本仓库处于开发阶段，接口与实现会随重构迭代。

## 文档

- `docs/semantics.md`：语义定义
- `docs/runtime.md`：TypeScript 运行时落地要点
- `docs/api.md`：对外 API 轮廓
- `docs/design-constraints.md`：已确认设计约束（长期稳定）
- `execution.md`：当前迭代状态、阶段与证据（动态快照）
- `apps/example`：`@khora/runtime` 最小调用子包示例
