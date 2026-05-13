# Export TSDoc

Export TSDoc is the published API hint layer for package declarations. It gives consumers
the contract meaning they need at the import site and in generated `.d.ts` output.

Comments describe the public contract at the declaration boundary. They add stable API
meaning that the declaration cannot carry clearly enough on its own, while source path,
helper structure, and implementation flow stay outside this layer.

## Export Surface

The package export surface determines where TSDoc belongs. Published declarations carry
comments; declarations outside the published surface stay outside this layer.

For re-exported concepts, place comments on the declaration that reaches the generated
`.d.ts` output. Comments live where consumers encounter the symbol.

The export path also determines vocabulary. Comments use the terms published by that
package or subpath. Explicit adapter modules can name both sides of a boundary because
that distinction is part of their surface; other declarations stay within the vocabulary
of their own exported abstraction.

## Declaration Context

Read the published declaration before writing its comment. Package path, subpath, symbol
name, containing type, signature shape, parameter names, and return type all provide
context. The comment builds on that context instead of restating it.

Write from the consumer's point of view. A declaration comment explains what the symbol
means and what behavior or constraints the consumer can rely on. Source organization,
temporary relationships between helpers, and implementation mechanics belong in code or
reference documentation.

Declaration shape is governed by API design. Parameter properties, aliases, overloads,
and field placement are part of the public contract, and they provide the attachment
sites available to this hint layer.

Implementation language fits when the implementation boundary is itself public. Executor
and integration declarations may discuss turns, continuations, callbacks, or external
control when consumers supply or observe those concepts directly. Package-relative words
such as host and kernel mark necessary distinctions between public contexts. When no
boundary distinction is involved, the package's own abstraction supplies the vocabulary.

## Callable Declarations

For functions, methods, and callable type aliases, use a short summary and signature tags
only where they make the contract easier to read.

The summary states the operation's role or observable behavior. Parameter tags explain
caller-facing rules such as ranges, ownership, default behavior, blocking behavior, or
how an argument changes the operation. Return tags explain result forms, ownership,
lifecycle, settlement behavior, `Option` branches, or other outcomes that are not already
clear from the return type. `@throws` belongs to JavaScript-native failure behavior that
consumers observe directly.

Tags carry contract meaning rather than repeating names or types. `void` results are
usually clear from the signature; `@returns` is useful when the absence of a value
carries contract meaning. A cross-cutting rule belongs on the local declaration when it
changes how that specific call is used.

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

For constructor parameter properties and fields, comment at the closest published
declaration that carries the public rule. Obvious construction mechanics stay in the
signature.

## Failure Language

Kernel comments describe in-band results with model terms: failure, cancellation,
settlement, convergence, scope, process, future, channel, and recovery.

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

Shared semantics such as lifecycle, recovery, scheduling, or failure mapping belong in
reference documentation. Export comments name the local consequence a caller needs at the
annotated symbol.
