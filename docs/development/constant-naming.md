# Constant Naming

Literal values used as constants should have one naming style across the repository.

## Literal Constants

When a literal value is bound to a module-level `const` because it names a fixed value,
use `UPPER_SNAKE_CASE`.

Prefer:

```ts
const DEFAULT_QUANTUM_MS = 8;
const MINIMUM_CAPACITY = 0;
const EXPLORER_ROUTE_SEGMENT = "explorer";
```

Avoid:

```ts
const defaultQuantumMs = 8;
const minimumCapacity = 0;
const explorerRouteSegment = "explorer";
```

Apply the same style to private and exported constants.

This is only a naming constraint. It does not require every literal to be extracted into a
constant.
