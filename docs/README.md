# 文档索引

## 文档职责

| 文档                         | 职责                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| [semantics.md](semantics.md) | 基础语义文档。定义 `Wisp`、`Sigil`、`Scope`、`Process`、`Future`、失败与收敛规则。          |
| [executor.md](executor.md)   | 执行环境文档。内容包括 `Executor`、`ExecutionScopeRef`、`launch(...)`、`Pacer` 与自治治理。 |
| [host.md](host.md)           | 宿主适配文档。内容包括 `@shajara/host` 的 generator 风格 API、错误映射与宿主接入。          |
| [api.md](api.md)             | 发布接口文档。内容包括两个包的导出面、导入路径、返回值形状与公开入口。                      |

## 依赖关系

文档依赖方向如下：

```text
semantics -> executor -> host -> api
```

- [semantics.md](semantics.md) 给出基础概念。
- [executor.md](executor.md) 建立在 `semantics.md` 之上。
- [host.md](host.md) 建立在 `semantics.md` 与 `executor.md` 之上。
- [api.md](api.md) 汇总公开接口与调用结果。

## 阅读顺序

1. [semantics.md](semantics.md)
2. [executor.md](executor.md)
3. [host.md](host.md)
4. [api.md](api.md)

## 概念落点

同一概念在不同文档中分别落在不同切面：

- 在 `semantics.md` 中，概念按语义定义出现。
- 在 `executor.md` 中，概念按执行环境与治理责任出现。
- 在 `host.md` 中，概念按宿主适配与边界语义出现。
- 在 `api.md` 中，概念按公开接口与调用结果出现。

## 核心术语

下列术语用于区分几类相近但不同的概念：

- “入口”指一段可从外部启动的运行边界，例如 `launch(...)`、`run(...)` 与 `createScope().run(...)`。
- “收敛”指 future 或 scope 进入最终结果。
- “关闭”只用于 scope 生命周期，以及 `open`、`closing`、`closed` 这组状态。
- “失败”指失败结果或失败收敛；“强制失败”只指运行时直接把 scope 推入失败收敛路径。
- “取消”只指 `canceled` 路径。
- “仲裁”只用于 `reaper` 对处于 `closing` 状态的 scope 的治理决策。
