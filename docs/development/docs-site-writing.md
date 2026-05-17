# Docs Site Writing

Docs site pages should help readers enter shajara through the product surface they are
using. Each page has a local job, and the writing should protect that job from unrelated
reference material, implementation detail, and premature terminology.

The documentation set can be complete without asking every page to be complete. A page
should teach the move it owns, leave later moves to later pages, and read as a coherent
finished page with one clear direction.

## Page Ownership

Start from the reader's task. Introduce a topic because the current page needs it, not
because the concept exists elsewhere in the system.

Keep the framing at the same level as the page job. A section that teaches routine
orchestration should be led by the boundary or shape it is responsible for: routine flow, a
process in the current scope, a child scope, a future handle, or a direct value.
Example-specific names should make the code readable without becoming the section's
conceptual frame.

Avoid preview prose that merely announces the page outline. If the next section already
shows the next step, let the section carry that transition.

Do not duplicate the job of an earlier page. When a reader reaches a follow-up guide,
assume the previous guide has already taught its entry pattern, and spend attention on the
new move.

Completeness belongs to the documentation set. A page can leave a concept to its later
owner when naming it would not clarify the current task.

## Revision Coherence

Treat editing as design work. A revision should settle on one organizing idea and make
every part of the page serve that idea.

When a page's design changes, revise the page as a whole. Replace stale framing, examples,
and supporting material instead of fitting new text around the previous structure.
Compatibility with outdated framing is not a documentation goal.

Page-level constraints should shape the page. If a constraint affects the page's
direction, revise the page structure and surrounding explanation so the page embodies that
constraint. Do not attach it as a local note, caveat, or warning near the sentence that
happened to expose the issue.

If the same clarification keeps appearing, promote the underlying rule to the page's
structure or to this writing guide. The final page should read as if it was designed that
way from the start, without discussion history or transitional language left from an
earlier draft.

Prefer restructuring or rewriting when local edits would break the page's flow. If a page
has changed direction, remove the scaffolding left by the previous direction.

Clean up stale design debt in the revision that exposes it. If previous material no
longer fits the page's current job, replace or remove it instead of layering new
exceptions around it.

## Reading Shape

Task-oriented sections should usually move from a short task frame to the shajara-shaped
example, then to the explanation needed to read that example.

Readers should usually see the code shape before carrying a large explanation. Put
supporting interpretation after the example unless the reader cannot understand the example
without a small setup sentence. Before and after the example, stay in the vocabulary of the
current layer. Explain concrete code names only when they help the reader read the example.

When a reader would otherwise have to mentally execute incidental details, show the
observable result near the code. Let that result carry the simple outcome; use the prose
after the example to explain the shajara boundary that caused it, or the decision the
reader should take from it.

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
process, or API call does over making the prose explain its own emphasis.

## Example Design

Examples should foreground the shajara structure being taught. Surrounding TypeScript,
application code, and placeholder setup should stay quiet unless they are part of that
structure.

Use `run(...)` when crossing from application code into a routine is the move being taught.
Once that entry pattern has been shown, later examples can usually show the routine body
directly, or show a routine that would be called from another routine. Repeating the entry
boundary on every example spends space on a move the page no longer owns.

Use the smallest number of routines needed to show distinct roles. Do not repeat routines
that demonstrate the same behavior; repetition should add a new structural responsibility,
not merely make an existing point louder.

Incidental mechanics should stay out of the foreground. Lifecycle, cleanup, and
error-handling code belong in an example only when the section owns those mechanics. When
failure behavior is the subject, keep the shajara boundary in view: propagation, local
handling, and recovery are different teaching responsibilities, so separate them when one
example would make one responsibility read like a caveat on another.

## Application Surface

Choose surrounding work according to the section job. When the page teaches a Promise
boundary, use a familiar Promise-producing API such as `fetch(...)` so the boundary is
visible. When the page teaches routine orchestration, use `sleep(...)`, literals, or small
inline routines to simulate business activity; realistic request plumbing should not
compete with the shajara boundary being taught.

Use complete setup only when it teaches the current step. Do not hide the boundary being
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
ownership. A process is the runtime execution of a routine inside a scope. Avoid implying a
process hierarchy; when ownership matters, say which scope the process belongs to.

When a page teaches return shapes, let the reader see the concrete shape before stating the
general style. A returned future lets the caller observe a process result in the current
scope. A returned value from a child-scope API means the calling process has already waited
through that scope. Explain this as a way to read the API, not as a taxonomy detached from
the example.

Use terms at the layer they belong to. When a later concept is not doing work in the
current explanation, leave the code example in the vocabulary of the current layer.

Treat named details as obligations. If a page names something below its current level of
explanation, the page should either own that detail or immediately give it a worked
example. If the current page will not meet that obligation, leave the detail to its owner.

## Language Discipline

Terminology should be deliberate, not mechanically avoided. If a project term has a
specific meaning, avoid using the same word casually when it would confuse that concept.
If a term naturally explains the current behavior, use it; do not replace it only because
it was risky in another context.

Prefer ordinary wording until a project term earns its place. Once a project term appears,
make sure it is doing work for the reader and is attached to the right concept layer.

Use enumeration only when the items are true peers under a governing idea the page has
already named. If a list is carrying priority, causality, ownership, or a design rule,
name that relationship and write the explanation as prose.

Do not turn convenient nouns into project concepts. When shajara has no named concept for
something, describe the concrete API call, routine, scope, process, or future instead.

Use contrast only when it clarifies a real distinction. Repeated "not this, but that"
sentences can make a guide read defensively. When a distinction matters, express the
positive behavior first, then add the contrast only as much as needed.

Natural prose matters. A guide may carry precise terminology, but the surrounding sentences
should still read like ordinary explanation. Avoid wording that explains the text's own
construction or the writer's private intent.
