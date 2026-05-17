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

Keep the framing at the same level as the page job. A section that teaches orchestration
should be led by orchestration concepts such as concurrent work, parent routines,
ownership, and joining. Example-specific names should make the code readable without
becoming the section's conceptual frame.

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
without a small setup sentence. Before and after the example, stay in the vocabulary of the
current layer. Explain concrete code names only when they help the reader read the example.

When a reader would otherwise have to mentally execute incidental details to understand an
example result, show that result near the code. The comment should state the outcome, not
carry conceptual explanation.

When an explanation compares examples from multiple sections, give that comparison its own
stable home. Do not attach cross-section interpretation to one of the sections it compares.

## Product Voice

Write as the project explaining itself, not as an external review describing a third-party
tool. Prefer direct explanation of how shajara is used over broad evaluation of when it is
useful or valuable.

The opening should establish the relevant product surface and then move into the reader's
task. Let motivation emerge from the example and the shape of the code instead of front
loading abstract value claims.

Describe product behavior and structure directly. Prefer saying what the routine, scope,
or operation does over making the prose explain its own emphasis.

## Example Focus

Examples should foreground the shajara structure being taught. Surrounding TypeScript,
application code, and placeholder setup should stay quiet unless they are part of that
structure.

Use `run(...)` when crossing from application code into a routine is the move being taught.
Once that entry pattern has been shown, later examples can usually show the routine body
directly, or show a routine that would be called from another routine. Repeating the entry
boundary on every example spends space on a move the page no longer owns.

Do not expand an example with incidental lifecycle, cleanup, or error-handling mechanics
unless the current section owns those mechanics. Keep the sample centered on the behavior
the section is responsible for teaching.

## Application Surface

Choose surrounding work according to the section job. When the page teaches a Promise
boundary, use a familiar Promise-producing API such as `fetch(...)` so the boundary is
visible. When the page teaches routine orchestration, use `sleep(...)`, literals, or small
inline routines to simulate business work; realistic request plumbing should not compete
with the shajara operation being taught.

Use complete setup only when it teaches the current step. Do not hide the operation being
taught behind extra application abstractions. If an abstraction would make the reader trust
an invisible routine, callback shape, or Promise boundary, write the smallest inline shape
instead.

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
