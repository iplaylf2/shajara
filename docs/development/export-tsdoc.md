# Export TSDoc

TSDoc on library exports provides API hints for published declarations. It should add
contract meaning to each declaration as it appears at import sites and in generated
`.d.ts` output.

## Export Surface

Comment declarations that are part of a package export surface. If a declaration should
not be public, fix the export path instead of documenting it as public API.

For re-exported concepts, put comments on the declaration that reaches the published
`.d.ts` output. Internal helper functions do not need TSDoc just because they support an
exported primitive.

## Declaration Context

Treat the published declaration as the first source of information. Package path,
subpath, symbol name, containing type, signature shape, parameter names, and return type
all contribute meaning. Comments should rely on that context instead of repeating it.

Use TSDoc for stable contract semantics: observable behavior, value meaning, ownership,
lifecycle, failure conditions, and constraints that affect correct use.

Avoid source organization, implementation mechanics, and incidental relationships between
declarations. A declaration comment should describe what the declaration means, not where
it is produced or which declarations currently use it.

## Callable Declarations

For functions, methods, and callable type aliases, use a short summary plus signature
tags when they add contract meaning. Tags should explain parameter, return, or failure
semantics that are not already clear from the declaration context.

```ts
/**
 * Opens a channel in the current scope.
 *
 * @param capacity - Channel buffer capacity.
 * @param overloadRewrite - Overload policy for finite buffers.
 * @returns Receiver and sender endpoints.
 * @throws `ChannelError` when `capacity` is negative or `NaN`.
 */
```

Do not keep tags that only spell out a name or type in prose. Use the summary for
behavior, ownership, lifecycle, or boundary meaning.

## Data Declarations

For interfaces, aliases, unions, classes, and opaque keys, prefer one restrained summary
that describes the declaration's stable role. Add property comments only when a field
carries a caller-facing rule that is not clear from its name, type, or container.

## Failure Language

Kernel package comments should describe in-band kernel results: failure, cancellation,
settlement, convergence, scope, process, future, channel, and recovery.

Avoid `throw`, `error`, rejected promise, and other JavaScript-native error handling
language unless the declaration is an executor or host boundary where that behavior is
part of the contract.

Host package comments may use JavaScript error language when package consumers observe
that behavior directly. Name the thrown error only when it is part of the public
contract.

## Scope

Do not try to make TSDoc exhaustive. Add comments where they improve TypeScript hints for
published exports, and leave obvious implementation details alone.
