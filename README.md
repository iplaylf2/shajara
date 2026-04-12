# shajara

shajara 是一套分成两层的结构化并发实现：

- `@shajara/kernel` 提供 `Wisp`、`Ritual`、`Scope`、`Future`、`Executor` 等底层语义与执行能力。
- `@shajara/host` 把 kernel 语义适配成 generator 风格的宿主 API，提供 `run`、`createScope`、`action`、`sleep`、`until` 和一组可 `yield*` 的原语。

长期文档入口在 [docs/README.md](docs/README.md)。
