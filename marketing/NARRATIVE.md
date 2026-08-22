# Why this exists

The origin story and the voice. Everything written under this brand — app
store copy, the site's About page, a Reddit post, a pitch to a bait shop —
comes from here.

**Two things in this document are marked `[OWNER]`.** They are the personal
facts only you can supply, and they are deliberately blank rather than
invented. Everything else is true and checkable today.

---

## The short version

*Somewhere between one and three sentences, depending on where it's used.*

> Twenty-five fishing spots on Florida's Suncoast, researched properly and
> kept current. Not a forecast, not a score out of ten — the tide each spot
> actually fishes, the rig that actually works there, and where the water is
> right now. It works with no signal, because that's where you'll be standing.

---

## The long version

### The apps already existed. That was the problem.

There is no shortage of fishing apps. Fishbrain has seventy thousand ratings.
Fishbox has thirty-seven thousand. They will all give you a number — a bite
score, a best-time window, a coloured dial — and none of them will tell you
why.

They can't. A national app covering every water in the country has no room for
what actually matters on one three-mile stretch of Florida: which bank goes
slack first, which pass turns into a washing machine on an outgoing, which
bridge fishes at night and which one is a waste of an evening. That is local
knowledge, and local knowledge does not scale to fifty states. So it gets
replaced with a model output and a confident-looking number.

`[OWNER]` — *one or two sentences on the specific moment this became personal.
The trip that was wasted, the spot the app sent you to, the thing an old-timer
told you that no app knew. This is the only part of the story that can't be
researched, and it's the part people will remember.*

### Then the storms came, and the apps didn't notice

In 2024 Helene and Milton took this coast apart.

Annie's Bait & Tackle in Cortez — flooded, windows gone, condemned. County
commissioners voted six to one; the excavators came at sunrise on 16 April
2025. The owner offered to pay for the repairs himself and was told no.

**Annie's website is still live. It still publishes opening hours.**

Anna Maria City Pier lost four hundred feet of walkway and won't reopen until
late 2026. The Rod & Reel Pier is pilings and a sign; they're rebuilding it on
land. Bridge Street Pier's floating dock is still closed. Mastry's in St. Pete
is a seafood market now. Stump Pass has a new pass through it that Milton cut,
and the mile-and-a-third walk to the tip doesn't exist any more.

You will not find any of that in a national fishing app. Their data still says
those places are open, because nobody drove out to look.

That is the whole argument for this guide in one paragraph. **Local knowledge
isn't a feature you add to a big app. It's a maintenance commitment**, and it
only works if somebody is paying attention to twenty-five specific places
instead of two hundred thousand general ones.

### What we actually built

A field guide. Twenty-five spots from St. Petersburg down to Boca Grande Pass
— **twenty-two of them reachable without a boat**, because most people fishing
this coast are standing on sand, a pier, a bridge or a flat, and every app
built for a centre console quietly leaves them out.

Each spot carries the structure, the tide stage it fishes, and per species the
rig, hook, leader, weight and bait. Live NOAA tide and NWS forecast, labelled
as predictions rather than dressed up as fact. A photo identifier that is
allowed to say *I can't tell*. Safe-handling guidance for the six species that
put people in urgent care.

And it works with the network cut, because the whole guide is on the device.
You are going to need it standing on a beach with one bar, and an app that
needs a signal to tell you about water is not a fishing app.

### Who it's for

The person who fishes this coast on foot.

Not the tournament boat. Not the charter client. The one who knows what an
outgoing tide does to a pass and wants to know which pass, on a Tuesday,
before work. The one who's driven forty minutes to a spot a national app
recommended and found a closed gate. The one who moved here last year and
doesn't have thirty years of local knowledge to fall back on — and doesn't
have an uncle who does.

`[OWNER]` — *who taught you, if anyone did. One line.*

### What we won't do

These aren't marketing promises. They're rules the code enforces, and you can
read them in the source.

**We don't invent fishing content.** If nobody has researched a spot's
seasons, that field is empty. Empty means "not done yet", never "nothing to
say". Ten of twenty-five spots have season notes today and fifteen don't, and
we'd rather show you that gap than fill it with something plausible.

**We don't claim to predict a catch.** There's no catch data behind this app,
so a likelihood number would be unfalsifiable. What we'll tell you is which
spot matches the water right now, and exactly why — this tide stage, this
hour, this month, and the researched note that says why it fishes then. Every
competitor gives you a score. **We show our work.**

**We don't hide safety behind a paywall.** Somebody grabs a hardhead catfish
whether or not they paid. That content is free, permanently, and there's a
test in the codebase that fails the build if anyone ever changes it.

**Your location never leaves your phone.** Ranking spots by distance is
arithmetic against data already on the device. No request in this app carries
a coordinate. Same for the photo identifier — the picture is never stored,
anywhere.

**Paid placement always says it's paid.** Local shops can pay to stand out in
the bait directory. They cannot pay to be in it, and they cannot pay a
competitor out of it — every real shop is listed whether they pay or not,
because a directory of advertisers has no readers and is therefore worth
nothing to advertise in.

### Where it goes

More spots, north and south, once they're researched to the same standard —
which means sourced, not guessed. The seasons and access gaps filled in. A
bait and tackle directory that actually tells you who has live shrimp at 6am,
built by walking into these shops, not by scraping a listings site that still
thinks Annie's is open.

---

## Voice

**Plain, specific, unhurried.** The reader has been sold to by fishing apps
before and can smell it.

- **Concrete beats enthusiastic.** "Longboat Pass, outgoing through dawn" is
  better than "unlock your best day on the water." Always.
- **Name the limits.** Saying what we don't know is the reason to believe what
  we do. It is the single most persuasive thing available to us and it costs
  nothing but discipline.
- **No hype, no fake urgency, no emoji strings, no invented testimonials.**
- **Never the passive voice about a real place.** "The dock is closed" —
  by whom, since when, says who.
- **Sound like an angler, not a brand.** Tide stages, structure, rigs. If a
  sentence could appear in any app's marketing, delete it.

### Words we use
tide stage · structure · the flat · outgoing · slack · researched · sourced ·
estimate · prediction · works offline · on foot

### Words we don't
unlock · game-changer · revolutionary · AI-powered · guaranteed · hot spots ·
secret spots · *best time to fish* (as a claim rather than a researched note)
