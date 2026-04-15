# Dependency Governance

Imports should make dependency boundaries legible. These rules keep module relationships
explicit enough for structural checks to be enforced consistently.

## Boundary Expression

Choose import paths by the boundary they are meant to express.

When a dependency is on a directory surface, use a path that points to that surface
clearly. When a dependency is on a root-level barrel, use the barrel path. When multiple
path shapes could resolve to different surfaces, choose the one that makes the target
boundary explicit.

Prefer:

```ts
import { future } from "#/primitives/index";
import { wait } from "#/sigils/index";
```

Avoid:

```ts
import { future } from "#/primitives";
import { wait } from "#/sigils";
```

Avoid the shorter form when it would resolve through a different surface, such as a
root-level barrel file.

## Leaf Files

If a symbol is already exported by a directory entry, import it through that entry rather
than reaching directly into a leaf file.

Prefer:

```ts
import { wait } from "#/sigils/index";
```

Avoid:

```ts
import { wait } from "#/sigils/wait";
```

If a file is not reachable through the directory entry, treat it as local implementation
by default. Keep `index.ts` focused on exports, and keep implementation in leaf files
unless there is a clear reason not to.

## Rules

- Use `./`-based relative imports, not the `#/` alias, for files in the same directory or
  a child directory.
- Omit `.ts` and `.js` suffixes in internal TypeScript imports.
- Prefer the import form that makes the dependency target unambiguous when multiple path
  shapes are available.
- Prefer directory entry points over leaf files when both are available.
- Keep `index.ts` focused on exports unless there is a strong reason to do otherwise.

## Dependency Analysis

Use `yarn depcruise` to enforce directory-level dependency discipline across all
directories under the target source tree.

Treat the result as a structural check on the boundaries expressed by the code. When it
reveals a problem, fix the import path or the module structure so the dependency is stated
at the correct boundary, rather than weakening the rule or working around the check.
