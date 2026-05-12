# Export TSDoc

TSDoc on library exports should help callers at the import site. Keep it close to the
published declaration and avoid documenting local implementation details.

## Export Surface

Comment declarations that are part of a package export surface. If a declaration should
not be public, fix the export path instead of documenting it as public API.

For re-exported concepts, put caller-facing comments on the declaration that reaches the
published `.d.ts` output. Internal helper functions do not need TSDoc just because they
support an exported primitive.

## Callable Declarations

For functions, methods, and callable type aliases, use a short summary plus signature
tags when they add caller-facing meaning:

```ts
/**
 * Opens a current-scope channel.
 *
 * @param capacity - Buffer capacity.
 * @param overloadRewrite - Overload policy for finite buffers.
 * @returns Receiver and sender endpoints.
 */
```

Do not use the summary to restate parameter names or return types. The signature already
shows those. Use the summary for behavior, ownership, or boundary meaning.

## Data Declarations

For interfaces, aliases, unions, and opaque keys, prefer one restrained summary. Add
property comments only when a field carries a caller-facing rule that is not clear from
its name or type.

## Failure Language

Kernel package comments should describe in-band kernel results: failure, cancellation,
settlement, convergence, scope, process, future, channel, and recovery.

Avoid `throw`, `error`, rejected promise, and other JavaScript-native error handling
language unless the declaration is an executor or host boundary where that behavior is
actually part of the contract.

## Scope

Do not try to make this exhaustive. Add comments where they improve TypeScript hints for
published exports, and leave obvious implementation details alone.
