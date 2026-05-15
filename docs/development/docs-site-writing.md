# Docs Site Writing

Docs site pages should help readers enter shajara through the product surface they are
using. Each page has a local job, and the writing should protect that job from unrelated
reference material, implementation detail, and premature terminology.

## Reader Attention

Spend reader attention on the move the page is asking them to make. Do not introduce a
topic because it exists elsewhere in the system; introduce it because the current
explanation needs it.

Avoid preview prose that merely announces the page outline. If the next section already
shows the next step, let the section carry that transition.

Completeness belongs to the documentation set, not to every page. A page can leave a
concept to its later owner when naming it would not clarify the current task.

## Product Voice

Write as the project explaining itself, not as an external review describing a third-party
tool. Prefer direct explanation of how shajara is used over broad evaluation of when it is
useful or valuable.

The opening should establish the relevant product surface and then move into the reader's
task. Let motivation emerge from the example and the shape of the code instead of front
loading abstract value claims.

## Example Burden

Examples should foreground the shajara structure being taught. Surrounding TypeScript,
application code, and placeholder setup should stay quiet unless they are part of that
structure.

Use complete setup only when it teaches the current step. Once an entry pattern has been
shown, later examples may focus on the routine or operation being explained.

Represent outside application code in the least distracting way. An application-looking
import is usually enough:

```ts
import { loadUserName } from "./user-data";
```

Avoid scaffolding that makes the reader think about TypeScript declaration mechanics or
type inference when the page is teaching orchestration:

```ts
declare function loadUserName(userId: string): Promise<string>;

yield *
  all([
    /* ... */
  ] as const);
```

If a clean example exposes an API typing weakness, prefer improving the API or changing the
example shape over making the reader carry incidental syntax.

## Concept Layers

Keep code concepts and runtime concepts distinct. A routine can be the main actor in a code
example because the reader can see it as a generator function. A scope is a runtime
boundary; it should become the main actor only on a page that is explaining runtime
ownership.

Use terms at the layer they belong to. When a later concept is not doing work in the
current explanation, leave the code example in the vocabulary of the current layer.
