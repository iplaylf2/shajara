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
- Follow the workspace's module-resolution contract for file extensions. NodeNext sources
  use `.js` in relative imports, directly executed TypeScript tooling uses `.ts`, and
  bundler-managed sources may omit extensions.
- Prefer the import form that makes the dependency target unambiguous when multiple path
  shapes are available.
- Prefer directory entry points over leaf files when both are available.
- Keep `index.ts` focused on exports unless there is a strong reason to do otherwise.

## Dependency Analysis

Use `pnpm depcruise` to analyze every workspace's configured source roots. The command
applies dependency-cruiser's `recommended-strict` rules for file-level cycles, unresolved
imports, deprecated dependencies, and package declaration problems. It also checks for
cycles between directories, treating each directory as an architectural boundary.

Dependency-cruiser cannot resolve every TypeScript `#` alias or Astro virtual module in this
per-workspace analysis, so `pnpm typecheck` owns those checks. Orphan detection is disabled
here and owned by Knip, which accounts for type-only and cross-workspace consumers. Both
checks run alongside `pnpm depcruise` in continuous integration.

Treat cycle reports as evidence that an import path or module boundary needs correction.
Resolve other violations at their owning boundary—for example, fix an unresolved import or
correct the relevant package declaration—rather than weakening the rule.
