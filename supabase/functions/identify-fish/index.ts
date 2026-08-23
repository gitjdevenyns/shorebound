// =============================================================================
// GCF `identify-fish` Edge Function — photo in, species estimate out.
// =============================================================================
//
// What it does on each request:
//   1. Rejects anything that is not a small POSTed JSON body carrying one
//      base64 image (the client resizes and re-encodes before upload).
//   2. Claims a rate-limit slot via `claim_fish_id_slot()` (see the migration
//      20260810190000_fish_id_rate_limit.sql) BEFORE spending any money.
//   3. Calls Claude Opus 5 vision with a structured-output schema, so the answer
//      comes back as a fixed shape instead of prose the client has to parse.
//   4. Returns that shape. The photo is never written anywhere — not to Storage,
//      not to a table, not to a log. It exists in this function's memory for the
//      length of one request and then it is gone.
//
// The result is an ESTIMATE and the whole stack says so, top to bottom: the
// schema carries a confidence level and a look-alike list, the system prompt
// forbids a confident answer from an unclear photo, and the client renders it
// under a standing "confirm this yourself" rule. Misidentifying a hazardous
// species has real consequences — a hardhead catfish and a small snook are not
// interchangeable when your hand is already moving — so this feature is allowed
// to say "I don't know", and is designed to say it often.
//
// This mirrors the guide's existing product rule (README, "Content rules"):
// official regulation, general tactics and local heuristics stay visually
// distinct. AI species ID is the weakest of those categories, and is labelled
// as such wherever it appears.
//
// Cost control (the site is public and the Anthropic bill is the owner's):
//   - a hard request-size cap here, on top of the client-side downscale;
//   - three rate-limit windows (per-IP hourly, per-IP daily, global daily);
//   - `effort: "medium"`, which is plenty for a bounded classification and
//     cuts thinking tokens substantially versus the `high` default.
//
// Secrets: ANTHROPIC_API_KEY is a Supabase Edge Function secret, read here via
// Deno.env. It is never sent to the client, never named in a VITE_ variable and
// never reaches the built bundle (CI greps dist/ for it — see deploy.yml).

import Anthropic from "npm:@anthropic-ai/sdk@0.116.0";
import { createClient } from "npm:@supabase/supabase-js@2";

/** Claude Opus 5. Vision + structured outputs; see the claude-api reference. */
const MODEL = "claude-opus-5";

/**
 * Thinking is ON by default on Opus 5 and `max_tokens` caps thinking + answer
 * together, so this is deliberately generous relative to the ~250-token JSON
 * result. A truncated answer here is a `max_tokens` stop with unparseable JSON.
 */
const MAX_TOKENS = 4096;

/** Decoded image ceiling. The client targets ~1024px/80% JPEG, i.e. ~150–300 kB. */
const MAX_IMAGE_BYTES = 1_500_000;
/** Base64 inflates by 4/3; a little slack for padding and the JSON envelope. */
const MAX_BODY_CHARS = 2_200_000;

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const ALLOWED_ORIGINS = [
  "https://gitjdevenyns.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
];

/**
 * Every species this guide can say something real about, in three kinds:
 *
 *   fish   — a documented target species with its own page
 *   hazard — a documented Handle With Care species
 *   named  — named as a target in the researched location data, with a rig and
 *            bait at each spot, but no species page yet
 *
 * The `named` kind is why an angler's sheepshead or pompano gets an answer at
 * all: those are among the most commonly caught fish in this footprint, and an
 * identifier that only knows five species is wrong far more often than it needs
 * to be. The client renders the three kinds differently — a `named` match says
 * plainly that there is no page for it and links the location that carries the
 * recipe instead.
 *
 * Kept in sync with src/data/fish.ts, src/data/hazards.ts and
 * src/data/namedTargets.ts by src/test/identify.data.test.ts, which parses this
 * very block. Add a species to the guide without adding it here — or the other
 * way round — and the suite fails.
 */
const GUIDE_SPECIES: Array<{ id: string; kind: "fish" | "hazard" | "named"; name: string }> = [
  { id: "snook", kind: "fish", name: "Common Snook" },
  { id: "redfish", kind: "fish", name: "Redfish / Red Drum" },
  { id: "trout", kind: "fish", name: "Spotted Seatrout" },
  { id: "tarpon", kind: "fish", name: "Tarpon" },
  { id: "snapper", kind: "fish", name: "Mangrove / Gray Snapper" },
  { id: "sheepshead", kind: "fish", name: "Sheepshead" },
  { id: "ladyfish", kind: "fish", name: "Ladyfish" },
  { id: "black-drum", kind: "fish", name: "Black Drum" },
  { id: "pompano", kind: "fish", name: "Florida Pompano" },
  { id: "spanish-mackerel", kind: "fish", name: "Spanish Mackerel" },
  { id: "jack-crevalle", kind: "fish", name: "Jack Crevalle" },
  { id: "catfish", kind: "hazard", name: "Hardhead / Gafftopsail Catfish" },
  { id: "stingray", kind: "hazard", name: "Southern / Atlantic Stingray" },
  { id: "lionfish", kind: "hazard", name: "Lionfish" },
  { id: "barracuda", kind: "hazard", name: "Great Barracuda" },
  { id: "sharks", kind: "hazard", name: "Sharks" },
  { id: "pufferfish", kind: "hazard", name: "Southern Puffer / Pufferfish" },
  { id: "kingfish", kind: "named", name: "Kingfish" },
];

/**
 * What each `named` id covers. Mirrors src/data/namedTargets.ts `scope`, and
 * exists because "Kingfish" is the guide's label, not a species-level claim —
 * the model needs to know which animal to map onto it, and the Spanish
 * mackerel / king mackerel pair in particular is a confusion worth pre-empting
 * rather than discovering in a result.
 */
const NAMED_SCOPE: Record<string, string> = {
  kingfish:
    "King mackerel / kingfish (Scomberomorus cavalla) — long silver mackerel with a dipped lateral line and, on adults, no spots. This guide means the mackerel, not the whiting sometimes called a kingfish elsewhere.",
};

const GUIDE_IDS = GUIDE_SPECIES.map((s) => s.id);

/**
 * Structured output schema. `enum` on `guide_species_id` is doing real work: the
 * model cannot invent a slug that has no page behind it, so the client's
 * deep-link is guaranteed to resolve or be absent.
 *
 * Note the JSON-schema subset structured outputs supports: every object needs
 * `additionalProperties: false` and a `required` list, and there are no length
 * or numeric constraints. Optionality is expressed as an empty string rather
 * than a nullable type, which keeps the client's parsing trivial.
 */
const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "identified",
    "common_name",
    "scientific_name",
    "confidence",
    "field_marks",
    "guide_species_id",
    "is_potentially_hazardous",
    "hazard_note",
    "also_consider",
  ],
  properties: {
    identified: {
      type: "boolean",
      description:
        "True only if a specific species or species group is visible and recognisable in this photo. False for a blurry frame, a fish mostly out of shot, a picture with no fish in it, or a fish you can only narrow to 'some kind of jack'.",
    },
    common_name: {
      type: "string",
      description:
        "Everyday name, e.g. 'Common Snook'. Empty string when identified is false.",
    },
    scientific_name: {
      type: "string",
      description:
        "Genus and species, e.g. 'Centropomus undecimalis'. Empty string unless you are confident of the species (not merely the genus).",
    },
    confidence: {
      type: "string",
      enum: ["high", "moderate", "low"],
      description:
        "How sure you are, judged on what is actually visible in this photo — not on how common the species is.",
    },
    field_marks: {
      type: "string",
      description:
        "One or two plain sentences naming the visible marks the call rests on, e.g. 'Black lateral line running onto the tail, and a jutting lower jaw.' When identified is false, say what the photo would need to show instead.",
    },
    guide_species_id: {
      type: "string",
      enum: [...GUIDE_IDS, "none"],
      description:
        "The matching id from this guide's own species list, or 'none' if the fish is not one of them. Only use an id when it genuinely matches the animal in the photo.",
    },
    is_potentially_hazardous: {
      type: "boolean",
      description:
        "True if handling this animal carelessly can injure or poison a person — venomous spines, a barb, serious teeth, or toxic flesh. Err towards true when unsure, and true whenever identified is false, since an unknown fish must be handled as if it bites.",
    },
    hazard_note: {
      type: "string",
      description:
        "One short sentence naming the specific danger and where it is on the animal, e.g. 'Serrated venomous spines at the front of the dorsal and both pectoral fins.' Empty string when is_potentially_hazardous is false.",
    },
    also_consider: {
      type: "array",
      description:
        "Common names of look-alikes this could plausibly be instead, most likely first. Empty when the identification is unambiguous. Always populate this when confidence is low or moderate.",
      items: { type: "string" },
    },
  },
} as const;

const SYSTEM_PROMPT = `You identify fish and other marine animals from angler photographs for Shorebound, a Southwest Florida inshore saltwater field guide covering Tampa Bay south to Boca Grande Pass.

Almost every photo you see will be an inshore catch from this coast — a fish held up on a boat, in a net, on a dock or on the sand. Weight your judgement towards species that actually occur in Florida Gulf inshore water, but do not force a local species onto an animal that clearly is not one.

This guide knows these species, and a match lets the app send the reader somewhere real:
${GUIDE_SPECIES.map((s) => {
  const kind =
    s.kind === "hazard"
      ? " (handle-with-care species)"
      : s.kind === "named"
        ? ` (named at guide locations, no species page) — ${NAMED_SCOPE[s.id]}`
        : "";
  return `  ${s.id} — ${s.name}${kind}`;
}).join("\n")}
Set guide_species_id to one of those ids only when the animal in the photo genuinely is that species. Otherwise use "none" — a wrong deep link is worse than no deep link, because it sends someone to confident handling instructions for the wrong animal. "none" is the right answer for a fish this coast has plenty of but this guide does not list, such as a flounder, a whiting, a grunt, a ladyfish or a black drum; identify it in common_name as normal and leave guide_species_id as "none".

Two of those ids are easy to confuse with each other, so be careful and use also_consider when the photo does not settle it: spanish-mackerel is the smaller spotted one, kingfish is the larger one with a dipped lateral line and no spots on adults. Getting that pair the wrong way round matters — they carry different size and bag rules.

Your answer is a starting point for a human to confirm, not a determination, and it is presented to the reader that way. Two things follow from that:

Do not guess to be helpful. If the photo is blurred, backlit, cropped through the fish, taken from an angle that hides the marks you need, or simply does not contain a fish, set identified to false and use field_marks to say what a better photo would show. A frank "I can't tell" costs the reader one more photo; a confident wrong answer costs them their thumb.

Be conservative about danger. is_potentially_hazardous is about what happens if someone grabs this animal without thinking: venomous spines, a tail barb, teeth that open a hand, flesh that is toxic to eat. When you are not sure what you are looking at, that flag is true. Snook are not on the hazard list above but their gill covers are razor sharp; note things like that in hazard_note even for a target species.

Judge confidence on this photograph, not on the species. "It is obviously a redfish" is only high confidence if the marks are actually visible in the frame.`;

const USER_PROMPT =
  "Identify the animal in this photograph, following the schema. If you cannot see enough to be sure, say so rather than guessing.";

/* ------------------------------------------------------------------ helpers */

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

/**
 * Stable pseudonym for a caller, for rate limiting only.
 *
 * The raw IP is never stored — it is HMAC'd with a server-side pepper that never
 * leaves the Edge runtime, so the ledger holds an opaque token that cannot be
 * walked back to an address. The service-role key doubles as the pepper: it is
 * already present, already secret, and rotating it simply resets everyone's
 * counter, which is a harmless outcome.
 */
async function callerHash(req: Request, pepper: string): Promise<string> {
  const forwarded = req.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`gcf-fish-id:${ip}`));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Strips an optional `data:` prefix and validates the base64 alphabet. */
function normaliseImage(raw: unknown): { data: string; bytes: number } | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  const data = raw.includes(",") && raw.startsWith("data:") ? raw.slice(raw.indexOf(",") + 1) : raw;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  return { data, bytes: Math.floor((data.length * 3) / 4) - padding };
}

/* --------------------------------------------------------------- the handler */

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  // Preflight. Answered before anything else so a browser never sees a 401/405
  // on the OPTIONS and reports it as an opaque CORS failure.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed", message: "POST a photo to this endpoint." }, 405, origin);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return json(
      { error: "not_configured", message: "Photo identification is not switched on for this deployment." },
      503,
      origin,
    );
  }

  // ------------------------------------------------------------- size guard
  // Two ceilings: the raw body, and the decoded image inside it.
  //
  // Deliberately checked AFTER the body is read rather than off Content-Length.
  // Answering 413 while the client is still uploading leaves the request
  // half-sent, and the platform in front of this function then holds the
  // connection open instead of delivering the response — the caller hangs
  // rather than being told no, which is the one failure mode this app does not
  // ship. Reading first costs a couple of megabytes of memory on a request that
  // is already bounded by the gateway, and it answers in about a second.
  const tooLarge = () =>
    json(
      {
        error: "payload_too_large",
        message: "That photo is too large. Try again — the app shrinks photos before sending them.",
      },
      413,
      origin,
    );

  let payload: { image_base64?: unknown; media_type?: unknown };
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_CHARS) return tooLarge();
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "bad_request", message: "Expected a JSON body." }, 400, origin);
  }

  const image = normaliseImage(payload.image_base64);
  if (!image) {
    return json(
      { error: "bad_image", message: "That file did not arrive as a readable image." },
      400,
      origin,
    );
  }
  if (image.bytes > MAX_IMAGE_BYTES) return tooLarge();

  const mediaType = typeof payload.media_type === "string" ? payload.media_type : "image/jpeg";
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType as (typeof ALLOWED_MEDIA_TYPES)[number])) {
    return json(
      {
        error: "bad_image",
        message: "That image format is not supported. Use a JPEG, PNG or WebP photo.",
      },
      400,
      origin,
    );
  }

  // ------------------------------------------------------------- rate limit
  // Deliberately before the Claude call: the whole point is to not spend the
  // money. A rate-limit failure is a hard stop, never a silent pass-through.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  try {
    const hash = await callerHash(req, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: slot, error } = await supabase.rpc("claim_fish_id_slot", { p_caller_hash: hash });
    if (error) throw new Error(error.message);
    if (!slot?.allowed) {
      const scope = slot?.scope ?? "hour";
      return json(
        {
          error: "rate_limited",
          scope,
          retry_after_seconds: slot?.retry_after_seconds ?? 3600,
          message:
            scope === "global"
              ? "Photo ID has hit its daily cap for everyone using the guide. It resets within a day — the rest of the guide works as normal."
              : `You have used your ${slot?.limit ?? ""} photo identifications for the ${scope === "day" ? "day" : "hour"}.`.replace(
                  "  ",
                  " ",
                ),
        },
        429,
        origin,
      );
    }
  } catch (e) {
    // A broken ledger must not become an open tap on someone's API bill.
    console.error("rate limit check failed:", (e as Error).message);
    return json(
      {
        error: "rate_limit_unavailable",
        message: "Photo identification is briefly unavailable. Try again in a few minutes.",
      },
      503,
      origin,
    );
  }

  // ------------------------------------------------------------------ Claude
  const anthropic = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 });

  let response;
  try {
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      // `effort` and the output schema travel together in output_config.
      // Opus 5 runs adaptive thinking by default; medium effort is well matched
      // to a bounded classification and keeps the per-photo cost down.
      output_config: {
        effort: "medium",
        // `format` takes exactly `type` and `schema` — a `name` alongside them
        // is rejected with "Extra inputs are not permitted".
        format: { type: "json_schema", schema: RESULT_SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image.data } },
            { type: "text", text: USER_PROMPT },
          ],
        },
      ],
    } as Parameters<typeof anthropic.messages.create>[0]);
  } catch (e) {
    const err = e as { status?: number; message?: string };
    console.error("anthropic call failed:", err.status ?? "", err.message ?? String(e));
    // 429/5xx from Anthropic are transient; everything else is ours to fix.
    const transient = err.status === 429 || (err.status ?? 500) >= 500 || err.status === undefined;
    return json(
      {
        error: transient ? "upstream_unavailable" : "upstream_error",
        message: transient
          ? "The identification service did not answer. Try again in a moment."
          : "The identification service rejected that photo.",
      },
      transient ? 503 : 502,
      origin,
    );
  }

  // Claude declined the request outright. Rare for a fish photo, but it is a
  // 200 with an empty/partial body, so reading content[0] blind would throw.
  if (response.stop_reason === "refusal") {
    return json(
      {
        error: "declined",
        message: "The identification service declined to answer for this image.",
        // `stop_details` is only populated on a refusal, and can still be null.
        category: response.stop_details?.category ?? null,
      },
      200,
      origin,
    );
  }
  if (response.stop_reason === "max_tokens") {
    return json(
      { error: "truncated", message: "The identification came back incomplete. Try again." },
      502,
      origin,
    );
  }

  const text = response.content.find((b) => b.type === "text");
  let result: unknown;
  try {
    if (!text || text.type !== "text") throw new Error("no text block in response");
    result = JSON.parse(text.text);
  } catch (e) {
    console.error("could not parse structured output:", (e as Error).message);
    return json(
      { error: "bad_upstream_shape", message: "The identification came back in a shape we could not read." },
      502,
      origin,
    );
  }

  return json(
    {
      result,
      // Surfaced so the owner can see per-identification cost without digging
      // through the Anthropic console. Costs nothing to include and there is
      // nothing sensitive in it.
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
      model: response.model,
    },
    200,
    origin,
  );
});
