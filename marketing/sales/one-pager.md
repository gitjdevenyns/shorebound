# You already know how to fish. You just don't know this water.

**Shorebound — Shore Fishing Guide. St. Petersburg to Boca Grande Pass.**

---

You can read a lake at a glance. Where the bottom changes, where the shade line
falls, what a wind out of the north does to a point. You own rods you have
opinions about.

Then you stand on a Florida beach with a pass ripping out in front of you and
none of it transfers. The water moves twice a day and that turns out to be the
whole game. The structure is oyster and mangrove and bridge piling instead of
timber and weed line. The fish are different fish. Several of them will hurt you
and nobody has mentioned which.

You are not a beginner. You are displaced. Those need completely different tools.

And you do not want to book a charter. Plenty of people should, and it is a good
day out — but you do not want to be handed a rod on somebody else's boat, over
somebody else's spot, on somebody else's plan. Working it out is the point. That
is the part you actually like, and buying it removes it.

---

## Six questions, in the order you actually ask them

Half five in the morning, in a car park, with the coffee going cold.

**1. Where do I go?** Twenty-five researched spots, St. Petersburg to Boca Grande
Pass (`src/data/locations.ts`). Twenty-two of them reachable on foot — beach,
pier, bridge, flat — so you do not need a boat to start (`src/data/locations.ts`,
access types `shore`, `wade`, `pier`, `bridge`).

**2. When?** Tide stage is the answer, and it is the thing freshwater never
taught you. Every spot names the stage it actually fishes, drawn against a live
NOAA prediction for that spot's own station (`src/data/locations.ts`,
`src/lib/conditions.ts`). A prediction, labelled as one, never a measurement
(`README.md`).

**3. What am I standing over?** Grass flat and potholes, oyster bar, mangrove
point, bridge piling, a pass — five kinds of structure, what each one is and why
fish sit on it (`src/data/habitats.ts`).

**4. What will I catch?** The species that spot actually holds, not a regional
list. Eleven with a full page — snook, redfish, seatrout, tarpon, mangrove
snapper, sheepshead, ladyfish, black drum, pompano, Spanish mackerel, jack
crevalle (`src/data/fish.ts`).

**5. What do I throw at it?** Rig, hook, leader, weight and bait — per species,
per spot. There are 104 of these recipes across the twenty-five spots
(`src/data/locations.ts`). Not "use live bait." This, off the Stump Pass page,
verbatim:

> Pompano · surf rig · #1–1/0 dropper loops · 20 lb leader · 2–3 oz pyramid ·
> sand flea/fresh shrimp

**6. What do I do when it is on the sand?** And this is the one nobody prepares
you for.

---

## Six of these fish will hurt you

A hardhead catfish has a serrated spine with venom on it, and people pick them up
bare-handed every single day. From the guide, word for word
(`src/data/hazards.ts`):

> Do not wrap your hand around the body behind the head. Keep clear of the dorsal
> and side spines; use long pliers/dehooker and cut the leader if needed.

Six species carry that treatment — hardhead and gafftopsail catfish, stingrays,
lionfish, great barracuda, sharks, and pufferfish (`src/data/hazards.ts`). How to
hold it, where not to put your fingers, and how to put it back alive.

**That content is free, permanently, paid account or not.** Not a promise on a
page — a test in the repository that fails the build if anyone changes it
(`src/test/entitlements.test.ts`, `src/lib/entitlements.ts`).

---

## What it will not do

**It will not give you a bite score.** There is no catch data behind this app, so
a likelihood number would be unfalsifiable. What you get instead is which spot
matches the water right now and exactly why — this tide stage, this hour, this
month, and the researched note saying why it fishes then (`src/lib/nearby.ts`,
`marketing/CONTENT_POLICY.md`).

**It will not invent anything.** Where nobody has researched a field, it is
empty. Empty means "not done yet", never "nothing to say". Today: seasons on 24
of 25 spots, access notes on 25, safety notes on 21, sources on all 25 — 53
source links in total, on the pages themselves (`src/data/locations.ts`).

**It will not take your location anywhere.** Ranking spots by distance is
arithmetic against data already on your phone. No request in this app carries a
coordinate (`src/lib/geo.ts`). The photo identifier never stores a picture —
anywhere (`README.md`, `supabase/functions/identify-fish/`).

**It will not stop working when the signal does.** The whole guide is bundled:
every spot, species, rig and the handling pages, on the device
(`README.md`, `vite.config.ts`). Which is the point, because the places worth
fishing are the places with one bar.

---

## Two more things you will want

**Where to buy bait.** Twenty researched bait, tackle and marina businesses,
eighteen of them independent, mapped to the spots they are a practical stop for —
every one of the twenty-five spots has at least one (`src/data/shops.ts`).
Hours we could confirm first-party are shown as confirmed; the ones we could not
are marked (`src/data/shops.ts`, field `verification`).

**A photo identifier**, for the fish you cannot name. It returns an estimate,
says so every time, is allowed to answer "I can't tell", and flags anything
unidentified as potentially hazardous — then links you to the guide's own
researched handling page rather than writing you a new one (`README.md`).

---

## Where this actually is

It is a web app you open in a browser. Load it once and it is on your device.
**It is not on the App Store or Google Play** — neither listing exists yet, and
the buttons on the site say so (`src/pages/Welcome.tsx`, `docs/ROADMAP.md`).

A free account opens the whole guide. That is the gate — everything except the
pitch page and the legal pages sits behind it (`src/App.tsx`, `src/lib/auth.tsx`).

**Open it, put in an email, and go look at Stump Pass on the outgoing.**

`https://gitjdevenyns.github.io/GCF/`

*Found something wrong, closed or demolished? That is the most useful thing you
can send us.*
