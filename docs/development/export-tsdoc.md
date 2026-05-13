# Export TSDoc

Export TSDoc is the published API hint layer for package declarations. It helps a
consumer understand the declaration at the import site and in generated `.d.ts` output.

Comments add stable API meaning that the declaration cannot carry clearly enough on its
own. They describe the public contract of the declaration rather than the source path,
helper structure, or current implementation flow behind it.

## Export Surface

The package export surface determines where TSDoc belongs. Published declarations carry
comments; declarations outside the published surface stay outside this layer.

For re-exported concepts, place comments on the declaration that reaches the generated
`.d.ts` output. Comments live where consumers encounter the symbol.

## Declaration Context

Read the published declaration before writing its comment. Package path, subpath, symbol
name, containing type, signature shape, parameter names, and return type all provide
context. The comment builds on that context instead of restating it.

Write from the consumer's point of view. A declaration comment explains what the symbol
means and what behavior or constraints the consumer can rely on. Source organization,
temporary relationships between helpers, and implementation mechanics belong in code or
reference documentation.

Implementation language fits when the implementation boundary is itself public. Executor
and host integration declarations may discuss turns, continuations, host callbacks, or
external control when consumers supply or observe those concepts directly. Kernel
primitive comments use the semantic language of the kernel model.

## Callable Declarations

For functions, methods, and callable type aliases, use a short summary and add signature
tags when they make the contract easier to read.

The summary states the operation's role or observable behavior. Parameter tags explain
caller-facing rules such as ranges, ownership, default behavior, blocking behavior, or
how an argument changes the operation. Return tags explain result forms, ownership,
lifecycle, settlement behavior, `Option` branches, or other outcomes that are not already
clear from the return type. `@throws` belongs to JavaScript-native failure behavior that
consumers observe directly.

Tags carry contract meaning rather than repeating names or types. `void` results are
usually clear from the signature; `@returns` is useful when the absence of a value
carries contract meaning.

```ts
/**
 * Opens a channel owned by the current scope.
 * Negative or `NaN` capacity converges the current process with a channel failure.
 *
 * @param capacity - `0` creates rendezvous delivery, finite positives create bounded
 * buffering, and `Infinity` creates unbounded buffering.
 * @param overloadRewrite - Finite-buffer policy applied before an overloaded send is accepted.
 * @returns Receiver and sender endpoints.
 */
```

## Data Declarations

For interfaces, aliases, unions, classes, and opaque keys, prefer one restrained summary
that describes the declaration's stable role. Property comments belong on fields whose
caller-facing rule is not clear from the field name, type, or containing declaration.

Data comments describe value meaning and contract boundaries. Construction, routing,
caching, scheduling, and interpretation details fit here when they are part of the
public meaning of the declaration.

## Failure Language

Kernel package comments describe in-band kernel results with kernel terms: failure,
cancellation, settlement, convergence, scope, process, future, channel, and recovery.

JavaScript-native error language such as `throw`, `error`, and rejected promise belongs
to executor or host boundaries where consumers observe that behavior directly. In-band
kernel failure remains described as in-band failure.

Host package comments may use JavaScript error language when package consumers observe
that behavior directly. Name the thrown error when the public contract depends on that
specific error.

## Reference Boundary

TSDoc is a hint layer, not an exhaustive reference. It improves the local TypeScript
reading of published declarations while leaving obvious signature information to the
declaration itself.

Design rationale, source structure, and implementation flow belong in reference
documentation when they are useful. Export TSDoc remains concise enough to feel native
to the declaration it annotates.
