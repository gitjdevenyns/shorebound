# Handoff — 24 August 2026

Session ended cleanly. Build green, 316 tests passing, everything pushed to
`main`. Cloudflare deploys from `main` on push; the live site is
https://shorebound.fish

## Blocked on you, not on code

1. **Sign-up is broken for real users.** Supabase returns
   `over_email_send_rate_limit` — the built-in email service has an hourly cap
   and is not for production. Fix: Authentication → Sign In / Providers → Email
   → turn **Confirm email** off (instant, unblocks everything), then configure
   SMTP properly (`smtp.office365.com:587`, or Resend). Watch for Microsoft
   disabling SMTP AUTH by default on newer tenants.
2. **`shorebound.app` returns 525** — SSL handshake failure, never provisioned.
   `shorebound.fish` is fine. Cloudflare → SSL/TLS → Full (strict), and confirm
   the domain is attached to the Worker rather than sitting as a bare DNS
   record.
3. **`gofishyoself.com` redirect not set up.** Cloudflare → Rules → Redirect
   Rules → hostname `gofishyoself.com` → 301 to
   `concat("https://shorebound.fish", http.request.uri.path)`. Preserves path
   and UTM parameters.
4. **Pricing for shop listings** is `[PRICING — OWNER TO SET]` in
   `marketing/sales/two-pager.md`. Needs a number, a term, whether a founding
   rate exists, and whether a spot-page sponsor card is priced separately from
   a directory listing.
5. **The raise figure on slide 16** of the pitch deck is deliberately blank.
6. **Twelve held review items** need phone calls. See `docs/REVIEW_DECISIONS.md`.

## Cleanup owed

- A test account I created against the live database is still there:
  `e2e1787538665780@gmail.com`, unconfirmed, no profile data. Delete it from the
  owner console (Accounts → search `e2e` → Manage → Delete) once you can sign in.

## Where things are

- **Owner console**: `/admin` (not `/admin.html` — Cloudflare 307s that).
  Admin is granted by having an account with the seeded owner address; the
  trigger attaches it on sign-up.
- **Agents.** The owner's existing swarm (built for `lookio-app`) was copied into
  `GCF/.claude/agents/` at the end of this session. It had never been present
  before that, which is why nothing custom registered all session — every
  "agent" run was a `general-purpose` spawn with a typed brief.

  Reconciled: `architect` (theirs) and `architect-shorebound` (mine, renamed
  from a colliding `name: architect`); `ui-designer` (theirs) and `ui-design`
  (mine); `product-marketing` (theirs, lifted to Opus) and `marketing-creative`
  (mine). **Three pairs of near-duplicates still to merge** — theirs are
  generic and wired into the architect's delegation list, mine carry the
  Shorebound-specific rules. Next session should fold mine into theirs and
  delete the duplicates rather than leave both.

- **Claude Design MCP.** `claude-design` is configured at user level in
  `~/.claude.json` (`https://api.anthropic.com/v1/design/mcp`) but is not
  connected in this project — run `/mcp` to authenticate it. The `ui-designer`
  agent's `mcp__claude-design__*` tools do nothing until it is. This is what
  "get Claude Designer to do it" has meant all along; every design in this
  session was done by hand instead.
- **`ops-lead` has never run.** It is designed for autonomous work between
  sessions and would create `docs/OPS_LOG.md` on its first run.
- **Web search** is capped per session. Raised to 1000 in
  `.claude/settings.json`; takes effect on a new session.

## Decisions made this session, so they are not re-litigated

- **Name stays Shorebound.** `gofishyoself.com` is a redirect and the campaign
  handle. Evidence in `docs/NAMING.md`: App Store "go fish" is a wall of card
  games, the phrase has no search demand, and `gofishyourself.com` has belonged
  to somebody else since 2008.
- **Tagline is `Go Fish Yo'Self`** — one word, the apostrophe standing in for
  the elided "ur", the same way `y'all` contracts `you all`.
- **The account gate is a UI gate.** The guide's content compiles into the
  bundle, so requiring an account stops casual use but does not make the
  content secret. Anything that must be private has to move behind RLS as data.
- **Bait shop web services: assessed and declined as a managed service** — six
  prospects at $30–50/mo is not a business, and the stale shops chose to be
  stale. Reframed by the owner as build-and-hand-over with AI setup in the
  shop's own accounts. Demo built. Audit in
  `docs/research/shop-web-presence.md`, and its Google Business Profile column
  is UNVERIFIED — close that before phoning anyone.

## Published pages (private until shared)

- Sales kit (deck, one-pager, two-pager) — fa57ef6d-7c7a-442c-b5b0-8c809cf232d6
- Build cost and effort estimate — 8868d92a-7aef-407b-bd47-24eac968eb9a
- Shop listing comparison, basic vs paid — 7c8ec41d-cff0-4662-a4b9-15a93e61b4b2
- Bait shop site demo — ba2626e8-a021-455e-be74-731dc29ac958

All at `https://claude.ai/code/artifact/<id>`.

## Next, in the roadmap's order

`docs/ROADMAP.md` still governs. v1 ships on six items; four remain — store
packaging, the Play wrapper, the iOS wrapper and 4.2 hardening, and the twelve
held research items. "Today's bait" is the strongest post-v1 candidate and is
deliberately NOT on the v1 list.
