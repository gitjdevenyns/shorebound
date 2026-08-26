# Swarm deck — slide-by-slide script

**Audience assumption (correct me cheaply if this is wrong):** a decision-maker
at a company weighing whether to bring me in to help them adopt AI — an owner,
a director or a hiring manager, with a technical person reading over their
shoulder. They have not seen this setup. They do not care that there are
fifteen agents; they care whether the approach finds real problems, whether I
know its limits, and whether it would work on their codebase.

**What this deck argues, in one line:**

> An AI swarm run with discipline finds what a single pass and a single
> reviewer miss — and the discipline is the skill, not the tooling.

**Positioning statement (the one line to lead with):**

> A structured, adversarial swarm of AI agents, run like a review board rather
> than a chatbot, audited a live product in 48 hours and found two exploitable
> production vulnerabilities, a content-integrity breach in the core screen and
> an app that bricked itself offline — every finding citing a file and a line
> anyone can go and check.

**Rules this script was written under.** Every example is real and checkable
against a path, a finding id or a commit in this repository. Where an agent has
not run, or has run and produced nothing, its slide says so. Where the record
does not name which agent found something, this script does not guess.

**For the designer:** body copy is final. Speaker notes are for the presenter
and do not go on the slide. There are **24 slides**. The only diagram is on
slide 4.

---

## 1 — Title

**Title:** Fifteen agents, one architect, and a product that fought back

**Body:**

An AI agent swarm, run with the discipline of a review board.

What it found in 48 hours on a live product, how it is organised, and the
things I have learned not to trust it with.

**Speaker note:** Ten seconds. Do not explain the swarm yet. The next slide is
the argument.

---

## 2 — What it found

**Title:** In 48 hours, on a product that was already live

**Body:**

**Anyone who signed up first with the owner's published email address became
the site's administrator.** A database trigger granted admin on account
creation and never checked whether the address had been confirmed. Full owner
console: read every account, reset any password, delete any account.

**Private advertiser rates and contacts were readable by anyone.** The
migration revoked writes on the table and never revoked reads, and row-level
security is row-scoped, not column-scoped. Confirmed by issuing the request
with the public key that ships in the browser bundle: 200 OK, nine rows.

**The core screen was inventing fishing advice.** An uncited hand-written table
decided which piece of structure each species "is most likely to be working" —
and where the species was missing from the table, the code returned the first
item in an array. Seven of the guide's 104 recipes were doing exactly that,
printed to the reader as an instruction.

**The app bricked itself offline.** An account gate wrapped every content
route. Install it, drive to the water, lose signal, and the product was a
sign-in form that could not be completed — with the entire guide already sitting
on the device.

**Speaker note:** Land these four flat, no adjectives. Every one is written up
with a file and a line number. Offer the repository.

---

## 3 — The case study, in one line

**Title:** The product is the proof, not the pitch

**Body:**

Shorebound is a researched, offline-first shore-fishing guide for a stretch of
Florida's Gulf coast. It is live, it has a database, four serverless functions,
twelve migrations and a paying-customer plan. It is small enough to audit
completely and real enough that the findings cost something.

It is the specimen. It is not what I am selling you.

Everything after this slide is about the method, and the method is what
transfers.

**Speaker note:** Fifteen seconds, then move. If they ask about the fishing app,
answer in one sentence and come back.

---

## 4 — How it works together

**Title:** One architect, specialists in parallel, a human at the gate

**[DIAGRAM — this slide is a diagram with a short caption. It must show:]**

- **A human at the top**, holding the only two things no agent can do: approve,
  and deploy.
- **The architect below the human**, as the hub. It reads the project brief and
  the roadmap first, decides the shape, breaks work into scoped tasks, and hands
  each one out. It is the only role whose job is the whole system rather than
  one slice.
- **Arrows going out from the architect to specialists, fanning out in
  parallel** — not a chain. Six lanes ran at once in the audit shown here:
  architecture, backend, testing, QA, security/privacy, documentation. Show a
  second, smaller fan for the lanes that ran after: flow/IA, copy, infrastructure
  cost.
- **Arrows coming back**, labelled as *written reports, not code*. The reviewing
  agents are read-only by design; they find problems, they do not fix them.
- **Two side-channels the architect does not get to resolve alone**: a vendor or
  hosting question goes to the cost strategist first; a data-rights or trust
  question goes to the security reviewer.
- **A block off the security reviewer marked "requires a human specialist"**,
  with a line that leaves the diagram entirely — lawyer, licensed auditor,
  penetration tester. No agent in the system can close that loop.
- **A return line from the human back to the architect**, labelled *decides*.
  Every report ends with a list of calls only a person can make.
- **A dotted lane for the unattended agent**, drawn but greyed out, labelled
  *never run*. Honesty is part of the picture.

**Caption on the slide:**

Specialists never grade their own work, and never see each other's reports
before they file their own. When two lanes land on the same finding
independently, that convergence is evidence. When they contradict each other, a
human adjudicates.

**Speaker note:** This is the slide they will photograph. Spend a minute on the
fan-out and one sentence on the "requires a human specialist" line — that line
is the credibility of the whole thing.

---

## 5 — What each agent is handed before it runs

**Title:** The brief is the product

**Body:**

An agent with a vague brief does vague work expensively. Every definition in
this swarm carries the same five things, and they were written the hard way —
after one research agent spawned four sub-agents of its own, sat waiting on
them, reported "completed" three times in twenty-four minutes, and produced no
file at a cost of roughly 108,000 tokens.

**The exact deliverable** — a full file path and format, so "done" is a file
that exists, not a topic that has been thought about.

**The exact scope** — the list of items, not a description of a category.

**What it may not do** — no sub-agents, no application-code edits, no
publishing, no invented content.

**A budget** — searches, items or time. "Be thorough" is not a budget.

**Where questions go, and what an honest gap looks like as output** — a named,
expected outcome, so an agent that does not know says so instead of filling
the space.

**Speaker note:** `docs/LESSONS_LEARNED.md` is the source. This is the slide
that says the value is in the operating rules, not the model.

---

## 6 — architect

**Role.** The hub, and the highest-context seat in the swarm. It decides what
gets built and why, and keeps everyone else pulling in the same direction. It
is explicitly told to stay out of implementation it can delegate.

**Function.** Reads the project brief, the roadmap and the record of past
mistakes before proposing anything. Produces system design and an ordered task
breakdown with acceptance criteria, then delegates to named specialists. It may
not pick a vendor from memory — infrastructure decisions go to the cost
strategist for a costed comparison first. Every trade-off is stated with the
options and what it is optimising for.

**What it actually did.** `docs/review/architecture-review.md` — a whole-system
review against the project's five hard constraints. Six CRITICAL findings,
twelve improvable, and a deliberate section recording what it checked and found
sound so the next review does not relitigate it. Its C2 is the offline gate:
"install the PWA, open it for the first time at the pass with no signal, and the
product is a login form that cannot complete." Its C4 found the entire
twenty-shop bait-and-tackle directory — the only revenue line in version one —
filtered through a live network read, so an advertiser was buying exposure that
silently vanished when the reader lost signal. Its C1 found that the workflow
holding the tests, the type-check and the secret-leak grep runs against a
hosting target nothing serves, while the real deploy path is gated by nothing.
It also commissioned the map vendor memo on slide 11.

---

## 7 — architect-shorebound

**Role.** A second, project-specific architect. Design only, never
implementation. Its output is a written plan somebody else can execute without
re-deriving the reasoning.

**Function.** Six fixed sections, in order: the problem in the owner's terms,
the shape with real files and real types, **the offline story at every step**,
the failure modes ranked with the silent ones named, the migration path, and
what it rejected — "a plan with no rejected alternative has not been thought
about." Hard limits: no implementation code, never touch the deploying branch,
and say when it does not know.

**What it actually did.** **Nothing yet — it has not run.** Its prescribed
output directory does not exist in the repository.

It exists because of a name collision. The swarm was copied in from another
project, that swarm already had an `architect`, and this one was renamed rather
than deleted. Three near-duplicate pairs are still queued to be merged. A young
system carries duplicates; the useful thing is knowing which of them has
actually earned its keep.

---

## 8 — backend-engineer

**Role.** Implements what the architect specs. It does not redesign it, and it
does not re-pick the vendor mid-task — but it must say so out loud if the
decision stops holding up once it is implementing against it.

**Function.** APIs, data models, migrations, external-source adapters. Normalise
every provider's response shape at the boundary so no vendor's field names leak
into the app. Never let a provider outage block the product. Treat a dangling
reference in the researched content as a correctness bug, not a cosmetic one.
Run the build and the type-check itself before handing off.

**What it actually did.** A review-only pass over twelve migrations, row-level
security on twenty-one tables, and four serverless functions —
`docs/review/backend-review.md`, which changed no code and no database state.

It found the admin-takeover trigger, quoted the migration source, and walked the
attack: the trigger fires on account creation, checks only the email address,
and never checks whether that address was confirmed — so the first person to
sign up with the owner's published address gets the admin row. It found the
advertiser-rates leak and explained the mechanism most people get wrong: the
migration revoked insert, update and delete but never revoked select, and
row-level security is row-scoped, not column-scoped, so the safe view protected
nothing because nothing forced anyone through it.

It also recorded nine things it checked and found sound, including that a fresh
database reset would still apply cleanly, and that account deletion cannot be
pointed at anyone but the caller.

---

## 9 — documentation-writer

**Role.** Keeps documentation a trustworthy record of what is true right now, so
nobody has to re-derive the current state from the code.

**Function.** Verify before documenting — check the claim against the code, do
not restate a prior document. Keep "this works today" and "this is planned"
visibly separate. Report back what it found undocumented or inconsistent and
could not resolve.

**What it actually did.** `docs/review/documentation-review.md` — ten drift
items, seven gaps, and a list of claims it re-verified as correct.

The two that matter most are the project's own headline numbers. "20 verified
businesses" is nine verified and eleven needing a check, by the data's own
verification field. "159 cited sources" could not be reproduced by any counting
method it tried — it got 82 under one definition and 165 under another, and
noted that the two differ by roughly double, so this is not a rounding question.
Its recommendation was to stop repeating the figure until a scripted count
exists.

It also found a live, user-facing privacy page — the one cited as an app-store
compliance artifact — naming the wrong hosting company.

**And it flagged its own limit.** It had no shell that session, so it could not
run the test suite, and it said in the report's opening note that its three
conflicting test-count figures were triangulated from static analysis rather
than measured. That sentence is worth more than the ten findings under it.

---

## 10 — infra-cost-strategist

**Role.** The standing check against cost creep and against lock-in that looks
cheap today. It researches and models; it does not decide, implement, or spend.

**Function.** Model cost against real usage tiers at each stage, not sticker
price. Check whether a vendor's terms actually permit what the product does, not
just what it costs — "a cheap vendor that can't legally support the actual use
case is not a valid option, and flag that before price." Always present tiered
options so the architect picks deliberately. Never commit spend: a signup, a
contract or a card is a human action.

**What it actually did.** `docs/review/map-vendor-options.md`, commissioned by
the architect after the owner said the map looked old and dated.

It refused to treat that as a cosmetic ticket. The security review had already
flagged both of the map's tile sources as licensing risk, so it treated "looks
dated" and "may not be licensed" as the same fix window. It recommended a
self-hosted vector basemap plus public-domain federal aerial imagery, rendered
in an open-source library — zero dollars a month at any volume, because there is
no vendor in the request path and the file can be cached offline like everything
else. It priced six alternatives in a table at two usage tiers, and named which
of them require a card on file even to activate a free tier.

It closed with: "No spend has been committed. No account has been created. This
memo is research only."

---

## 11 — marketing-creative

**Role.** The outward-facing voice. It may always draft. It may never publish
work a human has not approved, regardless of how confident it is.

**Function.** Reads the content policy first, every session. The policy is one
sentence: this product's only asset is that its content was researched instead
of guessed, so a marketing claim that outruns the content destroys the thing
being marketed. Drafts land in a queue as `status: draft`; publishing requires
both an owner approval and a separate config flag, which is off. It may not
claim the product predicts a catch, may not call a documented rule set "AI", and
may not paraphrase researched content — because paraphrasing researched content
is writing new content.

**What it actually did.** `docs/review/copy-voice-review.md` — an audit of every
user-facing string in the app, editing nothing.

Its headline finding is that the app narrates its own information architecture
to the reader. In four places, a source file's internal docblock had been pasted
onto the page as customer-facing copy: a note about how a page template is
ordered, of no use to anyone standing in a car park. In two more, a maintainer's
work order shipped as a visible caption — under every species photograph in
production, the reader was being told to "re-check them whenever the photo is
replaced."

Equally important is what it refused to touch. It listed five files it judged to
be researched safety or species content, gave a reason for each, and left them
alone — including one that reads awkwardly, noted as research to redo rather
than prose to smooth over.

*Attribution note: this report is unsigned. It identifies itself as the copy
lane and follows this agent's queue rules.*

---

## 12 — naming-brand-researcher

**Role.** Disciplined collision screening, not creative name generation. The
screening is the thing that prevents wasted design and legal work later.

**Function.** For every candidate: exact-match search, phonetic-neighbour
variants (where most real conflicts hide), category-adjacency judgement, domain
check — and an explicit statement that a research pass is not confirmed
registrar availability and never legal clearance. Report a risk tier per name
with the specific collisions and their sources.

**What it actually did.** `docs/NAMING.md` — the naming pass that killed three
of the project's own favourite names by testing them against live search
behaviour rather than taste. The commit message is the honest version: "Test the
names against real search behaviour, and kill three of my own."

The best of the three had been recommended twice before the test was run, and
turned out to be dominated in every search completion by a manga series. The
name that survived is in production, on its own domain, with the evidence
written down so it does not get reopened on a whim.

*Timing note: that pass ran before the swarm was registered by name. The agent
definition now carries the settled decision and an instruction not to reopen it
without new evidence of the same kind — which is why the stale recommendation
for the dead name, still sitting in the roadmap, was caught by the documentation
agent instead.*

---

## 13 — ops-lead

**Role.** Autonomous progress while the owner is away. One backlog item, taken
to completion, on a branch, with tests green and a written handoff.

**Function.** Confirm the baseline is green before changing anything. Take one
item and finish it rather than starting three. Never push to the deploying
branch — that is the owner's call, every time. Never invent fishing content or
business data, because a wrong phone number sends someone to a closed door.
Never spend money. When blocked, stop and write the question down.

**What it actually did.** **Nothing. It has never run.** The handoff document
records it plainly, and the log file it would create on its first run does not
exist.

It is on this slide anyway, because the interesting part is the shape of its
limits — branch-only, no spend, no deploy, no invented data, stop when blocked.
Those are the rules that would make unattended work safe, and none of them has
been tested yet. I would not turn this one loose on a client's repository until
they have.

---

## 14 — product-marketing

**Role.** Translate what is actually built and actually differentiated into
positioning. It does not invent capabilities the product does not have.

**Function.** Lead with the wedge, not the feature list. Match every claim to
build state and check with the architect rather than assuming a claim still
holds. Keep distinct audiences distinct. Put the trust principle — sponsors
cannot buy a better ranking — into external messaging, because it is a
differentiator and not merely an internal policy. Flag any copy naming a
specific business or competitor for legal review before it ships.

**What it actually did.** This deck. Its registered form has not run before now;
the existing sales kit was drafted before the swarm was registered by name.

Its rules are load-bearing regardless, and the proof is uncomfortable: the
security reviewer, not a marketing agent, found that the pitch deck told
investors the free tier is capped at two photo identifications a day. The server
does not know what tier anyone is on. Everybody gets twenty. A marketing claim
had outrun the build, and it was a security audit that caught it.

---

## 15 — project-manager

**Role.** Guards scope and reports honest status. Its brief says the project's
failure mode is not laziness, it is appetite — it builds excellent things that
were not the next thing. Its job is to notice that out loud. It says no to good
ideas.

**Function.** Three jobs and no others: scope defence against the roadmap,
honest status verified by running things rather than reading commit messages,
and keeping the plan current when the owner changes it. It may not add work, may
not build, and may not generate plan churn. Re-measure every number; never carry
one forward. Every blocker cites the audit and finding id it came from.

**What it actually did.** `docs/PROJECT_TIMELINE.md` and its structured twin —
a status record built from the git history and a fresh count of the code, with a
`verified` flag and a stated method on every single metric.

Then it did the thing that made it the most valuable agent of the run. Seven
fixes had been reported as done. It queried the live database directly and found
that the two migrations closing the two most serious security findings showed no
remote timestamp, while the vulnerable original showed one. **The fixes existed
in the repository; the vulnerabilities were still live in production.** Its
report says it in one line: "Fixing a file in the repo did not fix the
database."

It also re-measured the moat numbers and recorded the unreproducible one as
`value: null, verified: false`, with the note: "Do not repeat 159 until a
defined, scripted count exists."

---

## 16 — qa-reviewer

**Role.** The check that nothing gets marked done on a claim nobody verified.
Read-only in spirit: it may run builds and tests, it does not edit source. Its
value is independence from whoever built the thing.

**Function.** Never take a prior agent's self-report at face value — re-run the
build, the suite, the type-check yourself. Watch for silent scope drift. Treat
content integrity as the binding rule. And be explicit about what could not be
verified in this environment, because that distinction matters more than a
clean-looking report.

**What it actually did.** `docs/review/qa-review.md`. It re-ran the suite and
the build itself rather than reading the handoff, and confirmed the numbers.

Then it found the most serious defect of the entire ten-report set. An uncited
hand-written table in the code decided which structure each species was "most
likely to be working" at each spot, and where the species was not in the table
the function returned the first string in an array. QA enumerated all 104
species-per-spot recipes, listed the seven that hit that fallback, and quoted
what the reader was actually told — a confident casting instruction whose only
justification was an array index. It set that directly against the file's own
header, which promised that fields the data does not have are left out rather
than filled with a plausible-looking guess.

It closed with six things it explicitly did not verify, including that it never
opened a browser — and noted that both of its critical findings were the class
of bug this project's own lessons file says is invisible in source and obvious
in a screenshot.

---

## 17 — security-privacy-reviewer

**Role.** A gate, not an implementer. And explicitly not a lawyer, a licensed
auditor or a penetration tester — part of its job is knowing exactly where its
review ends and a human specialist's begins, and saying so rather than letting a
code review stand in for a sign-off.

**Function.** Organise findings against a real standard (NIST CSF 2.0) rather
than an ad hoc bug list, so gaps are visible and prioritised instead of found one
incident at a time. Verify the product's own trust commitments in the code, not
in the marketing copy. Note which framework functions have real coverage and
which are thin — "a false 'covered' is worse than an honest gap." End with a
go/no-go.

**What it actually did.** Two reports.

The first audited the live product. It verified the no-secrets-in-the-bundle
claim against production rather than a local build — downloading the deployed
JavaScript and grepping it — and it confirmed the advertiser-data leak by
actually issuing the request with the public key and getting nine rows back. It
traced every use of the user's coordinates to confirm none reaches a network
call, and confirmed that photo uploads are re-encoded through a canvas, which
strips location metadata. Verdict: **no-go for launch, go to continue
development**, narrowed to three blocking findings. It routed six questions out
of the swarm entirely to named human specialists — including whether a 9px
sponsorship disclosure satisfies advertising regulators, which is a legal
determination and not a design one.

The second audited a supply-chain risk introduced on the machine itself: a
third-party server the owner had added to their own tooling. It downloaded and
read the published bytes without ever executing the entry point, found an
arbitrary-file-write flaw via path traversal, and delivered a conditional
verdict — safe only if the version is pinned, because the invocation as
configured fetches and runs whatever is newest at launch with no review. It also
answered the question the owner actually cared about, separately and plainly:
nothing on this machine should be considered compromised, and here is the
evidence.

---

## 18 — test-engineer

**Role.** Makes regressions impossible to ship silently. It writes the suite; it
does not do open-ended manual review.

**Function.** Concentrate coverage where this specific product is most likely to
break in ways that matter, not where testing is easiest. Every external
integration gets a contract test against a documented response shape. Every
matching rule gets its near-miss cases. And do not claim coverage you do not
have — if a dependency is unavailable, say the test has not been run against the
live one.

**What it actually did.** `docs/review/test-coverage-review.md`. It confirmed
the suite was fully green with no skipped tests and no lowered thresholds — and
then said the more useful thing: there is no coverage configuration at all, so a
large uncovered module produces no signal whatsoever. "Right now it's not a
decision, it's a gap."

Its top finding, ranked by the cost of a silent regression: the single module
that turns raw government tide and forecast payloads into what every one of the
25 spots displays — 532 lines of pure functions, every failure path handled by an
explicit branch — has zero tests. A daylight-saving error in it would show the
wrong tide stage to someone standing on a jetty, and nothing would catch it.

It also pointed out that the two constraints the project cites most often — no
coordinate in a network call, no secret in the shipped bundle — are true by
inspection and not by any test that would fail if they stopped being true, and it
described exactly the static check that would fix that, in the style the codebase
already uses elsewhere.

---

## 19 — ui-design

**Role.** The visual work — layout, illustration, typography, motion, and the
CSS that carries them.

**Function.** Work only in the design system's tokens, which is enforced by a
test that fails the build on a hard-coded colour. Both light and dark themes are
equally real. Original inline artwork only: no new dependencies, no external
assets. Accessible or it does not ship. And verify in a real browser at three
viewport widths in both themes before reporting, because "a design report that
was not verified in a browser is a guess."

Its brief carries the reason it runs on the largest model, in the owner's own
words: earlier design rounds were rejected as "really weak, like a five-year-old
did them," and the diagnosis was that they were silhouettes rather than ideas —
a generic outline of a category instead of the specific observed thing. The
standard it was given is that every drawing needs one specific observed detail
that proves someone who knows the subject made it.

**What it actually did.** **No report of its own from this run.** The flow review
records that a visual lane was running in parallel, but nothing from it landed in
the review folder and no commit on the branch is a visual change.

The nearest thing to visual work in this run was a map replacement that was built
and then parked. See slide 22.

---

## 20 — ui-designer

**Role.** Screens, components, layouts, and interaction and flow design.

**Function.** Make the product's actual differentiation visible in the
interface — if the system produces a ranked result, the interface must show
*why*, not just a score. Mobile-first if the brief says so. Every screen needs a
real empty state, loading state and error state, not just the happy path.

**What it actually did.** `docs/review/ux-flow-review.md`, the flow and
information-architecture lane. It drove a real browser at phone and desktop
widths, took 141 screenshots plus computed-style and bounding-box measurements,
and reports that five of its eight critical findings were invisible in the source
and obvious in a picture.

It measured the flagship location page at 9,581 pixels tall on a phone — 13.5
screenfuls, with no in-page navigation of any kind — and showed that the two
questions the product exists to answer, what to tie on and what will hurt you,
sit near the bottom. It measured the tackle labels at 9 pixels, using a design
token whose own comment says it is only for labels drawn inside a diagram; the
same 9 pixels carries the "Sponsored" disclosure beside a 19-pixel shop name,
which it handed straight back to the advertising-law question the security review
had already opened, with the measurement that question needs. And it caught the
app printing a raw parser exception — "Expected 3 parts in JWT; got 1" — into the
single most prominent card on the main screen.

**Its limits, on the same slide.** Its tool list names four design-surface tools
that the definition file itself calls "illustrative" and that have never been
reconciled against the actual server. Its "Before implementing" section is an
empty heading. Nothing has been produced through the design surface — the design
project for this brand contains one support file and nothing else. It reviewed
well; it has never built.

*Attribution note: this report is unsigned. It identifies itself as neither the
visual lane nor the copy lane, both of which were running in parallel, which
leaves this one.*

---

## 21 — When they disagreed

**Title:** Convergence is evidence. Contradiction is the interesting part.

**Body:**

**Three lanes landed on the same finding independently.** The architecture,
security and QA reviews each arrived, by different routes, at the fact that the
production deploy runs through a path where none of the checks execute. Nobody
coordinated that. Three independent confirmations of one finding is a stronger
signal than one confident report.

**Three reviews were wrong about the same thing.** All three cited a media test
as evidence that image licensing was handled. Later work proved that test cannot
catch the problem at all: it filters for images that already declare a licence,
so an image with no licence field is invisible to it. Seventeen images had no
licence recorded at all. A test that passes proves only what it looks at, and
three careful readers still took it at face value.

**The fix for the offline gate was itself defective.** Letting a signed-out
reader through when the device is offline was correct — but the online check was
live, so the moment one bar of signal returned, the reader was thrown back to a
sign-in form mid-page, losing his place. Caught and corrected the same day with a
latch that holds for the life of the page; the reasoning is written into the
file, not just the commit. *The repository does not record which agent found
this, so this deck does not claim one.*

**"Fixed" and "shipped" turned out to be different claims.** Seven fixes were
reported done. The status agent queried the live database and found two of them
had never been applied to it.

**And a human decides.** Every report ends with a list of calls only a person can
make. The account gate was flagged as a product decision about the sign-up
funnel, not an engineering one, and left open deliberately.

**Speaker note:** This is the slide that separates this from a demo. Do not rush
the media-test example — an audit that later proves itself wrong, in writing, is
the strongest evidence the record is honest.

---

## 22 — What I have learned not to trust it with

**Title:** The parts that did not work

**Body:**

**One agent has never run at all.** The unattended one — the one designed to
make progress between sessions and push to a branch on its own. Its safety rules
are written and untested. I would not point it at a client's repository on that
basis.

**One agent cannot do the job its definition describes.** The interface agent's
design-surface tools are self-declared illustrative and were never reconciled;
its "before implementing" section is an empty heading; it has produced no design
output. It reviews well and it has never built.

**One agent is a duplicate that has not earned its place.** The swarm was copied
from a different product and had to be reconciled — the first commit on this
branch strips that other product's assumptions back out of eight agent
definitions. Three near-duplicate pairs remain unmerged.

**A migration was built and then reverted.** The map was rebuilt on a
correctly-licensed vector basemap; it did not work and was parked, with the code
preserved as text files rather than deleted. Its own comments record that the
first version rendered no attribution control at all — a licence-condition
breach that looks exactly like a working map.

**An agent worked without a tool it needed, and said so.** The documentation
agent had no shell that session, could not run the test suite, and wrote that its
figures were inferred rather than measured — in the opening note, not a footnote.

**And nothing has shipped.** Nine commits of fixes sit on a branch. The
deploying branch has not moved. The live site still runs the code the audits were
written against, and the record says so on its own front page.

**Speaker note:** This is the most persuasive slide in the deck. Deliver it
without apology or hedging. Anyone who has actually run these systems will
recognise every line, and anyone who has not will notice that a flawless account
was available and was not given.

---

## 23 — What this looks like at your company

**Title:** Six rules that transfer, whatever you build

**Body:**

**1. Parallel and independent, not a chain.** Several lanes read the same system
at once, each with its own brief and a fresh context, none seeing the others'
reports first. It costs no more wall-clock time than one pass and it removes the
shared blind spot.

**2. The reviewer never grades its own work.** The agent that wrote the code is
too close to it. Reviewing agents here are read-only by design and re-run the
build and the suite themselves rather than trusting a handoff.

**3. Every finding cites a file and a line.** That is what makes a report
checkable in a minute instead of believed on faith — and it is what let a later
agent prove three earlier ones wrong about a test.

**4. Name what you did not verify.** Every report here carries a section for it.
The reports that admit their gaps are the ones worth acting on.

**5. A human adjudicates, and some questions leave the system entirely.** Legal
review, formal compliance, adversarial security testing — these get flagged and
routed out, never quietly cleared by a code review.

**6. A fix in the working tree is not a fix in production.** Check against the
running system — the live database, the deployed function, the served bundle —
not the diff. This one came out of a real finding on this project, and it
generalises further than anything else on the list.

**None of this is exotic tooling.** Multi-agent review is a crowded field and
getting more so. The difference between a swarm that produces noise and one that
produces the four findings on slide 2 is entirely in the briefs, the constraints
and the verification — which is the part that has to be built for your codebase,
by someone who has read it.

**Speaker note:** Rule 6 is the one to leave them with. It is concrete, it is
cheap to adopt, and most teams running AI review do not do it.

---

## 24 — Close

**Title:** What I would do in your first two weeks

**Body:**

**Week one — write the brief the agents will be held to.** Read the codebase and
the product, and turn its real constraints into something checkable: the rules
that must never be broken, the claims the product makes that the code has to
keep, the mistakes already made that must not repeat. This is the artefact
everything else depends on, and it is the part that cannot be bought
off-the-shelf.

**Week two — stand up three lanes and run them in parallel on one live
surface.** Architecture, security and test coverage is the highest-yield opening
three. Hand back written reports that cite file and line, ranked by the cost of
being wrong, with a separate list of what only a person can decide — and a
separate list of what could not be verified.

**Then hand it over.** The value here is a set of operating rules your team owns
and can run without me. If it only works while I am in the room, I have built the
wrong thing.

**What this is not.** It is not a replacement for your engineers, your lawyer or
a penetration test. It is a way of finding and framing problems quickly, with
evidence attached, and of being honest about which ones it cannot close.

**Speaker note:** End on the boundary sentence. It is the same discipline the
whole deck argues for, applied to my own pitch.

---

# Flags before this goes external

Per `marketing/CONTENT_POLICY.md` and the product-marketing brief:

1. **Named third parties.** This script names no competitor and no bait shop. It
   names infrastructure vendors only in generic terms ("a self-hosted vector
   basemap", "a third-party server"), and deliberately does not name the
   third-party package audited on slide 17, its maintainer, or the maintainer's
   email address — all of which appear in the underlying report. **If a designer
   or the owner adds a vendor name back in, that slide needs a legal read before
   it ships.** Nominative use is normal practice, but it is not clearance.

2. **Personal data.** The admin-takeover finding is described as "the owner's
   published email address" throughout. The literal address appears in the
   source migration and in the backend review. **It must not appear on a slide.**
   The same applies to the stray test account recorded in the handoff.

3. **The two live vulnerabilities.** Both were live in production when the
   status report was written, and the fixes are on an unmerged branch. **Confirm
   with the owner that both are closed in production before this deck is shown to
   anyone outside the room**, and if they are not, either delay or say so on
   slide 2. Showing an audience a working exploit path against a running site is
   a different act from showing them a finding.

4. **Numbers I would not put on a slide.** "20 verified businesses" and "159
   cited sources" are both in the project's own documents and both were disproved
   by agents in this run. They are not used here, and should not be added.

5. **Claims I could not verify and therefore did not make.** Which agent found
   the offline-latch defect (slide 21) — the repository does not record it.
   Whether the interface agent's design tools are functionally broken as opposed
   to merely unreconciled — slide 20 states only what the file itself says.
   Authorship of the flow review and the copy review — both reports are unsigned
   and both slides carry an attribution note.

6. **Freshness.** Slides 2, 21 and 22 describe a state as of the last recorded
   verification, 25 August 2026. Test counts, branch state and production status
   move. **Re-run the verification commands at the foot of
   `docs/PROJECT_TIMELINE.md` before presenting**, and correct any number that
   has moved rather than presenting a stale one — which is the discipline the
   deck is arguing for.
