---
title: Getting Started
description: Run the documentation site locally and inspect the initial structure.
---

## Run locally

Install workspace dependencies from the repository root:

```sh
yarn install
```

Start the site:

```sh
yarn workspace @shajara/site dev
```

## Structure

- `src/content/docs`: Starlight content collection.
- `src/pages/playground.astro`: a small Astro page that mounts a Solid island.
- `src/components/solid-counter.tsx`: the first interactive Solid component.

## Next steps

- Replace placeholder docs with package-level guides.
- Move shared examples into reusable Astro or Solid components when needed.
