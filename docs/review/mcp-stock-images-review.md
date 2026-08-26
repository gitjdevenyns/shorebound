# Supply-chain review — `stock-images-mcp` MCP server

**Date:** 2026-08-25
**Reviewer:** security-privacy-reviewer (code-level review; not a penetration test)
**Scope:** third-party MCP server added to this machine's Claude Code config. Not about the Shorebound app.
**Standard:** NIST CSF 2.0

---

## Verdict

**SAFE ONLY IF PINNED.** Version 1.0.0 is clean — verified, not assumed. The
package as *registered* is not, because `npx -y stock-images-mcp` resolves and
executes the latest matching version on every launch with no review.

**Nothing on this machine should be considered compromised.** See "Has anything
been compromised?" below for the evidence.

Fix the invocation before adding API keys. Do not leave it unpinned.

---

## What was audited

| | |
|---|---|
| Package | `stock-images-mcp@1.0.0` (only version published) |
| Published | 2026-02-09, single maintainer `jean.pierre <jean.pfs2@gmail.com>` |
| Downloads | ~282/month — low, but organic and stable, not a spike-and-vanish pattern |
| Tarball sha512 | `s5z2FCi0mFtrjYASI/Z56+h2+aSTAw0N2c5wG04daQqGjTBLtv9erB5A0lxN737d6hMB96IHsRyNOBxPtFFFqw==` |
| Repo | `github.com/jeanpfs/stock-images-mcp`, publish commit `f94feb1` |
| Method | `npm pack` + extract + read. Entry point never executed; nothing installed into the project; no package script run. |

---

## Findings

### Identify (ID) — what it touches

**Clean on every point checked.**

- **Env vars read:** exactly three, exactly as documented — `PEXELS_API_KEY`,
  `UNSPLASH_API_KEY`, `PIXABAY_API_KEY`, each read once in its own provider
  constructor. No other `process.env` access anywhere in the package.
- **Filesystem reads:** none. The package reads no files at all.
- **Filesystem writes:** only in `download_image` (see PR-1).
- **Does NOT touch:** `.env` / `.env.local`, `~/.npmrc`, `~/.ssh`, cloud
  credential files, `~/.claude.json`, git config, keychains. Verified by
  exhaustive grep across `src/` and `dist/`.

The repo's `.env.local` (mode 644, gitignored, untracked) holds
`SUPABASE_SERVICE_ROLE_KEY`. This package never reads it. That is a property of
version 1.0.0's code, not a sandbox — see GV-1.

### Protect (PR)

**PR-1 — HIGH — arbitrary file write via `download_image` path traversal.**
`src/tools/download-image.ts` / `dist/tools/download-image.js`:

```js
const folder = validated.folder || "./downloads";
if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
const filename = validated.filename || `image-${Date.now()}${ext}`;
const filePath = path.join(folder, filename);
```

`folder` and `filename` are both tool arguments — model-controlled — and there
is no containment check. `path.join` does not prevent traversal:
`filename: "../../../../home/johnd/.bashrc"` escapes the download directory and
writes anywhere the user can write. `mkdirSync(..., {recursive:true})` will
happily create the path.

Why this is reachable and not theoretical: `search_images` returns
attacker-influenceable free text from third-party APIs (Pexels `alt`, Unsplash
`alt_description`, Pixabay `tags`) straight into model context. That is an
indirect prompt-injection surface. Injected text that induces a
`download_image` call with a crafted `folder`/`filename` yields arbitrary file
write — overwrite a shell rc file, a git hook, or repo source, and that becomes
code execution. Not malice by the author; a missing check.

**PR-2 — MEDIUM — SSRF, no URL allowlist.** Same tool: `fetch(validated.url)`
accepts any URL, not just the three image CDNs. Reachable targets include
`http://localhost:*` and cloud metadata endpoints. The response body is written
to disk rather than returned to the model, so this is not a one-step exfil —
but the agent can then read that file, which closes the loop.

**PR-3 — MEDIUM — no content-type validation.** Extension is guessed from the
`content-type` header and the bytes are written unconditionally. Combined with
PR-1, arbitrary bytes to an arbitrary path.

**PR-4 — install-time execution: NONE. Verified clean.**
- `stock-images-mcp` declares no `preinstall`, `install`, `postinstall` or
  `prepare`. Only `build`/`dev`/`start`/`test`.
- Full resolved tree is 91 packages. **Zero** carry `hasInstallScript`.
- The `prepare`/`prepublish` entries visible in the on-disk npx tree
  (`ajv`, `eventsource`, `path-to-regexp`, `express-rate-limit`, `ip-address`,
  the `es-*`/`side-channel-*` family) do **not** execute for registry installs —
  `prepare` runs only for git deps or the package's own directory, and
  `prepublish` is legacy and does not fire for dependencies. This is the normal
  Express/MCP-SDK transitive tree.
- `npm audit`: **0 vulnerabilities**.

**PR-5 — obfuscation: NONE.** No `eval`, no `new Function`, no `child_process`,
no `vm`, no `spawn`/`execSync`, no base64 blobs, no `atob`. `dist/` is
unminified `tsc` output — longest line in the whole package is 136 characters.

**PR-6 — outbound destinations: only the documented three.** Complete
enumeration of every URL literal in the package:

```
https://api.pexels.com/v1/search      (Pexels provider)
https://api.unsplash.com/search/photos (Unsplash provider)
https://pixabay.com/api/               (Pixabay provider)
https://pixabay.com/users/<user>       (attribution link, string only)
```
Remaining hits are README/`server.yaml` documentation links. No telemetry, no
analytics, no error reporting, no unexplained host, no dynamic or concatenated
URL construction. Each key is sent only to its own provider — Pexels key in an
`Authorization` header to Pexels, etc. No cross-sending.

**PR-7 — LOW — tarball ships the author's `.claude/settings.local.json`.**
Present in the npm tarball, gitignored in the repo. Contains the author's own
permission allowlist (`npm publish`, `npm login`, `git push`) and a stale npm
CLI login URL with a one-time UUID. No secret of the user's, and no runtime
effect — Claude Code does not read settings from inside `node_modules`. It
matters as a *hygiene signal*: the author publishes whatever happens to be in
the working directory, with no `files` allowlist and no `.npmignore`. A future
publish could just as easily ship a real `.env`.

### Provenance — tarball vs GitHub: **MATCH**

Diffed the extracted tarball against the repo at publish commit `f94feb1`.
Every shared file is byte-identical. The only deltas are expected and benign:

- `dist/` — in tarball, not in repo (build output, gitignored). Read in full;
  it is a faithful transpilation of `src/`, with no injected code. This is the
  classic clean-source/backdoored-dist vector and it is **not** present here.
- `.claude/` — in tarball, not in repo (PR-7).
- `.gitignore`, `package-lock.json` — in repo, not shipped.

**No provenance attestation.** The registry returns `Not found` for
`stock-images-mcp@1.0.0` attestations; the only signature is the standard
registry signature, not a SLSA/CI provenance link. So there is no cryptographic
binding from tarball to GitHub CI — my manual diff establishes it for *this
version only*, and gives no assurance about any future version.

### Detect (DE) — thin, honestly

No mechanism exists to notice a future malicious version. `npx` will fetch and
run it silently. There is no lockfile, no integrity pin, no egress monitoring,
no alerting on new MCP server versions. At this stage that is expected, but it
means GV-1 below is unmitigated by detection.

### Govern (GV)

**GV-1 — HIGH — the standing risk: `npx -y` with no pin.** This is the real
finding; the current code is fine.

Registered in `/home/johnd/.claude.json` under the project entry as:
```json
"stock-images": { "type": "stdio", "command": "npx",
                  "args": ["-y", "stock-images-mcp"], "env": {} }
```
The npx cache spec is `^1.0.0`. Every launch re-resolves. So:

- A single-maintainer account takeover, or a deliberate `1.0.1`, executes on
  this machine automatically, with **no review, no prompt, no diff**.
- It runs as the user, inheriting the Claude Code process environment, with
  full read access to the repo — including `.env.local` and the Supabase
  **service role key**.
- One package, one version, six months old, one maintainer, no 2FA status I can
  verify, no provenance. The audit I just did expires the moment a new version
  ships.

The trust decision here is not "is 1.0.0 clean" (it is). It is "am I willing to
auto-execute whatever this one person publishes next, forever." That answer
should be no.

**GV-2 — MEDIUM — secret placement for the upcoming keys.** Configuring keys
via `claude mcp add -e KEY=value` writes them in **plaintext** into
`~/.claude.json`. Prefer exporting into the launching shell environment, or a
secret manager. These are free-tier read-only image API keys, so the blast
radius is low — but the habit generalises badly to keys that matter. Note this
is the same class of rule as the project's own "secrets never enter the bundle"
principle: the storage location must match the sensitivity.

### Respond / Recover (RS/RC)

No incident response path is defined for a compromised developer-machine
dependency. At this stage that is a tracked gap, not a failure. Minimum useful
version: if a malicious MCP version is ever suspected, rotate the Supabase
service role key first, then `~/.npmrc` tokens and `gh` tokens, then purge
`~/.npm/_npx`.

---

## Has anything been compromised?

**No. Nothing on this machine should be treated as exposed.** This is an
evidence-backed conclusion, not a reassurance:

1. The copy that executed is on disk at
   `/home/johnd/.npm/_npx/0bb7ad4680d8a499/node_modules/stock-images-mcp`. Its
   lockfile integrity hash is `sha512-s5z2FCi0mFtrj...RyNOBxPtFFFqw==` —
   **identical** to the tarball I audited. A recursive diff confirms the
   executed copy is byte-for-byte the audited code. There is no ambiguity about
   what ran.
2. That code has no install hooks, so nothing ran at fetch time.
3. At startup it only constructs three providers, reads three env vars, and
   attaches an stdio transport. It makes **zero** network calls until a tool is
   invoked.
4. All three API key vars were unset, so the values read were `undefined`.
5. `claude mcp list` health-checks by launching, handshaking, and exiting. No
   tool was ever invoked, so neither `download_image` (PR-1/PR-2) nor any
   provider fetch ever ran.

The service role key was never read, and no data left the machine. **No
rotation is required.**

Scope limit: this clears the execution that already happened. It says nothing
about future versions — that is exactly what GV-1 is about.

---

## Required actions

**Before adding API keys — repin (do this one).** Remove and re-add pinned to
the exact audited version:

```bash
claude mcp remove stock-images --scope local
claude mcp add stock-images --scope local -- npx -y stock-images-mcp@1.0.0
```

`@1.0.0` is exact, so npx will not silently move to a later version. Re-run this
review before ever bumping it.

**Stronger option, if the tool proves useful:** vendor it. It is ~50 KB of
readable TypeScript with two runtime dependencies. Copy the audited tree to a
local path, `npm ci --ignore-scripts` once, and point the MCP config at
`node /abs/path/dist/index.js`. That removes the registry from the runtime trust
path entirely, and lets you fix PR-1 by clamping `folder`/`filename` to a
resolved base directory.

**If you would rather not carry the risk at all:**
```bash
claude mcp remove stock-images --scope local
```

**Either way:**
- Treat `download_image` as untrusted until PR-1 is fixed. Do not let it write
  outside a scratch directory, and be aware its `folder`/`filename` arguments
  are reachable from injected text in search results.
- Do not put the API keys in `~/.claude.json` in plaintext (GV-2).

---

## Requires a human specialist — not resolvable by code review

These are **open**, not cleared:

1. **Maintainer account security.** I cannot verify whether `jean.pfs2@gmail.com`
   has npm 2FA enabled, nor the strength of that account. GV-1 rests entirely on
   this and it is not observable from outside. Pinning is the mitigation
   precisely because this is unverifiable.
2. **Penetration testing.** This is a source read, not an adversarial test. The
   PR-1 injection→file-write chain is a *plausible* path I identified by
   inspection; confirming exploitability under this specific agent
   configuration requires a **penetration tester**.
3. **Image licensing — requires a lawyer.** Pexels, Unsplash and Pixabay each
   impose their own license and attribution terms, and their API terms restrict
   redistribution and commercial reuse. This package strips images to bare URLs
   and downloads them; it enforces nothing. If any downloaded image is ever
   shipped in Shorebound, the license terms of the specific image and the
   provider's API terms must be reviewed by a **lawyer** — especially given the
   project's stated content-provenance discipline. Flagging the question, not
   answering it.
4. **Vendor onboarding.** Adding this server means three new data-processing
   vendors in the developer toolchain. Under GV that warrants the same
   evaluation any vendor gets — coordinate with `infra-cost-strategist`.

---

## CSF 2.0 coverage — honest status

| Function | Status |
|---|---|
| **Govern** | **Gap.** No policy governs MCP server additions. GV-1 open. |
| **Identify** | **Real coverage.** Data touched by v1.0.0 fully enumerated and verified. |
| **Protect** | **Partial.** No malicious code; PR-1/PR-2/PR-3 are real defects. Pinning open. |
| **Detect** | **Aspirational.** No means of noticing a malicious future version. |
| **Respond/Recover** | **Gap.** No IR path for a compromised dev dependency. Tracked, not resolved. |

---

## Go / no-go

**NO-GO as currently registered.** **GO once pinned to `@1.0.0`**, with
`download_image` treated as untrusted (PR-1) and keys kept out of
`~/.claude.json` (GV-2).

The code is genuinely clean and I verified it rather than assuming it. The
objection is to the delivery mechanism, which grants a single-maintainer package
standing, unreviewed code execution next to a live service role key.
