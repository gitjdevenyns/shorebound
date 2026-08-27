# Start here — next session

Paste the block under **Kickoff** as your first message. Everything above it is
why.

## What changed at the very end of the last session

- Your agent swarm from `lookio-app` was copied into `GCF/.claude/agents/`.
  **Agent definitions load at session start**, so they were unavailable for the
  whole of the last session — every "agent" run was a `general-purpose` spawn
  with a typed brief. In a fresh session they register and can be called by
  name.
- `claude-design` MCP is now **connected** (`/mcp` → reconnected). The
  `ui-designer` agent's `mcp__claude-design__*` tools work. A Claude Design
  project already exists for the current brand:
  **Shorebound** — `https://claude.ai/design/p/d95621cf-6081-4b74-bfbf-7016df48254d`
  (`support.js` written, nothing else in it yet).
  Two older projects, "GCF — Gulf Coast Fishing redesign (Track B)" and
  "Gulf Coast Fishing — Track B Screens", predate the rename, the snook mark and
  the current hero — the owner judged them not worth carrying forward.

  **Corrected 26 Aug 2026: that judgement was about the name, not the system,
  and reading it as "dead" cost a design round.** "Gulf Coast Fishing — Track B
  Screens" (`5dcf7339-8960-4e61-be1e-6c8760a020c9`) holds
  `00 Foundations.dc.html` — the design system this app **still ships**.
  `--b600 #075bd8`, `--g400 #8dff00` and the cool neutral ramp in
  `src/styles/tokens.css` are that file's tokens, name for name. It also
  documents each derived token's contrast ratio *and the reason for it* (`--m`
  at 5.4:1 light / 8.3:1 dark, replacing a value that failed AA), carries a
  full screen set — Home, Location, Species, Tides and Water, Handle With
  Care — and states the rule the shipped app breaks in 17 places: *"every
  striped plate is a licensed-photo slot. Nothing here hotlinks third-party
  media."*

  Its `04 Tides and Water` screen is the standard the current `/water` page
  falls short of: a plotted tide curve with shaded incoming/outgoing bands and
  four per-stage charts, against a brown lozenge on a blue rectangle in
  production.

  **Treat it as the governing design system.** Only the name on it is stale.
  A first pass at three "clean look" directions was built without it and had
  to be reworked — do not repeat that.
- `CLAUDE.md` is new at the repo root. The `architect` agent reads it before
  anything else and, by its own instructions, stops rather than inventing
  project goals. It carries the audience, the moat, and the five hard
  constraints.
- Web-search cap raised to 1000 in `.claude/settings.json`; it applies from a
  fresh session.

## Queued and not started

1. **Sales toolkit, redone in Claude Design.** Currently a hand-built artifact
   (`fa57ef6d-7c7a-442c-b5b0-8c809cf232d6`); source markdown in
   `marketing/sales/`. The owner wants Claude Design to do it properly.
2. **Welcome page, redone in Claude Design.** Currently `src/pages/Welcome.tsx`,
   live at https://shorebound.fish/welcome
3. **Full swarm review** of everything built — architect, backend, frontend,
   test, QA, documentation.

## Kickoff

> Read `CLAUDE.md`, then `docs/HANDOFF.md` and `docs/ROADMAP.md`.
>
> Run the swarm over what is built, in this order, and have each agent report
> before anything is rewritten:
> 1. `architect` — review the system as a whole against CLAUDE.md's five hard
>    constraints. Where is the shape wrong rather than the code? Produce a
>    written plan; do not implement.
> 2. `backend-engineer` — Supabase schema, the 12 migrations, RLS policies and
>    the 4 Edge Functions. Auth, profiles, admin roles, the audit table.
> 3. `qa-reviewer` and `test-engineer` — 316 tests across 16 suites. What is
>    untested that matters? What is tested that proves nothing?
> 4. `security-privacy-reviewer` — the account gate is a UI gate by design and
>    is documented as such; check that nothing else assumes otherwise. Confirm
>    no secret can reach the bundle.
> 5. `documentation-writer` — README, CLAUDE.md, the docs/ set.
>
> Only after all six have reported, rewrite what is *critical* — not what is
> merely improvable. `npm run build` clean and `npm test` fully passing before
> any commit.
>
> Separately, hand `ui-designer` the sales toolkit and the welcome page, using
> the existing Claude Design project **Shorebound**
> (`d95621cf-6081-4b74-bfbf-7016df48254d`). Brand is settled: Bricolage
> Grotesque, lime `#8dff00`, navy `#031530`, the snook inversion mark in
> `public/assets/icon-mark.svg`. Do not re-open the aesthetic.

---

## Domains and DNS — changed 26 August 2026

All four domains are now Cloudflare zones on one account, sharing the
nameserver pair `darl.ns.cloudflare.com` / `lovisa.ns.cloudflare.com`.

| Domain | State |
|---|---|
| `shorebound.fish` | **Canonical.** Worker custom domain, serves the app. |
| `shorebound.app` | 301 to `shorebound.fish`. Was the 525; fixed. |
| `gofishyoself.com` | Zone added, 301 rule set, `pending` nameservers. |
| `gofishyoself.app` | Zone added, 301 rule set, `pending` nameservers. |

The `shorebound.app` 525 was a routing bug, not an SSL one — the zone's only
Worker route was `*.shorebound.app/*`, which does not match the apex. A
side effect was that `www.shorebound.app` served the **whole app as a second
PWA origin**, with its own service-worker cache, its own `localStorage` and
its own auth session, while only one hostname was in Supabase's redirect
allowlist. That route is deleted.

**Owner action outstanding:** set the GoDaddy nameservers for the two
`gofishyoself` domains. Their redirects go live on propagation.

`.app` is an HSTS-preloaded TLD, so plain HTTP is refused by the browser
before a redirect can run. Both `.app` domains must stay proxied Cloudflare
hostnames with Universal SSL; a registrar-level forward will not work.

See `docs/HANDOFF.md` for the Microsoft 365 mail sequencing and the two SPF
and MX traps that come with it.
