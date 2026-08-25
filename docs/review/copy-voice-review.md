# In-app copy and voice review

Read-only audit of every user-facing string in `src/pages/` and `src/components/`.
No source file was edited. Nothing here goes to `marketing/queue/`; nothing is published.

Binding inputs: `marketing/CONTENT_POLICY.md`, `CLAUDE.md`, `marketing/NARRATIVE.md`.

## The brief

The owner's words: *"many things i said i wanted it to sound like this were taken
virbatum, use the best language that speaks to our target audience."*

Read literally, that is a specific and correct diagnosis. When he described in
conversation how a screen should **feel** or how a page should be **ordered**, that
description was pasted into the product as literal copy. The app therefore contains
sentences that are really **direction wearing the costume of finished copy** — a
note-to-self shipped as a headline, and in two places a note to the *maintainer*
shipped as a visible caption.

The pattern is real and it clusters. It is not scattered clumsiness.

## The line I did not cross

Two categories, never confused:

- **Ours, rewritable.** Headings, section labels, buttons, empty states, errors,
  loading text, onboarding, chrome, sign-in prose, settings, tooltips, alt text.
- **Researched, untouchable.** Anything sourced from `src/data/` — species, seasons,
  tackle, rig strings, spot advice, access notes, safety guidance, shop details,
  habitat text. Quoting is fine. Re-wording is not.

`CONTENT_POLICY.md`: *"Quote the researched string; never paraphrase it, because
paraphrasing researched fishing content is writing new fishing content."*

### The boundary calls I had to make, and why

The brief flagged five files as genuinely ambiguous. My calls:

| File | Call | Reasoning |
|---|---|---|
| `src/components/location/Cautions.tsx` | **DO NOT TOUCH** | It is general rather than spot-specific, but it is *safety guidance*, which `CLAUDE.md` names explicitly in the never-invent list. "Water funnelling through a gap in a bar is the classic rip" is a claim about how water behaves. Rewriting it for voice is writing new safety content. The file's own comment at line 84 shows a season claim was already stripped for exactly this reason. It also reads well. Left alone. |
| `src/pages/Tides.tsx` `STAGES` | **DO NOT TOUCH the `body`/`doThis` prose** | General tide tactics, no spot/species/season claim — technically rewritable. But it is the strongest writing in the app ("This is the laziest productive fishing there is"). Nothing to fix. I propose changes only to the *chrome around it*. |
| `src/components/location/zones.ts` | Structural, rewritable in principle | No changes proposed. It makes structural claims and reads cleanly. |
| `src/components/species/speciesContent.ts` | **DO NOT TOUCH** | Species-specific factual claims throughout. Researched content in all but storage location. |
| `src/components/care/hazardContent.ts` | **DO NOT TOUCH** | Safe-handling guidance. Same reasoning as `Cautions.tsx`. |

One consequence worth stating plainly: **several things that read awkwardly are things
I deliberately did not fix.** They are in section C as research to redo.

---

## A. DIRECTION-AS-COPY

The headline category. Ordered by severity.

### A1. The app narrates its own information architecture to the reader

The clearest instance of the owner's complaint. In four places the copy explains the
*page template's running order* — which is a design decision, made for the designer's
benefit, of no use to a man in a car park. In two cases the sentence is nearly a
verbatim lift of the file's own docblock.

**`src/pages/Water.tsx:34-35`**
> Current: "A handful of things on this coast hold fish, and every one of them announces itself if you know the shape. **Diagram first, then the real thing, then what to do about it.**"

Compare the file's docblock, lines 13-16: *"every module leads with the annotated
diagram, then real photographs, and only then the three questions."* The brief became
the copy.

> **Proposed:** "A handful of things on this coast hold fish, and every one of them announces itself if you know the shape. Learn the shape once and you will spot it on water this guide has never heard of."

Why: keeps the real promise, drops the table of contents. The second sentence now earns its place by saying what the reader *gets*, which is transferable skill — the exact thing a displaced angler is short of.

**`src/pages/Rigs.tsx:56-57`**
> Current: "Schematics scroll sideways on a narrow screen — the order of the components is the point."

This is the docblock's layout rationale (lines 9-12: *"given its own horizontal scroll container — a wrapped schematic reads as two rigs"*) leaked onto the page. It explains a CSS decision to an angler.

> **Proposed:** "Read from the reel out. What matters is the order, and how little sits between your line and the bait."

Why: says the useful half — how to read a schematic — and drops the apology for the scrollbar. Note this partly duplicates line 24-25; if the owner prefers, delete line 56-57 outright. **Deleting it is the better fix.**

**`src/pages/FishList.tsx:36-37`**
> Current: "…Every page opens on identification, then habitat, then the tackle, then how to release it in shape to swim away."

> **Proposed:** "Every page starts with how to know it for certain, because everything after that depends on getting the name right."

Why: converts a running order into a reason. Same information, but it now argues for itself.

**`src/pages/Care.tsx:146-147`**
> Current: "Each card runs identification, then the risk, then how to handle it. The chip says how the animal hurts you — in words, not only in colour."

> **Proposed:** "Know it, know what it does to you, know where to put your hands. The chip says how the animal hurts you — in words, not only in colour."

Why: the second sentence is excellent and stays. The first becomes the actual sequence a person needs rather than a description of the card layout.

### A2. A maintainer's note shipped as a visible caption

**`src/pages/FishDetail.tsx:117-120`**
> Current: "marks are placed against the photograph in this plate · **re-check them whenever the photo is replaced**"

The second clause is an instruction to whoever edits the data. It is on screen, under
every species photo, in production. The angler is being handed a content-maintenance
task.

> **Proposed:** "marks are placed on this photograph, not on a drawing"

Why: keeps the genuinely valuable claim — these are real positions on a real fish, not
an illustrator's guess, which is a credibility point worth making — and removes the
work order. The re-check instruction belongs in a code comment or a test, not a caption.

### A3. Production notes in image captions

`Plate`'s `caption` prop is documented at `src/components/ui/Plate.tsx:9` as *"Shot
brief shown in the caption chip."* A shot brief is direction to a photographer. Two of
these reach the reader.

**`src/pages/Water.tsx:66`**
> Current: `caption="real example"`

Labelling a photograph "real example" tells the reader nothing and quietly implies the
other images might not be real.

> **Proposed:** `caption="photographed on this coast"`
> **Or, better:** drop the caption entirely and let `MediaCredit` on line 67 carry it. The credit already names the source, which is the honest provenance.

**`src/pages/Tides.tsx:177`**
> Current: "reference · no licensed photo in this slot yet"

An internal asset-status note, rendered over the page hero. It is honest, which is why
it survived, but it is written in production vocabulary ("slot", "licensed") and it
draws the eye to an absence the reader had not noticed.

> **Proposed:** remove the caption. The band works as a plain colour field.
> **If a caption is wanted:** "schematic · not a photograph of any one place"

Why: the second version states something true and useful about the *diagrams below it*
rather than apologising for an unfilled asset slot.

### A4. Headings that describe the copy instead of being it

**`src/pages/Tides.tsx:310`**
> Current: `<Callout title="The whole idea in one line">`

This is the writer telling himself what to put in the box. The reader does not need the
box announced.

> **Proposed:** `title="Moving water, not high water"`

Why: states the actual thesis, and it is the one misconception a freshwater angler
arrives with. It also matches the page's own hero chip, "Moving water wins."

**`src/pages/Tides.tsx:384`**
> Current: `<Callout tone="info" title="Both moving stages are prime — in general">`

The trailing "— in general" is an author's hedge, pinned to a heading.

> **Proposed:** `title="Your spot overrides this page"`

Why: the callout body already says the general rule; the *point* is the exception. The
heading should carry it. Hedge becomes instruction.

### A5. Internal plumbing explained to the reader

**`src/pages/IdentifyFish.tsx:449-453`**
> Current: "Each identification is a real, paid call to an AI service on **the site owner's account**, so it is capped. The guide itself has no limits…"

The owner's billing arrangement is not the reader's business, and mentioning it invites
him to feel he is spending someone's money. The honesty instinct is right; the detail is
the wrong detail.

> **Proposed:** "Photo ID is capped because each one costs money to run. The guide itself is not capped — the marks that separate these species are on the species pages, and they work with no signal at all."

Why: same honesty, no invoice. The redirect to the offline content is stronger than the
apology.

**`src/pages/IdentifyFish.tsx:432`**
> Current: `'rate-limited': 'That is enough for now'`

Reads as a scolding from the app.

> **Proposed:** `'rate-limited': 'Photo ID is capped for now'`

Why: names the system's limit rather than the user's behaviour.

---

## B. VOICE DRIFT

Copy that is fine, but sounds like a generic app rather than this one.

### B1. Mixed grammatical person on the home screen

The app speaks as "I" in one place and as a neutral system everywhere else, and the
buttons flip between the user's voice and the app's.

**`src/pages/Home.tsx:435-437`**
> Current: "Reading from {station}. **Tell me where you are and I will pick** the closest of the {n} spots that fishes this tide — your location never leaves your phone."

> **Proposed:** "Reading from {station}. Say where you are and this picks the closest of the {n} spots that fishes this tide — your location never leaves your phone."

Why: nothing else in the app has a first person. An app that says "I" is a chatbot, and
this product's whole argument is that it is a documented rule set rather than a
personality.

**`src/pages/Home.tsx:413`**
> Current: `Take me there`

The user's voice, next to `Open the location page` (line 539) in the app's voice, on the
same screen.

> **Proposed:** `Open {spot name}` — or plain `Open the spot`

Why: consistent register, and naming the destination beats a pronoun.

### B2. Generic section labels

**`src/pages/Water.tsx:118`** — `<SectionTitle>Next</SectionTitle>`
> **Proposed:** "Where this water is"

Why: "Next" is wayfinding furniture from any app. The links below are locations, rigs
and species — the section is about putting the habitat knowledge somewhere.

**`src/pages/Tides.tsx:419`** — `<SectionTitle>Your tide stations</SectionTitle>`
> **Proposed:** "The stations these spots read from"

Why: they are not the reader's stations. The possessive is app-speak, and the honest
version is also more informative — it tells him the mapping exists.

**`src/pages/Rigs.tsx:21`** — `<div className="lab lab-blue">Rig + knot school</div>`
> **Proposed:** "Rigs + knots"

Why: "school" frames the reader as a student. He is not a beginner — that is the
founding distinction of the product.

### B3. Doubled question on the species index

**`src/pages/FishList.tsx:45-50`**
> Current: hidden `<h2>` reads "Not sure what you caught?" and the visible paragraph immediately below opens "Not sure which of these you caught?"

A screen-reader user hears the question twice, near-verbatim.

> **Proposed:** keep the `<h2>` as is; change the paragraph opening to: "Take a photo and get a best guess at the species, plus a warning if it is one to keep your hands off. It is an estimate from a machine, not an identification — a starting point for you to confirm."

Why: removes the echo, loses nothing. The rest of that paragraph is already right.

### B4. Weak close on the shop directory

**`src/pages/Shops.tsx:100-101`**
> Current: "Hours and stock change, especially since the 2024 storms. Call before you drive. **If something here is wrong, we want to know.**"

> **Proposed:** "Hours and stock change, especially since the 2024 storms. Call before you drive. If you find one closed, moved or gone, tell us — that is the single most useful thing anyone sends in."

Why: "we want to know" is a suggestion box. The replacement says what to report and why
it matters, and it matches the stronger wording already live at `Support.tsx:88-92` and
`Welcome.tsx:674-676`. Consistency across three surfaces that make the same request.

### B5. One word, two destinations, in the main navigation

**`src/components/Layout.tsx:20` and `:43`**

The mobile tab bar and the desktop nav both carry a item labelled **"Water"**. They go
to different pages.

| | Label | Destination |
|---|---|---|
| Mobile tab (line 20) | "Water" | `/tides` |
| Desktop nav (line 43) | "Water" | `/water` |

A reader who learns the app on his phone and then opens it on a laptop clicks the word
he already knows and lands somewhere else. The file's own docblock (lines 33-36) shows
this was thought about — `/tides` was pulled from the desktop nav because "Tides +
Water" and "Read Water" *"read as two entries for one thing"* — but the mobile tab was
never updated to match the resolution.

> **Proposed:** mobile tab at line 20 becomes `{ to: '/tides', label: 'Tides' }`.

Why: the two pages are genuinely different — `/tides` is the live four-stage reference,
`/water` is the habitat modules — so they need different words. "Tides" is also the
higher-intent term for a phone user, and it matches the researched SEO ground truth
(`tide chart bradenton`, `tide chart sarasota`).

**Note for the architect:** whether the mobile tab bar should reach `/water` at all is
an IA question, not a copy one. I am flagging the collision, not resolving the
structure.

**`src/components/Layout.tsx:22` vs `:48`** — the same page is "Care" on mobile and
"Handle With Care" on desktop.
> **Proposed:** "Handle With Care" is the product's own name for it, used on Welcome, Home, FishList and FishDetail. If the tab is too narrow for three words, use "Care" as a visible truncation but keep `aria-label="Handle With Care"` so the accessible name matches the rest of the app.

### B6. Three words for one action

The same "the request failed, press to repeat it" button is labelled three ways:

- `src/components/ui/index.tsx:123` — "Try again"
- `src/components/NearYou.tsx:97` — "Try again"
- `src/components/conditions/LiveTide.tsx:339` — "Retry"

> **Proposed:** standardise on "Try again" and change `LiveTide.tsx:339`.

Why: "Retry" is machine vocabulary; "Try again" is what a person says. Two of the three
already agree.

### B7. "No problem" — the app being gracious about a decision that was never a problem

**`src/components/NearYou.tsx:74`** and **`src/pages/Start.tsx:167-168`** both open the
location-denied state with "No problem".

> **Proposed, `NearYou.tsx:74`:** "Location stays off. Browse all {n} spots by area instead, or use the pick above. To turn it on later, allow location for this site in your browser settings."
> **Proposed, `Start.tsx:168`:** "Browse the bait shops or all {n} spots by area instead."

Why: "No problem" reassures the reader about something he was not worried about, which
quietly implies he should have been. Declining a permission is an ordinary choice. The
rest of both sentences is already right — just delete the opening.

### B8. A stale accessible label that contradicts the visible copy

**`src/components/location/art.tsx:911` and `:914`**
> Current: "Predicted tide curve for **the reference station** over the next 36 hours…"

The chart is rendered with the *picked spot's* station data (`Home.tsx:172`), and the
visible card goes out of its way to name that station and warn that tide times shift
along the coast (`Home.tsx:205-208`). The screen-reader user is told the wrong
provenance — the one thing the sighted design was careful to get right.

> **Proposed:** take the station name as a prop and render "Predicted tide curve for {station} over the next 36 hours…"; fall back to "for this spot's station" when the name is absent.

Why: a11y parity on the app's central credibility claim. This one needs a small code
change, not just a string swap.

---

## C. RESEARCH TO REDO — report only, not rewritten

Nothing in this section was reworded by me.

### C1. `src/pages/Start.tsx:30-35` — hand-written synthesis of researched tackle

`STARTER` hardcodes a starter rod/reel/line/leader kit with explanatory notes:

- `"7 to 7'6\", medium or medium-heavy"` / `"Covers snook, redfish, trout and snapper. Only tarpon asks for heavier."`
- `"3000–4000 size"` / `"Go 4000–5000 if snook is the target."`
- `"15–20 lb braid"` / `"20–30 lb if you are fishing pilings or bridges."`
- `"20–30 lb fluorocarbon"` / `"Not optional here. 30–40 for snook, and a 30–60 lb bite leader for anything with teeth."`

The file's own docblock claims these are *"the species pages' own `gear` and `leader`
strings"*. **They are not** — they are a human summary across eleven species records,
typed as literals.

I checked it against `src/data/fish.ts` and **it is accurate today** (snook is
`4000–5000` / `30–40 lb fluoro`; tarpon is `7'6–8 H`; Spanish mackerel carries the
`30–60 lb mono bite leader`). So this is not currently wrong. It is *unanchored*: the
moment any species record changes, this page silently disagrees with the species page it
claims to quote, and nothing fails.

Same shape at `Start.tsx:130-147` (hooks, weights, lures, bait).

**Recommendation:** either derive it at render time from `fish.ts`, or mark each line
with the species record it came from and add a test asserting the two agree. Not a copy
fix — do not let a writer touch these strings.

### C2. `src/components/location/Cautions.tsx:165-167` — hardcoded hazard roll-call

> "Catfish, stingrays, lionfish, barracuda, sharks and puffers all turn up on this coast."

Six names, hand-typed, duplicating `getHazards()`. Correct today. Hand-maintained, so it
will drift the first time a hazard is added or removed.

**Recommendation:** render from `getHazards()`. `Welcome.tsx` already does this correctly
and its docblock explains why (lines 19-22).

### C3. `src/pages/FishList.tsx:30` vs `:61` — two different claims about one list

The eyebrow says **"Most-targeted species"**; the section heading below says **"Most
commonly caught"**. Those are different assertions, and the lede between them makes a
third: *"the species inshore anglers on this coast actually fish for."*

"Most commonly caught" is a frequency claim with nothing behind it — there is no catch
data in this system, which is the same reason `CONTENT_POLICY.md` forbids catch
prediction. I did not choose between them because picking one is a content decision.

**Recommendation:** the owner should decide which claim the research supports, and the
other two surfaces should be made to match it.

---

## D. Factual defects found while reading

Not voice problems. Copy problems, and more serious than anything in A or B, because
each one is the product contradicting itself in public.

### D1. `src/pages/IdentifyFish.tsx` — the species counts are stale and wrong

The guide ships **11 species pages** (`src/data/fish.ts`) and **6 hazards**
(`src/data/hazards.ts`). `src/data/namedTargets.ts` documents that sheepshead, pompano,
jack crevalle and Spanish mackerel **were promoted to full species pages** and that
**kingfish is the only named-but-undocumented species left.**

The photo ID page has not been updated:

| Line | Current | Truth |
|---|---|---|
| 129-130 | "It knows the **five** target species, the six worth not grabbing, and the **five more** this guide names at its locations without documenting — sheepshead, pompano, jack, Spanish mackerel and kingfish." | 11 species pages; **one** named-only species, kingfish. Four of the five it lists as undocumented now have pages. |
| 158 | "the **five** species pages" | 11 |
| 288 | button: "The **five** species" | 11 |

This is precisely the failure `Welcome.tsx:19-22` was written to prevent: *"A landing
page that says '25 spots' while the guide holds 24 is exactly the failure
`marketing/CONTENT_POLICY.md` exists to prevent, and hardcoding is how that happens."*
`Welcome.tsx` counts from data at render. `IdentifyFish.tsx` does not.

> **Proposed for 127-131:** "Photograph the fish and get a best guess at what it is, which of this guide's species it matches, and whether it is one to keep your hands away from. It knows the {fish.length} species with a page here, the {hazards.length} worth not grabbing, and kingfish, which this guide names at its spots but has not documented yet."
>
> **Proposed for 158:** "the {fish.length} species pages"
> **Proposed for 288:** "All {fish.length} species"

Counts must be interpolated, not typed. `getFishList()` and `getHazards()` are already
imported elsewhere in the app.

Related, same class: **`src/pages/NotFound.tsx:11`** hardcodes "Six rigs and the knots
that hold them" while `Rigs.tsx:22` derives the count from data.
> **Proposed:** "The rigs, and the knots that hold them" — no number, so nothing to drift.

### D1b. `src/components/NearYou.tsx:53` — a hardcoded spot count, in a file that already interpolates it

> Current: "Use your location and this ranks the guide's **25 spots** by how close they are…"

Twenty-two lines later, the same component writes `browse all {locations.length} spots`
(line 75). One file, both approaches, and only one of them survives a data change.

> **Proposed:** "Use your location and this ranks the guide's {locations.length} spots by how close they are and what the water is doing right now."

Same class as D1. `locations` is already a prop on this component — the fix is one token.

### D2. `src/pages/Privacy.tsx` — the page contradicts itself about accounts

The page correctly documents the account system at lines 29-54 (email, password hash,
deletion). Then:

- **Line 137-142** — heading "**What we do not do**", first bullet: "An account, which is an email address and a password hash." A thing the app *does*, filed under things it does not do.
- **Line 161-163** — "Because the app **holds nothing about you**, there is no historic data for a future policy to apply to."
- **Line 176-178** — "A data request is the one thing we cannot usefully answer: **we have no record of you** to produce, correct or delete."

The last two are flatly false as written, and they are false in the direction that
matters: they deny the existence of data the app is in fact holding. On a page whose
entire value is being believed, and with a GDPR/CCPA subject-access claim sitting in it,
this is the most damaging copy in the app.

> **Proposed, line 137 heading:** "What we keep, and what we don't"
> **Proposed, first bullet:** move it out of the list and make it the lead sentence: "We keep one thing about you: an account, which is an email address and a password hash. Nothing else about you is required, and you can delete it yourself."
> **Proposed, line 161-163:** "If this changes, the date at the top changes with it. The only record we hold is your account, and deleting it from your settings removes that record for good."
> **Proposed, line 176-178:** "Want a copy of what we hold, or want it gone? It is your email address, your password hash and the few preferences listed above — and you can export nothing and delete all of it yourself from your settings page. Email us if you would rather we did it."

This needs a legal read as well as a copy read. I have proposed wording; I would not
ship it without the owner confirming it matches what the database actually stores.

### D3. `src/pages/Privacy.tsx:127` — wrong host named

> Current: "**Hosting** is GitHub Pages, which serves the app itself."

`CLAUDE.md` says the app is live at `shorebound.fish` on **Cloudflare Workers**,
deploying from `main`.

> **Proposed:** "**Hosting** is Cloudflare, which serves the app itself."

Naming the wrong data processor on a privacy page is a compliance defect, not a typo.
Worth confirming against the actual deploy before changing.

### D4. `src/data/contact.ts:13` — support address on a domain the product does not use

`SUPPORT_EMAIL = 'support@shorebound.app'`, but the site is `shorebound.fish`. This
address is printed on Support, Privacy, Settings and Welcome.

The file's own comment (lines 8-11) says the address *"must be a mailbox that actually
receives"* and that setting it to `null` is the correct move if it stops working.

**For the owner:** does `support@shorebound.app` receive? If not, this is four pages
printing a dead address, and `null` is the honest setting until `.fish` mail exists.
Not something I should change on my own judgement.

### D5. `src/components/ErrorBoundary.tsx:54` — raw exception text shown to the user

The boundary renders `{error.message}` in a `<pre>` with no framing. A React or network
exception string is not English and can leak internals.

> **Proposed:** keep it, but label and demote it: put it behind a `<details>` with a summary reading "Technical detail (for a bug report)".

Why: the surrounding copy (lines 41-44) is good and reassuring; the raw stack text
undercuts it. Keeping it available serves the bug report without making it the loudest
thing on the screen.

---

## E. The honest-absence surfaces

`CLAUDE.md` says an unresearched field stays empty and the words around that emptiness
should be plain and unapologetic. **This is the app's strongest area. Nothing here needs
rewriting.** Not one "Oops!", not one exclamation mark, no cartoon apology anywhere in
the codebase.

| Surface | String | Verdict |
|---|---|---|
| Empty structure data | `LocationDetail.tsx:441` "No structure is recorded for this spot yet, so there is nothing honest to draw." | Exemplary. This is the sentence the rest of the app should be measured against. |
| Unchecked access notes | `LocationDetail.tsx:326-328` "…have not been checked yet, so the guide does not state any." | Right. States the gap, then gives an instruction. |
| Empty season / daypart | `LocationDetail.tsx:360`, `:370` "Not documented for this spot yet" | Right. "Yet" does the work. |
| No sources attached | `LocationDetail.tsx:552-554` "No source has been attached to this spot's tactics yet — treat them as a starting point rather than a citation." | Right, and unusually honest. |
| Live tide unavailable | `Home.tsx:136-145`, `:462-469` "No live reading right now. The guide still works." | Right. Names what still works, which is the offline-first promise doing its job. |
| Photo ID cannot identify | `IdentifyFish.tsx:310` "Couldn't confidently identify this" + hazard fallback at `:321` | Right, and the "treat it as if it bites" fallback is a genuinely good safety decision. |
| Photo ID not configured | `IdentifyFish.tsx:151-160` | Right. Redirects to the offline content. |
| Shop hours unconfirmed | `ShopCard.tsx:61` "Hours not published — call ahead." | Right. |
| Directory switched off | `Shops.tsx:54-55` "The directory is not switched on yet…" | Right. |
| No ID marks documented | `FishDetail.tsx:144` "Identification marks for this species are not documented yet." | Right. |
| Map failed | `LazyMap.tsx:46-50` "…everything else here works without it." | Right. |
| No filter matches | `Locations.tsx:129` "Nothing matches those filters" | Right. |
| No species page for a target | `TargetRecipe.tsx:71` "No species page in the guide yet — tackle only." | Right. Names the gap and the thing that survives it. |
| No hazard ID notes | `HazardCard.tsx:41-42` "…not documented yet — use the photograph and treat it as unidentified." | Right, and it fails safe. |
| Live conditions down | `LiveTide.tsx:234-236`, `:243-244` "The tide stages and the per-spot plans below do not need them." | Right. |
| Cached data going stale | `LiveTide.tsx:324` "Cached {n} — may be out of date." / `:332` "Showing the last good copy — refresh failed." | Right. Rare and good: it distinguishes stale-but-shown from failed-and-hidden. |
| Offline, app-wide | `Layout.tsx:139-140` "Offline — the full guide still works. Live tide and weather are paused." | Right. "Paused" rather than "failed" is the correct word. |
| Out of coverage area | `NearYou.tsx:104-106` "You are outside the stretch this guide covers…" | Right. |
| Bait directory empty | `BaitNearby.tsx` renders nothing rather than an empty "Bait nearby" heading (see its docblock) | Right, and the reasoning in the comment is correct: an empty section headed "Bait nearby" reads as "there is none". |

One note: `IdentifyFish.tsx:310` uses a typographic apostrophe in `Couldn't` while the
codebase otherwise writes `&rsquo;` or avoids contractions. Cosmetic only.

---

## F. What is already right, and should not be touched

Calibration, so a future pass does not "improve" the best writing in the product.

- **`src/pages/Welcome.tsx`** — the target voice. It counts every number from shipped data at render, quotes researched strings verbatim, and names its own limits. The "Not published yet" download section (lines 624-638), which admits both store buttons are dead placeholders, is the single most persuasive thing on the site.
- **`src/pages/Care.tsx`** — "Nothing on this page is hunting you" (line 42) and the closing "None of these animals is the problem" (line 230). Safety without sensationalism, exactly as specified.
- **`src/pages/Tides.tsx`** `STAGES` prose — "This is the laziest productive fishing there is" (line 138). Do not touch.
- **`src/pages/LocationDetail.tsx:459-461`** — "not a list of everything that swims past. Expect company you did not plan on."
- **`src/components/location/Cautions.tsx:151-157`** — the two-way framing that distinguishes checked-for-this-spot from general rules. Fiddly, precise, and the honest solution to a real problem.
- **`src/pages/Support.tsx:57-66`** — "That is the identifier working. It is allowed to say so… a confident wrong answer about a fish that can hurt you is far worse than an honest shrug."
- **`src/pages/Home.tsx:325`** — "First time in salt water? Licence, gear, bait, where to start."
- **`src/pages/SignIn.tsx:34`** — "Your spots, tides and settings, on whatever you are carrying."
- **`src/components/NearYou.tsx:137-142`** — "Ranked on distance plus what this guide has researched about each spot — the tide it fishes, the hours it fishes, the months it fishes… **It is a match, not a forecast: nothing here predicts a catch.**" That last clause is the content policy enforced in the UI, in the reader's own language. It is the single best sentence in the app for what the product is.
- **`src/components/Layout.tsx:162-164`** — "Everything live here is a prediction, never a measurement." In the footer, on every page.
- **`src/components/location/Cautions.tsx:84-89`** — the code comment recording why a "roughly June to September" season claim was deleted. Not user-facing, but it is the content rule being enforced by a person, and it is why this audit found no invented seasons.
- **`src/components/conditions/LiveTide.tsx:326-327`** — "Wind and sky are an NWS forecast; tide heights are NOAA astronomical predictions, not measurements."

---

## Recommended order of work

1. **D1, D1b, D2** — stale species counts and the self-contradicting privacy page. The product contradicting itself in public. None of it is a matter of taste.
2. **D3, D4** — wrong host, possibly-dead support address. Owner input needed on D4.
3. **B5** — "Water" pointing at two different pages. Small fix, and it is a live navigation bug, not a preference.
4. **A1-A5** — the direction-as-copy cluster. This is what the owner actually asked for.
5. **C1-C3** — hand-written syntheses of researched content. Needs a researcher, not a writer.
6. **B1-B4, B6-B8** — voice drift. Real, but none of it is misleading anyone.

## Coverage

All 21 files in `src/pages/` and all 27 in `src/components/` were read. The SVG art
modules (`location/art.tsx`, `species/art.tsx`, `start/art.tsx`, `ui/icons.tsx`) carry no
prose beyond the chart axis labels and the accessible label noted in B8.

Nothing was edited. This document is the whole deliverable.

## Open questions for the owner

1. Does `support@shorebound.app` receive mail, given the site is `shorebound.fish`? (D4)
2. Is the app on Cloudflare Workers, matching `CLAUDE.md`? Privacy says GitHub Pages. (D3)
3. `FishList.tsx` — is that list "most-targeted", "most commonly caught", or "what anglers here actually fish for"? Three claims are live; one is a frequency claim nothing backs. (C3)
4. `Privacy.tsx` — confirm exactly what the database stores before the rewrite in D2 ships. I have written to what the page itself documents, not to the schema.
