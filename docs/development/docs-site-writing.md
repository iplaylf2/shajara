# Docs Site Writing

Docs site pages should help readers enter shajara through the product surface they are
using. Each page has a local job, and the writing should protect that job from unrelated
reference material, implementation detail, and premature terminology.

The documentation set can be complete without asking every page to be complete. A page
should teach the move it owns, leave later moves to later pages, and read as a coherent
finished page rather than as an accumulation of local corrections.

## Page Job

Start from the reader's task. Introduce a topic because the current page needs it, not
because the concept exists elsewhere in the system.

Avoid preview prose that merely announces the page outline. If the next section already
shows the next step, let the section carry that transition.

Do not duplicate the job of an earlier page. When a reader reaches a follow-up guide,
assume the previous guide has already taught its entry pattern, and spend attention on the
new move.

Completeness belongs to the documentation set. A page can leave a concept to its later
owner when naming it would not clarify the current task.

## Reading Flow

Prefer this order inside task-oriented sections:

1. a short task frame
2. the shajara-shaped example
3. the explanation needed to read that example

Readers should usually see the code shape before carrying a large explanation. Put
supporting interpretation after the example unless the reader cannot understand the example
without a small setup sentence.

When an explanation compares examples from multiple sections, give that comparison its own
stable home. Do not attach cross-section interpretation to one of the sections it compares.

Before calling a page done, read it in order as a finished artifact. Remove traces of local
edit history: repeated caveats, abrupt contrast sentences, orphaned terminology, and
paragraphs that only make sense as answers to an earlier review comment.

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

## Concept Disclosure

Keep code concepts and runtime concepts distinct. A routine can be the main actor in a code
example because the reader can see it as a generator function. A scope is a runtime
boundary; it should become the main actor only on a page that is explaining runtime
ownership.

Use terms at the layer they belong to. When a later concept is not doing work in the
current explanation, leave the code example in the vocabulary of the current layer.

## Language Discipline

Terminology should be deliberate, not mechanically avoided. If a project term has a
specific meaning, avoid using the same word casually when it would confuse that concept.
If a term naturally explains the current behavior, use it; do not replace it only because
it was risky in another context.

Prefer ordinary wording until a project term earns its place. Once a project term appears,
make sure it is doing work for the reader and is attached to the right concept layer.

Use contrast only when it clarifies a real distinction. Repeated "not this, but that"
sentences can make a guide read like a patch history. When a distinction matters, express
the positive behavior first, then add the contrast only as much as needed.
