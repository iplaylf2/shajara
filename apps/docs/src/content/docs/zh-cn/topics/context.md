---
title: scope context
description: 在 scope 上绑定值，并从 routine 代码中读取最近可见的绑定。
---

有些值属于当前 scope 的运行环境，而不是每个 routine 的业务参数。context 把这种值绑定
到 scope 链上，让后续 routine 可以读取最近可见的绑定，而不用把参数层层传下去。

## 在当前 scope 绑定值

用 `contextKey(...)` 创建 key，再在 routine 代码中为这个 key 绑定值。同一个 scope 中
后续的 lookup 可以读到这个绑定。

```ts
import { contextKey } from "@shajara/host";
import { bind, lookup } from "@shajara/host/primitives";

const requestIdKey = contextKey<string>();

function* handleRequest(requestId: string) {
  yield* bind(requestIdKey, requestId);

  return yield* writeAuditLine();
}

function* writeAuditLine() {
  const [hasRequestId, requestId] = yield* lookup(requestIdKey);

  return hasRequestId ? `request ${requestId}` : "request unknown";
}
```

同一个 key 用来绑定和读取这个值。它的类型参数携带值类型，所以
`lookup(requestIdKey)` 返回 `Presence<string>`。

如果当前 scope 看不到这个 key 的绑定，`lookup(...)` 返回 `[false]`。如果有可见值，
它返回 `[true, value]`。

## 通过 child scope 继承

child scope 可以看到祖先 scope 的绑定。同一个 key 如果在更近的 scope 中重新绑定，会在
这个 child scope 内遮蔽祖先绑定。

```ts
import { contextKey } from "@shajara/host";
import { bind, branch, lookup } from "@shajara/host/primitives";

const themeKey = contextKey<"light" | "dark">();

function* readTheme() {
  const [hasTheme, theme] = yield* lookup(themeKey);

  return hasTheme ? theme : "light";
}

function* renderPage() {
  yield* bind(themeKey, "light");

  const mainTheme = yield* branch(function* renderMain() {
    return yield* readTheme(); // "light"
  });

  const previewTheme = yield* branch(function* renderPreview() {
    yield* bind(themeKey, "dark");

    return yield* readTheme(); // "dark"
  });

  const pageTheme = yield* readTheme(); // "light"

  return { mainTheme, pageTheme, previewTheme };
}
```

`renderMain` 这个 child scope 会继承 `renderPage` 的 `"light"`。`renderPreview` 这个
child scope 在自己的 scope 上绑定 `"dark"`，所以 lookup 会读到更近的值。这个 child
scope 返回后，parent scope 仍然读到自己的 `"light"` 绑定。

## 移除本地绑定

`unbind(...)` 会移除当前 scope 中某个 key 的绑定。它不会移除祖先 scope 的绑定，因此
lookup 可以回退到最近的剩余绑定。

```ts
import { contextKey } from "@shajara/host";
import { bind, branch, lookup, unbind } from "@shajara/host/primitives";

const modeKey = contextKey<"published" | "draft">();

function* readMode() {
  const [hasMode, mode] = yield* lookup(modeKey);

  return hasMode ? mode : "published";
}

function* renderArticle() {
  yield* bind(modeKey, "published");

  return yield* branch(function* renderDraftPreview() {
    yield* bind(modeKey, "draft");
    yield* unbind(modeKey);

    return yield* readMode(); // "published"
  });
}
```

child scope 先用 `"draft"` 遮蔽 parent scope 的绑定。`unbind(modeKey)` 之后，这个
本地绑定被移除，后续 lookup 会看到 parent scope 的 `"published"` 绑定。

## 选择适合 context 的值

context lookup 会沿 scope 链读取当前可见的绑定。结果是 optional，因为绑定可能不存在。

适合放进 context 的值，通常已经属于当前 scope 的环境：请求标识、追踪句柄、本地配置，
或其他会被多段 routine 读取的值。
