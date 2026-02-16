# khora API

## 1. API 分组

### 1.1 宿主 API

宿主 API 用于承接运行时与宿主世界的交互边界。

- 启动一段 `RuntimeBlueprint`
- 将宿主侧事件投递到某个 `Scope`

### 1.2 编排原语 API

编排原语用于在 `RuntimeBlueprint` 中表达并发意图。

- 原语以 `yield*` 方式组合
- 原语对应意图级操作
- 原语不暴露宿主边界

---

## 2. 用户侧计算单元

### 2.1 RuntimeBlueprint

`RuntimeBlueprint<A>` 是用户侧的编排单元。

- 以 generator function 书写
- 通过 `yield*` 组合原语
- 通过 `return` 产生结果

---

## 3. 宿主 API

宿主 API 仅包含最小边界入口。

### 3.2 run

启动一段 `RuntimeBlueprint` 并在宿主侧等待其结果。

### 3.3 post

向某个 `Scope` 投递输入。

- 作为宿主侧入口

`post` 的定位方式通过宿主持有的 `ScopeHandle` 完成；宿主不需要也不暴露 portal 调用权。

---

## 4. 编排原语 API

原语按职责分为两类：构造并发形态的原语，以及配套的基础原语。

### 4.1 并发构造原语

并发构造原语以“结构”为单位封装内核交互序列，产出可组合的句柄或结果。

- `fork` 在当前 `Scope` 内引入并行分支
- `spawn` 创建子 `Scope` 并在其中引入并行分支
- `all` 聚合等待多个分支
- `race` 选择最先完成者，并触发其余分支的收敛
- `supervise` 提供监督语义与结构性收敛边界

### 4.2 基础原语

基础原语提供并发结构所需的必要操作。

- `awaitProcess` 观察一个分支的退出形态
- `awaitScope` 观察一个子 `Scope` 的退出或被剪枝
- `terminate` 触发分支收敛
- `halt` 触发当前 `Scope` 的终止级联
- `receive` 从 `Sink` 获取输入
- `cede` 协作式让权

### 4.3 上下文原语

- `bind` 在当前 `Scope` 绑定值
- `resolve` 沿祖先链解析值

### 4.4 自省原语

- `self` 读取当前执行实体的自省信息

---

## 5. 使用约束

- 用户侧通过 `yield* 原语(...)` 进行交互与编排
- 用户侧不直接接触内核契约细节
- 宿主侧不参与并发编排
