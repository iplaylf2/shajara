# Docs Site Writing

Docs site pages should help readers enter shajara through the product surface they are
using. Each page has a local job, and the writing should protect that job from unrelated
reference material, implementation detail, and premature terminology.

The documentation set can be complete without asking every page to be complete. A page
should teach the move it owns, leave later moves to later pages, and read as a coherent
finished page with one clear direction.

## Documentation Architecture

A guide sequence is an entry path, not a compressed reference. It should stop when the
reader has enough structural moves to continue through reference pages and examples; it
does not need a guide for every public API or internal concept.

Start from the reader's task and let the page's path, title, and description name the
shajara move it teaches. Introduce a topic because the current page needs it, not because
the concept exists elsewhere in the system or because the surrounding application setting
is familiar.

Do not duplicate the job of another page. Position each page in the reader's path before
writing its opening. When a reader reaches a follow-up guide or concept page, assume the
earlier pages have already taught their entry pattern and useful intuition, and spend
attention on the new move or mechanism. In an API family or topic sequence, shared
routing, page level, and navigation should orient the reader without making sibling pages
repeat the same contrasts or comparisons.

Completeness belongs to the documentation set. A page can be short when its own decision
is settled. It can leave a concept to its later owner when naming it would not clarify the
current task, and it should not borrow material from neighboring pages just to feel
complete.

## Page Composition

A page should have one organizing idea. Its route, navigation entry, title, description,
opening, examples, headings, supporting material, and ending should all point in the same
direction.

The opening should establish the relevant product surface and then move into the reader's
task or conceptual move. Let motivation emerge from the example and the shape of the code
instead of front loading abstract value claims. Do not open a page by listing the APIs it
will cover or summarizing the whole outline. A short frame should give enough context for
the first example; on later concept pages, it can start from the usage surface readers
already recognize and reveal the mechanism behind it.

Page descriptions should name the reader-facing job, not enumerate the sections or turn
the outline into metadata. A description that can be mechanically expanded into the page
outline is usually too specific. On concept pages, a description can say how to read the
mechanism, not merely that the reader will understand it.

Each section should have one local responsibility. Keep the framing at the same level as
the section job: a section should be led by the boundary, owner, observation point, or
result shape it is responsible for. Example-specific names should make the code readable
without becoming the section's conceptual frame.

When a rule affects several sections, such as ownership, terminal states, or
cross-boundary behavior, give that rule a stable home instead of repeating it as a caveat
in every section. If creating that home would distract from the page job, leave the rule to
its later owner.

Avoid preview prose that merely announces the page outline. If the next section already
shows the next step, let the section carry that transition. When an explanation compares
examples from multiple sections, give that comparison its own stable home. Do not attach
cross-section interpretation to one of the sections it compares.

Use enumeration when it helps readers scan true peers under a named relationship. Name
that relationship before listing the items. Do not enumerate APIs merely to prove coverage
or completeness; when a list mixes creation, observation, ownership, and usage roles,
classify the relationship in prose or move the detail to reference material. If the items
need explanation to make sense, keep the explanation in prose; if the relationship is
already clear and comparison helps, enumerate them.

## Example Design

Examples should be designed around the shajara structure the page owns. Decide which
boundary the reader must see, then choose just enough surrounding TypeScript and
application code to make that boundary readable. Platform glue and placeholder setup are
useful only while they keep the shajara move legible; they should not become a second
walkthrough.

Readers should usually see the code shape before carrying a large explanation. Put
supporting interpretation after the example unless the reader cannot understand the example
without a small setup sentence. Before and after the example, stay in the vocabulary of the
current layer. Explain concrete code names only when they help the reader read the example.

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

Show the application-to-routine entry only when that crossing is the move being taught.
Once that entry pattern has been shown, later examples can usually show the routine body
directly. When another routine appears, it should reveal the boundary the page owns rather
than appear as incidental background. Repeating the entry boundary on every example spends
space on a move the page no longer owns.

Use the smallest number of routines needed to show distinct roles. Routine arguments can
be inline when their enclosing API is the local subject. When nesting APIs that accept
routines would make multiple boundaries compete in the same block, separate the layers
with a named routine or helper. Do not repeat routines that demonstrate the same behavior;
repetition should add a new structural responsibility, not merely make an existing point
louder.

Treat lifecycle, cleanup, and error behavior as part of the example's design when they
change how the reader should understand the API being taught. If they are not the page's
job, omit them rather than carry defensive completeness: do not add `try...catch`,
teardown, callback cleanup, or other wrappers merely to make an example look
like production code. Prefer language and runtime forms that expose ownership or release
without extra scaffolding. When failure behavior is the subject, keep propagation, local
handling, recovery, and unchanged outcomes in their responsible contexts so one
responsibility does not read like a caveat on another.

Choose domain names that do not collide with shajara concepts unless the page is teaching
that concept. For example, do not use channel, feed, scope, process, future, or resource
as casual names when they could be read as API or runtime terms.

Choose nearby example names that remain visually distinct when read quickly. Avoid names
where related handles and values are only small variations of the same word.

## Result Presentation

In code examples, use comments only when they let the reader see a local behavior at the
line where the reader needs it. If a comment already carries that local point, the
following prose should move to the section's rule or decision instead of restating the
comment.

Attach result comments to the expression that produces, transforms, or observes the result.
A comment can precede a single observation point when it prepares the reader for the next
line, including a boundary observation that may return a value or throw an error. When a
result is produced by a multi-line expression or scoped block, show the block first and
attach the result after the expression closes. When a result travels across a boundary,
separate comments only when they mark distinct observations, such as the decision made at
one point and the value or error seen at another. Do not use comments to narrate obvious
control flow, or to make readers reason about helper code that is not the subject. Within
one page, comments that serve the same result role should use a consistent attachment
pattern instead of mixing line-end and preceding-line comments for equivalent observations.

When a reader would otherwise have to mentally execute incidental details, show the
observable result near the code. Let that result carry the simple outcome; use the prose
after the example to explain the shajara boundary that caused it, or the decision the
reader should take from it.

When a failure is observed but handling that failure is not the page's subject, prefer a
result comment at the observation point over a full handling block. The comment may name
the thrown error and the local condition that causes it; the prose after the example
should carry the rule the page is teaching.

When an API routes a result across a boundary, explain the result at the boundary the page
owns. Include declined or delegated outcomes when they change what the reader observes,
including the case where the original result passes through unchanged. Leave generic
downstream error handling to the page that owns that mechanism.

When a page teaches a result shape, let the reader see the concrete shape before stating
the general style. A nearby comment can name a simple observed value or error; when the
shape itself is the point, put the literal shape in the prose after the example. Explain
the shape as a way to read the API or boundary in the current example, not as a taxonomy
detached from the example.

Choose the lightest surface that shows the result. A return value can carry a final value,
a short comment can stand in for omitted application events or intermediate states, and
`console.log(...)` is most useful when the order of effects is the point. Use the literal
value, result shape, or a short label when the adjacent expression already supplies the
subject. Avoid frames such as "result is" or "returns" unless they carry a condition that
changes how the value is read. If the code already shows literal results through comments
or return values, let the prose move to the rule those results reveal instead of restating
each value.

## Concept Boundaries

Let the page level decide how much concept to disclose. Guides can rely on useful
intuition when it lets the reader use the API correctly; concept pages can slow down to
name the distinction behind that intuition and disclose the stable mechanisms behind it.
Adjacent runtime objects should appear only when they change how readers understand that
mechanism or help locate it inside a structure the reader already knows. They should not
turn the neighboring concept into the page's job. Even on concept pages, explain the
positive model before adding contrasts, and do not introduce hypothetical misreadings
before the example creates a reason for them.

A concept page should leave readers with a transferable reading rule, not just a tour of
APIs that happen to share a runtime object. If one example is enough to expose that rule,
the page can stop there. If a concept page would only regroup topic or guide material,
keep the rule inside the page that already owns the reader's task. When a concept uses
examples from topics or guides, keep those examples subordinate to the mechanism the page
owns, and do not expand them into a guide-style sequence, an outcome taxonomy, or a
balanced set of peer sections unless those peers are the mechanism itself.

Treat named details as obligations. A true detail is not automatically relevant: if it
does not change how the reader understands the page's mechanism, omit it. If a page names
something below or adjacent to its current level of explanation, the page should either
make its local role clear, own that detail with a worked example, or leave it to its
owner.

Keep syntax, public API, and runtime ownership as separate layers. A page can name the
syntax form, the public type, or the runtime object when that layer explains the current
behavior; it should not make one layer stand in for another. When a shajara concept is
written through a JavaScript form, use that form to explain the shajara move instead of
turning the page into a standalone language lesson. If a language operation creates an
object before shajara advances or owns the resulting work, keep those moments distinct.
Do not make readers learn a lower-level mechanism before they can understand the move the
page owns.

When a page connects a concept to TypeScript, expose the declaration shape that readers
will see at the use site. Avoid invented aliases or example-only names that make the
concept look more local to the sample than it is.

Explain delegation through the boundary the current example uses. The same syntax can
express different relationships depending on the value being delegated and the API that
produced it. Name the relationship visible in the example instead of flattening every case
into the same verb. Operator details belong only where they change what the reader can
write or observe.

Describe ownership with the runtime object that owns the behavior. If an API uses code as
the entry for owned work, keep the ownership language attached to the created runtime
identity and its scope, not to local control flow inside the code.

Do not promote internal module names, implementation labels, or convenient ordinary nouns
into reader-facing concepts. If no public concept owns the behavior, describe the concrete
API call, code block, runtime object, or surrounding application owner instead.

Reference-layer labels belong in reference pages unless a guide is teaching that
boundary. Import paths, package names, and layer names should do boundary work; they
should not become generic labels for surrounding application code.

## Voice And Terminology

Write as the project explaining itself, not as an external review describing a third-party
tool. Prefer direct explanation of how shajara is used over broad evaluation of when it is
useful or valuable. Describe product behavior and structure directly; do not make the
prose explain its own emphasis.

Terminology should be deliberate, not mechanically avoided. If a project term has a
specific meaning, avoid using the same word casually when it would confuse that concept.
If a term naturally explains the current behavior, use it; do not replace it only because
it was risky in another context. Use terms at the layer they belong to; when a later
concept is not doing work in the current explanation, keep the code example in the
vocabulary of the current layer.

Prefer ordinary wording until a project term earns its place. Once a project term appears,
make sure it is doing work for the reader and is attached to the right concept layer. When
a sentence explains runtime behavior, name the concept that makes the behavior visible in
that context; do not collapse distinct concepts into a single convenient noun. When a
sentence describes surrounding application activity, ordinary application language can be
clearer. Localized pages follow the same rule: translate the surrounding sentence while
preserving the concept layer, and keep a project term when a natural word would change the
runtime relationship.

Do not turn ordinary descriptive phrases into named concepts through headings, repeated
framing, capitalization, or translation choices unless the documentation set will keep
using them as concepts. If a phrase only describes the local position, owner, or action,
let it remain ordinary prose.

Use contrast only when it clarifies a real distinction. Repeated "not this, but that"
sentences can make a guide read defensively. When a distinction matters, express the
positive behavior first, then add the contrast only as much as needed.

Natural prose matters. A guide may carry precise terminology, but the surrounding
sentences should still read like ordinary explanation. Avoid prose that announces the page
construction, defends the sample shape, labels a representation as important, or exposes
internal rationale. Editorial intent belongs in the revision process; final prose should
state the behavior the reader can see in the code and the rule it reveals.

## Revision Hygiene

Treat editing as design work. A revision should settle on one organizing idea and make
every part of the page serve that idea.

Page-level constraints should shape the page. If a constraint affects the page's
direction, revise the page structure and surrounding explanation so the page embodies that
constraint. Do not attach it as a local note, caveat, or warning beside the nearest
sentence.

When a revision fills a missing relationship, fit it to the page's existing organizing
idea. The added detail should not become the new center unless the page's job has changed;
otherwise, adjust the example or surrounding prose so the relationship reads as part of
the page's design.

If the same clarification keeps appearing, promote the underlying rule to the page's
structure or to this writing guide. Add material to this guide only after extracting the
general writing principle; do not turn the content model, outline, or local vocabulary of
one page into site-wide guidance. The final page should read as if it was authored for its
current design from the start.

Prefer restructuring or rewriting when local edits would break the page's flow. Splitting
a section, renaming a module, or moving material is appropriate when it gives
responsibilities stable homes and removes accumulated exceptions. Material that does not
serve the page's current job should be replaced or removed instead of carrying exceptions
around it. A clean revision may replace an example, remove a supporting API, or rewrite
the surrounding prose so the page reads like it was authored for its current design.

Before finishing, read the edited page as prose. Remove instruction fragments, stale
contrasts, and mechanical phrases introduced by the edit. The reader should see the
page's content model, not the revision history that produced it.
