# khora Execution Doc

## 1. 当前快照

- Current Phase: **Build — Make it work**
- Baseline Docs: `README.md`, `docs/semantics.md`, `docs/runtime.md`, `docs/api.md`

## 2. 阶段看板

- Build: 当前阶段。聚焦把“语义 -> 运行时 -> API”主路径打通，形成最小可运行闭环。
- Prove: 仅保留方向，待主路径打通后补充一致性与回归验证。
- Operate: 仅保留方向，待出现可执行运行时后再做跨边界联调。
- Ship: 仅保留方向，待 API 与行为稳定后再收敛交付材料。

## 3. 当前现实与证据

- 仓库当前处于开发中且接口/实现会继续迭代。Evidence: `README.md:5`
- 当前已形成三份设计基线文档（语义、运行时、API）。Evidence: `README.md:9`, `README.md:10`, `README.md:11`
- 语义层已定义执行循环、终止语义与 syscall 协议，可作为实现先验约束。Evidence: `docs/semantics.md:81`, `docs/semantics.md:108`, `docs/semantics.md:175`
- 运行时层已定义核心层/边界层分工与 `then/terminate` 双路径协议。Evidence: `docs/runtime.md:5`, `docs/runtime.md:6`, `docs/runtime.md:24`, `docs/runtime.md:29`
- API 层已定义宿主入口与编排原语边界。Evidence: `docs/api.md:40`, `docs/api.md:68`, `docs/api.md:104`
- 仓库工作区目前仅声明 `internal/*`，可见代码面主要是工程预设，尚未出现运行时实现包。Evidence: `package.json:3`, `package.json:4`, `internal/presets/package.json:2`

## 4. 相对设计基线的增量

> 仅记录相对设计基线的新事实与影响，不复述基线内容。

### 4.1 增量一：文档先行，运行时实现骨架未落仓

- Impact: 本轮 Build 应先创建可编译的最小运行时包与类型骨架，否则无法进入 Prove。
- Evidence: `README.md:5`, `package.json:3`

### 4.2 增量二：终止与收敛语义已定义，但缺少实现证据

- Impact: Build 阶段优先实现最小状态机与事件队列推进，再补复杂收敛细节。
- Evidence: `docs/semantics.md:21`, `docs/semantics.md:120`, `docs/semantics.md:156`

### 4.3 增量三：工作区策略更新为边界先定

- Impact: 从起始阶段即保留 `runtime` 与 `kernel` 两个包边界，避免后续从单包内回拆边界。
- Evidence: `docs/api.md:40`, `docs/runtime.md:5`

### 4.4 增量四：Build 执行策略更新为 runtime 先行

- Impact: 初始迭代先聚焦 API 主路径，`kernel` 在早期可为空包或占位导出，但依赖方向保持 `runtime -> kernel`。
- Evidence: `docs/api.md:40`, `docs/runtime.md:5`

## 5. Build 阶段执行切片

### 5.1 Slice B1：建立双工作区边界

- Output: 新建 `packages/runtime` 与 `packages/kernel`，包名分别为 `@khora/runtime` 与 `@khora/kernel`。
- Done when: 根工作区配置可解析两个包，工具链可识别并解析依赖方向。

### 5.2 Slice B2：runtime 先行落 API 主路径

- Output: 在 `@khora/runtime` 提供 `createRuntime`、`run`、`post` 的最小壳层与 `yieldNow` 最小可运行路径。
- Done when: 可运行一个最小 Flow 并返回宿主结果。

### 5.3 Slice B3：kernel 占位并保持边界

- Output: 在 `@khora/kernel` 提供空骨架或占位导出，保证 `@khora/runtime` 对其形成稳定依赖。
- Done when: 边界存在且依赖方向稳定；不要求该阶段完成内核行为实现。

## 6. 后续阶段方向

- Prove: 建立语义对齐用例矩阵，优先覆盖 `Halt`、`AwaitScope`、未处理 `Fault`。
- Operate: 建立宿主事件注入与调度推进的端到端回放脚本。
- Ship: 输出稳定 API 文档与迁移说明。
