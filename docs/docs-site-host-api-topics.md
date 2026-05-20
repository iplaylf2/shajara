# Host API 专题写作方向

本文档仅记录当前 Git 分支上的文档站写作方向，分支合并前移除即可。

在 `guides` 之外，可以新增一组专题文章，覆盖 `@shajara/host` 和
`@shajara/host/primitives` 中尚未充分展开的 API。

这组文章不应成为第二套 guide，也不应写成 reference 清单。每篇文章围绕一个 API 家族
展开，说明它解决什么问题、边界在哪里，以及读者应如何判断使用场景。

目录路由使用 `topics`，与现有 `guides` 平级：

- `apps/docs/src/content/docs/en/topics/*.md`
- `apps/docs/src/content/docs/zh-cn/topics/*.md`
- `apps/docs/site/sidebar.ts` 新增 `Topics` / `专题` 分组

优先专题：

- `channels`：`channel(...)`、`send(...)`、`receive(...)`、`trySend(...)`、
  `tryReceive(...)`、`close(...)`、`feed(...)`
- `future-results`：`future(...)`、`settle(...)`、`settleError(...)`、`poll(...)`、
  `wait(...)`
- `recovery-boundaries`：`guard(...)`、`resumable(...)`
- `scoped-context`：`contextKey(...)`、`bind(...)`、`lookup(...)`、`unbind(...)`
- `autonomous-work`：`autonomy(...)`

术语可以直接使用 shajara 的 API 名和运行时概念。需要避免的是机械列 API，而不是避免
术语本身。
