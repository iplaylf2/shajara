# khora API

## 1. API 分组

### 1.1 用户编排 API（Public Composition API）

用户编排 API 用于应用侧表达与启动流程。

- 启动一段 `RuntimeBlueprint`
- 在蓝图内通过 primitives 组合并发意图

### 1.2 运行时宿主适配 API（Internal Host Adapter API）

运行时宿主适配 API 用于 runtime 内部桥接宿主回调与执行推进。

- 在 `run` 边界内组装完成/失败/输入投递等适配能力
- 负责把宿主输入映射到运行时作用域输入通道
- 不作为应用侧直接调用入口

---

## 2. 用户侧计算单元

### 2.1 RuntimeBlueprint

`RuntimeBlueprint<A>` 是用户侧的编排单元。

- 以 generator function 书写
- 通过 `yield*` 组合原语
- 通过 `return` 产生结果

---

## 3. 用户编排 API

用户编排 API 仅保留最小公开入口。

### 3.2 run

启动一段 `RuntimeBlueprint` 并在宿主侧等待其结果。

### 3.3 action

创建一个宿主侧可结算能力记录，返回 `{ scope, resolve, reject }`。

- 与 `run` 同层，属于用户编排入口 API，不属于 primitives。
- 底层可借助 runtime 内部宿主适配能力（例如输入投递）完成结算推进。

### 3.4 sleep

以毫秒为单位等待一段宿主时间：`sleep(milliseconds): RuntimePlan<void>`。

### 3.5 until

接受一个 promise thunk：`until(thunk)`，返回一个可被 `join` 的 `scope` 句柄。

---

## 4. 编排原语 API

原语按职责分为两类：构造并发形态的原语，以及配套的基础原语。

### 4.1 并发构造原语

并发构造原语以“结构”为单位封装内核交互序列，产出可组合的句柄或结果。

- `spawn` 创建子 `Scope` 并在其中引入并行分支
- `resource` 创建资源作用域；调用方等待 `provide(value)` 的首个值作为返回，资源作用域在 `provide` 后继续挂起等待父 scope 回收
- `all` 聚合等待多个分支
- `race` 选择最先完成者，并触发其余分支的收敛
- `scoped` 创建子 `Scope` 并立即等待其收敛；第二参数 `onResumableError` 是捕获 handler，不是 `scoped` 自身异常兜底
- `resumable` 在 `scoped` 的 body 中声明可恢复边界；只有被 `resumable` 标记子孙作用域抛出的异常会进入祖先 `scoped` 的 `onResumableError` 路径

### 4.2 基础原语

基础原语提供并发结构所需的必要操作。

- `join` 等待一个 `spawn` 句柄对应作用域成功完成并返回其结果值
- `terminate` 触发一个 `spawn` 句柄对应作用域的收敛
- `halt` 触发当前 `Scope` 的终止级联
- `cede` 协作式让权
- `suspend` 使当前执行体持续挂起，直到父 scope 在回收清理阶段以失败路径唤醒

### 4.3 上下文原语

- `bind` 在当前 `Scope` 绑定值
- `lookup` 沿祖先链解析值

### 4.4 自省原语

- `self` 读取当前执行实体的自省信息

---

## 5. 运行时宿主适配 API（内部）

- 该层承接完成、失败、输入投递等宿主适配职责
- 该层定义由 runtime 内部持有，不从公共入口直接导出
- 该层仅在 runtime 包内使用

---

## 6. 使用约束

- 用户侧通过 `yield* 原语(...)` 进行交互与编排
- 原语调用后直接得到可 `yield*` 的 `RuntimePlan`，不使用 `yield* 原语(...)()` 形式
- 用户侧不直接接触内核契约细节
- 宿主输入投递经 runtime 内部适配层完成
- 用户侧可观察与控制的生命周期粒度是 `Scope`，不是 `Process`
- 用户侧通过 `spawn` 返回句柄承接作用域观察与控制，不透出底层 scope 结构字段
- 编排层暂不暴露输入读取原语（如 `receive`）
- generator 侧只通过正常返回值表达成功结果，失败由 runtime 以异常抛出传播（不通过返回值编码失败态）
