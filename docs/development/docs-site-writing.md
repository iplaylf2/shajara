# Docs Site Writing

Docs site pages should help readers enter shajara through the product surface they are
using. Each page has a local job, and the writing should protect that job from unrelated
reference material, implementation detail, and premature terminology.

The documentation set can be complete without asking every page to be complete. A page
should teach the move it owns, leave later moves to later pages, and read as a coherent
finished page with one clear direction.

A guide sequence is an entry path, not a compressed reference. It should stop when the
reader has enough structural moves to continue through reference pages and examples; it
does not need a guide for every public API or internal concept.

## Page Ownership

Start from the reader's task and let the page's path, title, and description name the
shajara move it teaches. Introduce a topic because the current page needs it, not because
the concept exists elsewhere in the system or because the surrounding application setting
is familiar. Keep the application setting in examples unless that integration surface is
itself the page's job.

Keep the framing at the same level as the page job. A section that teaches routine
orchestration should be led by the boundary or shape it is responsible for: routine flow, a
process in the current scope, a child scope, a returned future, or a direct value.
Example-specific names should make the code readable without becoming the section's
conceptual frame.

Each section should have one local responsibility. When a rule affects several sections,
such as ownership, terminal states, or cross-boundary behavior, give that rule a stable
home instead of repeating it as a caveat in every section. If creating that home would
distract from the page job, leave the rule to its later owner.

Avoid preview prose that merely announces the page outline. If the next section already
shows the next step, let the section carry that transition.

Page descriptions should name the reader-facing job, not enumerate the sections or turn
the outline into metadata. A description that can be mechanically expanded into the page
outline is usually too specific.

Do not duplicate the job of another page. When a reader reaches a follow-up guide, assume
the previous guide has already taught its entry pattern, and spend attention on the new
move. In an API family or topic sequence, shared routing, page level, and navigation
should orient the reader without making sibling pages repeat the same contrasts or
comparisons.

Completeness belongs to the documentation set. A page can leave a concept to its later
owner when naming it would not clarify the current task, and it can end as soon as its own
decision is settled.

## Revision Coherence

Treat editing as design work. A revision should settle on one organizing idea and make
every part of the page serve that idea.

When a page's design changes, revise the page as a whole. Its route, navigation entry,
opening, examples, headings, supporting material, and ending should all point in the same
direction.

Page-level constraints should shape the page. If a constraint affects the page's
direction, revise the page structure and surrounding explanation so the page embodies that
constraint. Do not attach it as a local note, caveat, or warning near the sentence that
happened to expose the issue.

If the same clarification keeps appearing, promote the underlying rule to the page's
structure or to this writing guide. The final page should read as if it was designed that
way from the start, without discussion history or transitional language left from an
earlier draft.

Prefer restructuring or rewriting when local edits would break the page's flow. Splitting
a section, renaming a module, or moving material is appropriate when it gives
responsibilities stable homes and removes accumulated exceptions. Material that does not
serve the page's current job should be replaced or removed instead of carrying exceptions
around it. A clean revision may replace an example, remove a supporting API, or rewrite
the surrounding prose so the page reads like it was authored for its current design.

## Reading Shape

Task-oriented sections should usually move from a short task frame to the shajara-shaped
example, then to the explanation needed to read that example. When several
responsibilities need to be seen together, open with the broader example and return to
smaller excerpts as each responsibility is explained. The reader should not have to
remember or re-parse the opening example to follow later sections.

Readers should usually see the code shape before carrying a large explanation. Put
supporting interpretation after the example unless the reader cannot understand the example
without a small setup sentence. Before and after the example, stay in the vocabulary of the
current layer. Explain concrete code names only when they help the reader read the example.

In code examples, use comments only when they let the reader see a local behavior at the
line where the reader needs it. If a comment already carries that local point, the
following prose should move to the section's rule or decision instead of restating the
comment.

Attach result comments to the operation that produces, transforms, or observes the result.
A comment can precede a single observation point when it prepares the reader for the next
line, including a boundary observation that may return a value or throw an error. When a
result is produced by a multi-line expression or scoped routine, show the process first and
attach the result after the expression closes. When a result travels across a boundary,
separate comments only when they mark distinct observations, such as the decision made at
one point and the value or error seen at another. Do not use comments to narrate obvious
control flow, or to make readers reason about helper code that is not the subject.

When a reader would otherwise have to mentally execute incidental details, show the
observable result near the code. Let that result carry the simple outcome; use the prose
after the example to explain the shajara boundary that caused it, or the decision the
reader should take from it.

When an API routes a result across a boundary, explain the result at the boundary the page
owns. Include declined or delegated outcomes when they change what the reader observes,
including the case where the original result passes through unchanged. Leave generic
downstream error handling to the page that owns that mechanism.

Choose the lightest surface that shows the result. A return value can carry a final value,
a short comment can stand in for omitted application events or intermediate states, and
`console.log(...)` is most useful when the order of effects is the point. Use the literal
value, result shape, or a short label when the adjacent expression already supplies the
subject. Avoid frames such as "result is" or "returns" unless they carry a condition that
changes how the value is read. If the code already
shows literal results through comments or return values, let the prose move to the rule
those results reveal instead of restating each value.

When an explanation compares examples from multiple sections, give that comparison its own
stable home. Do not attach cross-section interpretation to one of the sections it compares.

## Product Voice

Write as the project explaining itself, not as an external review describing a third-party
tool. Prefer direct explanation of how shajara is used over broad evaluation of when it is
useful or valuable.

The opening should establish the relevant product surface and then move into the reader's
task. Let motivation emerge from the example and the shape of the code instead of front
loading abstract value claims.

Do not open a page by listing the APIs it will cover. A short frame should give enough
context for the first example; concrete API shapes can appear where the reader uses them.

Describe product behavior and structure directly. Prefer saying what the routine, scope,
process, or API call does over making the prose explain its own emphasis.

## Example Design

Examples should be designed around the shajara structure the page owns. Decide which
boundary the reader must see, then choose just enough surrounding TypeScript and
application code to make that boundary readable. Platform glue and placeholder setup are
useful only while they keep the shajara move legible; they should not become a second
walkthrough.

On API-family pages, each example should focus on the API named by the section.
Supporting calls are acceptable when they create the value, state, or observation point the
API needs, but they should not become peer subjects in the same example. If a supporting
call introduces a second result shape or demands its own explanation, change the example
so the named API remains the reader's focus. If several APIs need equal attention, split
the examples or give the comparison its own section.

A concrete scenario is valuable when it reveals how work is owned, observed, canceled, or
converged. Otherwise use lighter surfaces: inline routines, literals, and comments for
omitted callbacks, user actions, or teardown points. The example's size should be justified
by a shajara responsibility, not by making the surrounding application feel complete.

Use `run(...)` when crossing from application code into a routine is the move being taught.
Once that entry pattern has been shown, later examples can usually show the routine body
directly, or show a routine that would be called from another routine. Repeating the entry
boundary on every example spends space on a move the page no longer owns.

Use the smallest number of routines needed to show distinct roles. Routine arguments can
be inline when their enclosing API is the local subject. When nesting several
primitives that take routines would make multiple boundaries compete in the same block,
separate the layers with a named routine or helper. Do not repeat routines that demonstrate
the same behavior; repetition should add a new structural responsibility, not merely make
an existing point louder.

Treat lifecycle, cleanup, and error behavior as part of the example's design when they
change how the reader should understand the API being taught. If they are not the page's
job, omit them rather than carry defensive completeness. Prefer language and runtime forms
that expose ownership or release without extra scaffolding, and remove wrappers that do
not serve the current sample. When failure behavior is the subject, keep propagation,
local handling, recovery, and unchanged outcomes in their responsible contexts so one
responsibility does not read like a caveat on another.

## Application Surface

The application surface should help readers recognize where the shajara boundary appears,
not become the center of gravity. Choose surrounding work according to the boundary being
taught, and keep the shajara mechanism as the named subject. A Promise boundary needs
recognizable asynchronous work; routine orchestration can often be represented by small
inline routines or deterministic values. Realistic plumbing should appear only where it
changes the shajara behavior the reader is learning.

Use complete setup only when the setup is itself the integration point. Otherwise keep the
example flat enough for the reader to see the boundary being taught. A helper is useful
only when it names a real responsibility that would still matter outside the guide; if it
mainly hides the boundary or makes the sample look more like an application, write the
smallest inline example instead.

Choose domain names that do not collide with shajara concepts unless the page is teaching
that concept. For example, do not use channel, feed, scope, process, future, or resource
as casual names when they could be read as API or runtime terms.

Choose nearby example names that remain visually distinct when read quickly. Avoid names
where related handles and values are only small variations of the same word.

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
ownership. Placement inside application code does not create a new shajara category; when
an API has no named category for a lifetime, describe the surrounding owner in ordinary
application language and keep project terminology attached to the runtime object. A
process is the runtime execution of a routine inside a scope. Avoid implying a process
hierarchy; when ownership matters, say which scope the process belongs to.

When a page teaches return shapes, let the reader see the concrete shape before stating the
general style. A returned future lets the caller observe a process result in the current
scope. A returned value from a child-scope API means the calling process has already waited
through that scope. Explain this as a way to read the API, not as a taxonomy detached from
the example.

Use terms at the layer they belong to. When a later concept is not doing work in the
current explanation, leave the code example in the vocabulary of the current layer.

Reference-layer labels belong in reference pages unless a guide is teaching that boundary.
Importing from `@shajara/host` does not require a guide to make the host layer a concept;
name the concrete API call or runtime object unless that layer itself is the subject.

When the useful distinction is between ordinary JavaScript and shajara concurrency, name
that boundary directly: callback code, event handlers, promises, routine code, futures, or
scopes. Do not use `host` as a general label for surrounding JavaScript code.

Treat named details as obligations. If a page names something below its current level of
explanation, the page should either own that detail or immediately give it a worked
example. If the current page will not meet that obligation, leave the detail to its owner.

## Language Discipline

Terminology should be deliberate, not mechanically avoided. If a project term has a
specific meaning, avoid using the same word casually when it would confuse that concept.
If a term naturally explains the current behavior, use it; do not replace it only because
it was risky in another context.

Prefer ordinary wording until a project term earns its place. Once a project term appears,
make sure it is doing work for the reader and is attached to the right concept layer. When
a sentence explains runtime behavior, name the concept that makes the behavior visible in
that context; do not collapse distinct concepts into a single convenient noun. When a
sentence describes surrounding application activity, ordinary application language can be
clearer. Localized pages follow the same rule: translate the surrounding sentence while
preserving the concept layer, and keep a project term when a natural word would change the
runtime relationship.

Use enumeration when it helps readers scan true peers under a named relationship. Name
that relationship before listing the items. If the items need explanation to make sense,
keep the explanation in prose; if the relationship is already clear and comparison helps,
enumerate them.

Do not turn convenient nouns into project concepts. When shajara has no named concept for
something, describe the concrete API call, routine, scope, process, or future instead.

Use contrast only when it clarifies a real distinction. Repeated "not this, but that"
sentences can make a guide read defensively. When a distinction matters, express the
positive behavior first, then add the contrast only as much as needed.

Natural prose matters. A guide may carry precise terminology, but the surrounding
sentences should still read like ordinary explanation. Do not make the guide announce its
own construction, justify the sample's shape, explain that a representation is important,
or describe the writer's private intent. State the behavior the reader can see in the code
and the rule it reveals.
