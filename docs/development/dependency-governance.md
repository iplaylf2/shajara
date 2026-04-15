# Dependency Governance

Imports should express structural boundaries clearly enough that dependency analysis
reflects the actual shape of the project.

## Boundary Expression

When a directory exposes symbols through `index.ts`, treat that file as the directory
boundary and import through it.

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

The shorter form may resolve through root-level barrel files such as `src/primitives.ts`
or `src/sigils.ts`, lifting the dependency edge to the project root and distorting the
directory graph.

`#/foo` and `#/foo/index` are not interchangeable when the project contains both:

- a root-level barrel such as `src/foo.ts`
- a directory entry such as `src/foo/index.ts`

Use `#/foo/index` when the dependency is on the `foo/` directory surface. Use `#/foo`
only when the dependency is intentionally on the root-level barrel itself.

## Leaf Files

If a symbol is already exported by a directory `index.ts`, import it through that
directory entry instead of targeting a leaf file directly.

Prefer:

```ts
import { wait } from "#/sigils/index";
```

Avoid:

```ts
import { wait } from "#/sigils/wait";
```

If a file is not reachable through the directory `index.ts`, treat it as local
implementation by default rather than something to depend on across directory boundaries.

## Rules

- Use `./`-based relative imports, not the `#/` alias, for files in the same directory or
  a child directory.
- Omit `.ts` and `.js` suffixes in internal TypeScript imports.
- Prefer `#/area/index` over `#/area` when `#/area` may resolve through a root-level
  barrel.
- Prefer directory entry points over leaf files when both are available.
- Avoid mixing import levels for the same dependency area.

## Dependency Analysis

Directory-level cycle detection is only useful when import paths describe real ownership
boundaries.

Imports that route through root barrels or bypass declared directory surfaces make the
graph harder to trust:

- false cycles can appear
- real boundaries become less visible
- refactors become harder to reason about

Use `yarn depcruise` to check directory-level circular dependencies. The script is defined
in the repository toolchain.

This check helps keep dependency direction accurate and legible across the project.
