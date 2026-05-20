---
title: Context
description: Bind values on a scope and read the nearest visible binding from routine code.
---

shajara context is a scope-chain binding table. A context key gives a binding its typed
identity, `bind(...)` records a value on the current scope, and `lookup(...)` searches
from the current scope toward its ancestors. Use context when a value should live in the
current scope's environment instead of being passed through every routine call.

## Bind a Value in the Current Scope

Create a key with `contextKey(...)`, then bind a value for that key inside routine code.
Any later lookup in the same scope can read that binding.

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

The same key is used to bind and read the value. Its type parameter carries the value
type, so `lookup(requestIdKey)` returns `Presence<string>`.

If the current scope cannot see a binding for that key, `lookup(...)` returns `[false]`.
If a value is visible, it returns `[true, value]`.

## Inherit Through Child Scopes

A child scope can see bindings from its ancestors. A nearer binding for the same key
shadows the ancestor binding inside that child scope.

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

The `renderMain` child scope inherits `"light"` from `renderPage`. The `renderPreview`
child scope binds `"dark"` locally, so its lookup resolves to the nearer value. After
that child scope returns, the parent scope still sees its own `"light"` binding.

## Remove a Local Binding

`unbind(...)` removes the current scope's binding for a key. It does not remove an
ancestor binding, so lookup can fall back to the nearest remaining binding.

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

The child scope first shadows the parent binding with `"draft"`. After `unbind(modeKey)`,
that local binding is gone, and a later lookup sees the parent scope's `"published"`
binding.

## Choose Scope Environment Values

Context lookup reads the currently visible binding along the scope chain. The result is
optional because the binding may be absent.

Choose context for values that already belong to the current scope's environment:
request identifiers, tracing handles, local configuration, or another value read by
several routines.
