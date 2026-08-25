import type { Fish } from './types';

/**
 * Migrated from v6 window.FISH (data.js) + window.HANDLING (supplement.js).
 * Most image URLs are still the original v6 hotlinks, with no recorded licence;
 * provenance/local-asset migration is tracked separately and has so far only
 * reached the two identification photos that were actively wrong (tarpon,
 * snapper). Anything here without a `source_url` and a `license` is unverified
 * and should be treated as a bug waiting to be found, not as settled.
 */

/**
 * v6 carried one shared landing-tool string for every species, and it ended
 * with a tarpon-specific clause — which read as a non-sequitur on a redfish or
 * snapper page. Same guidance, scoped to the species it is actually about.
 */
const NET_NOTE = 'Knotless rubber-coated net, sized for the target.';

/** Adult tarpon are too large to net or boat safely, for fish or angler. */
const TARPON_NOTE =
  'No net and no boating an adult — keep the fish alongside in the water and support it there for the release.';

/**
 * Species that are mostly caught off a high pier deck. The net is the same
 * net; what changes is that you cannot lift the fish on the leader from twenty
 * feet up, which is how leaders break and hooks land on whoever is below.
 */
const PIER_NET_NOTE = `${NET_NOTE} From a high pier deck, use the drop net rather than lifting the fish on the leader.`;

/** A ladyfish rolls, and a rolling fish turns mesh and trebles into a knot. */
const LADYFISH_NOTE =
  'Usually no net at all: lead it to hand and take it across the body just behind the head with a wet hand, or leave it in the water and back the hook out with long pliers.';

/** Beach fish: the wave does the lifting, and dry sand is the thing to avoid. */
const SURF_NOTE =
  'On the beach, time a wave and slide the fish up onto wet sand — never drag it into dry sand. Knotless rubber net from a pier or a boat.';

/** The scutes on a jack's tail wrist are the reason not to tail-grab one. */
const JACK_NOTE =
  'Knotless rubber-coated net for a small one. Lift a big one with a wet hand supporting the belly, never by the tail wrist — the bony scutes there are sharp.';

/** A big drum is heavier than it looks and should not be held up at all. */
const DRUM_NOTE = `${NET_NOTE} A big drum is too heavy to hold clear of the water — keep that one alongside and unhook it there.`;

export const FISH: Fish[] = [
  {
    id: 'snook',
    name: 'Common Snook',
    images: [
      {
        url: 'https://www.floridamuseum.ufl.edu/wp-content/uploads/sites/66/2017/05/Centropomus-undecimalis-01.jpg',
        alt: 'Common snook identification photo',
      },
      {
        url: 'https://www.anglersbooking.com/blog/articles/boca-grande-fishing/images/underwater-snook-fish.webp',
        alt: 'Snook underwater near structure',
      },
    ],
    habitat: 'Mangroves, beaches, passes, docks, bridge shadow lines',
    gear: "7–7'6 MH • 4000–5000 • 20–30 lb braid",
    leader: '30–40 lb fluoro; 40–60 at pilings',
    hook: '2/0–5/0 inline circle',
    bait: 'Pilchard, pinfish, mullet, shrimp; paddletail/jerk shad',
    landing_tool: NET_NOTE,
    handling: {
      dos: [
        'Leave it in the water while dehooking when possible',
        'Wet hands before touching',
        'Support horizontally for a quick photo',
        'Use adequate tackle so the fight is not prolonged',
      ],
      donts: [
        'Do not grab the gill plate—FWC warns the gill covers are razor sharp',
        'Do not put fingers in gills or eyes',
        'Do not drag large fish onto dry sand or deck',
      ],
      angler:
        'Razor-sharp gill covers. Control the head and keep fingers behind/away from the gill plate.',
    },
  },
  {
    id: 'redfish',
    name: 'Redfish / Red Drum',
    images: [
      {
        url: 'https://www.floridamuseum.ufl.edu/wp-content/uploads/sites/66/2017/05/Sciaenops-ocellatus-01.jpg',
        alt: 'Redfish identification photo',
      },
      {
        // The v6 hotlink (fishingweather.app) now answers 403 to every request,
        // browser user-agent and referer included, so this hero rendered blank.
        // Replaced with a verified public-domain USFWS photograph.
        url: '/assets/media/red_drum_fish.webp',
        alt: 'Red drum held horizontally over marsh water: coppery bronze back, white belly and the black spot at the base of the tail',
        source_url: 'https://commons.wikimedia.org/wiki/File:Red_Drum_Fish.jpg',
        license:
          'Public domain (Steve Hillebrand, U.S. Fish and Wildlife Service, via Wikimedia Commons)',
      },
    ],
    habitat: 'Oyster edges, grass, potholes, drains',
    gear: "7–7'6 M • 3000–4000 • 15–20 lb braid",
    leader: '20–30 lb fluoro',
    hook: '1/0–3/0 circle or 3/0–4/0 weedless',
    bait: 'Shrimp, pinfish, cut mullet; gold spoon/paddletail',
    landing_tool: NET_NOTE,
    handling: {
      dos: [
        'Wet hands',
        'Use a knotless rubber net',
        'Support belly and tail horizontally',
        'Release head-first',
      ],
      donts: [
        'Do not hang vertically by the jaw',
        'Do not scrape across oyster shell or dry surfaces',
        'Do not squeeze the abdomen',
      ],
      angler:
        'Generally manageable, but dorsal fin rays/spines and hooks are the main handling hazards.',
    },
  },
  {
    id: 'trout',
    name: 'Spotted Seatrout',
    images: [
      {
        url: 'https://www.floridamuseum.ufl.edu/wp-content/uploads/sites/66/2017/05/Cynoscion-nebulosus-01.jpg',
        alt: 'Spotted seatrout identification photo',
      },
      {
        url: 'https://www.louisianasportsman.com/wp-content/uploads/2023/08/Eel-Grass-pic2.jpg',
        alt: 'Seatrout over grass',
      },
    ],
    habitat: 'Grass flats, sandy potholes, channel edges',
    gear: "7–7'6 M • 2500–3000 • 10–15 lb braid",
    leader: '15–20 lb fluoro',
    hook: '1/0–2/0 circle or 1/8–1/4 oz jig',
    bait: 'Live shrimp under cork; 3–4 in paddletail',
    landing_tool: NET_NOTE,
    handling: {
      dos: [
        'Keep handling exceptionally brief',
        'Use wet hands and rubber net',
        'Support horizontally',
        'Dehook in water when possible',
      ],
      donts: [
        'Do not squeeze—trout are delicate',
        'Do not lift by leader',
        'Keep fingers away from mouth',
      ],
      angler:
        'Large canine teeth at the front of the upper jaw; dorsal spines can also prick hands.',
    },
  },
  {
    id: 'tarpon',
    name: 'Tarpon',
    images: [
      {
        // The v6 hotlink (Florida Museum, © Don DeMaria) was a 380x256 murky
        // blue frame of a school, shot three-quarters-on with the watermark
        // across the corner: no lateral profile, no dorsal filament, no tail,
        // and all rights reserved. Replaced with a verified CC BY-SA aquarium
        // photograph that shows every mark the ID list points at.
        url: '/assets/media/megalops_atlanticus_by_daijuazuma.webp',
        alt: 'Adult tarpon in clear water, whole fish in lateral profile facing right: plate-like silver scales, upturned mouth with a jutting lower jaw, single dorsal fin and a deeply forked tail',
        source_url:
          'https://commons.wikimedia.org/wiki/File:Megalops_atlanticus_by_DaijuAzuma.jpg',
        license: 'CC BY-SA 4.0 (Daiju Azuma, via Wikimedia Commons)',
      },
      {
        url: 'https://www.saltyjawcharters.com/uploads/9/2/6/0/92607848/img-4612_orig.jpeg',
        alt: 'Tarpon boatside',
      },
    ],
    habitat: 'Passes, beaches, bridges, harbor mouths',
    gear: "7'6–8 H • 6000–8000 • 40–50 lb braid",
    leader: '60–80 lb leader',
    hook: '5/0–8/0 strong inline circle',
    bait: 'Pass crab, threadfin, pilchard, mullet',
    landing_tool: TARPON_NOTE,
    handling: {
      dos: [
        'For fish over 40 inches, keep it in the water',
        'Use a long dehooker or cut leader close',
        'Keep gills submerged',
        'Use tackle heavy enough to shorten the fight',
      ],
      donts: [
        'Do not boat or drag large tarpon over a gunwale',
        'Do not hold by gills/eyes',
        'Do not prolong photos',
      ],
      angler:
        'Large fish can thrash violently; mouth is abrasive and hooks are a major hazard. Control from alongside the boat.',
    },
  },
  {
    id: 'snapper',
    name: 'Mangrove / Gray Snapper',
    images: [
      {
        // The v6 hotlink (Florida Museum, © Joe Marino, 380x260) was a school
        // of six fish behind a sea rod, every one of them part-hidden by the
        // coral: with four numbers on it there was no way to tell which fish —
        // let alone which feature — any of them meant. The mouths were shut,
        // the flanks overlapped, and it carried no usable licence.
        //
        // Replaced with the FDA Regulatory Fish Encyclopedia plate of a
        // vouchered Lutjanus griseus. The RFE exists to let inspectors tell
        // snapper species apart, so it is the rare photograph that shows the
        // two things this page calls decisive: the mouth is open on the pair of
        // upper-jaw canines, and the flank under the soft dorsal — where a lane
        // snapper's spot would be — is bare and evenly lit.
        //
        // This one is a local asset rather than a hotlink because the RFE frame
        // is a specimen on a light table: a colour-control chart across the top
        // and a 10 cm scale bar bottom-right, with the fish covering about a
        // third of it. Cropping to the fish is the whole point, and you cannot
        // crop someone else's URL. Public domain, so the crop is unrestricted;
        // `source_url` points at the uncropped original. Cut to exactly 3:2 —
        // the aspect `.idphoto` renders — so `object-fit: cover` takes nothing
        // more off and the mark percentages in `speciesContent.ts` are the
        // literal percentages of this file.
        url: `${import.meta.env.BASE_URL}assets/species/gray-snapper-fda-rfe.jpg`,
        alt: 'Gray snapper in lateral profile facing left against a white ground: pointed snout on a straight sloping head, mouth open on two canine teeth at the front of the upper jaw, a clean unspotted flank, and rust-red margins on the dorsal and anal fins',
        source_url: 'https://commons.wikimedia.org/wiki/File:Lutjanus_griseus_(RFEIMG-0129).jpg',
        license:
          'Public domain (U.S. FDA Regulatory Fish Encyclopedia, photograph by Warren E. Savary) — cropped',
      },
      {
        url: 'https://www.anglersbooking.com/blog/articles/tampa-bay-fishing/images/mangrove-snapper-group-mangrove-roots-florida.webp',
        alt: 'Mangrove snapper around mangrove roots',
      },
    ],
    habitat: 'Mangroves, docks, bridge pilings, rock',
    gear: '7 M • 3000–4000 • 15–20 lb braid',
    leader: '20–30 lb fluoro',
    hook: '1/0–2/0 circle',
    bait: 'Shrimp, pilchard, pinfish, cut bait',
    landing_tool: NET_NOTE,
    handling: {
      dos: [
        'Wet hands',
        'Use rubber net',
        'Support body',
        'Use pliers for hook removal',
      ],
      donts: [
        'Do not put fingers in mouth',
        'Do not hold only by jaw for extended periods',
        'Do not let it flop on hot/dry deck',
      ],
      angler:
        'Two prominent canine teeth; dorsal spines can prick. Use pliers and keep fingers clear of mouth.',
    },
  },

  /* ------------------------------------------------------------------ *
   * Six species added after the v6 migration, because five targets was a
   * narrow read of this coast: the everyday dock/oyster fish (sheepshead,
   * black drum), the surf fish the habitat module already taught but no
   * species page covered (pompano), the fast pass-and-pier fish (Spanish
   * mackerel, jack crevalle), and the one an angler with no boat and no
   * experience can actually go and catch on purpose (ladyfish).
   *
   * Sourcing, in the order CONTENT_AND_RESEARCH.md sets out:
   *
   * - Identification, habitat, diet and size for all six: the FWC species
   *   profiles under myfwc.com/wildlifehabitats/profiles/saltwater/.
   * - Extra identification and anatomy detail where FWC has a profile but
   *   Florida Museum goes deeper: sheepshead (three rows of upper-jaw teeth,
   *   stout fin spines), ladyfish (fine sharp teeth, leaping behaviour),
   *   Spanish mackerel (single row of triangular teeth), crevalle jack
   *   (pectoral-fin spot, villiform teeth) — floridamuseum.ufl.edu.
   *   Florida Museum has no Discover Fish profile for black drum or Florida
   *   pompano, so those two rest on FWC alone rather than on a guess.
   * - The 30–60 lb Spanish mackerel bite leader is FWC's own recommendation,
   *   given as a recommendation and never as a rule.
   * - Tackle sizes are starting points, as everywhere else in this guide.
   *   Nothing here states a season, a size limit or a bag limit; the species
   *   page sends the angler to FWC for all three.
   *
   * Every image is Wikimedia Commons, public domain or CC, checked over HTTP
   * and looked at before it was written down: each one is the species it
   * claims to be, and none of them is used anywhere else in the data set.
   * ------------------------------------------------------------------ */

  {
    id: 'sheepshead',
    name: 'Sheepshead',
    images: [
      {
        url: '/assets/media/archosargus_probatocephalus_-_str-flings-meerbrasse_54181265.webp',
        alt: 'Sheepshead lying on grass in left profile: five dark vertical bars down a silver body, blunt snout with protruding incisors, and a row of stout spines along the dorsal fin',
        source_url:
          'https://commons.wikimedia.org/wiki/File:Archosargus_probatocephalus_-_Str%C3%A4flings-Meerbrasse_54181265.jpg',
        license: 'CC BY 4.0 — Dominic, via Wikimedia Commons',
      },
      {
        url: '/assets/media/sheepshead_fish_-_archosargus_probatocephalus.webp',
        alt: 'Close-up of a sheepshead at the surface with its mouth open, showing the broad human-like incisors at the front of both jaws',
        source_url:
          'https://commons.wikimedia.org/wiki/File:Sheepshead_Fish_-_Archosargus_probatocephalus.jpg',
        license: 'CC BY 2.0 — Linda Tanner, via Wikimedia Commons',
      },
    ],
    habitat: 'Dock and bridge pilings, oyster bars, seawalls, jetty rock, tidal creeks',
    gear: "7–7'6 M fast • 2500–4000 • 15–20 lb braid",
    leader: '20–25 lb fluoro; 30 lb on barnacled pilings',
    hook: '1–2/0 short shank, thin wire, very sharp',
    bait: 'Fiddler crab, live shrimp, sand flea, scraped barnacle; small jig tipped with shrimp',
    landing_tool: PIER_NET_NOTE,
    handling: {
      dos: [
        'Take it across the back with a wet hand, behind the dorsal spines',
        'Unhook with pliers — the bite is a shell-crusher, not a nip',
        'Hold it in the net while you work the hook out',
        'Support the body horizontally for a photo',
      ],
      donts: [
        'Do not close a bare hand over the dorsal or anal fin',
        'Do not put fingers in the mouth or under the gill cover',
        'Do not drop it on hot dry concrete while you find the pliers',
      ],
      angler:
        'Stout, sharp dorsal and anal spines that lock upright when it flexes, a sharp-edged gill cover, and incisors and grinders built to crush oyster shell. Hold it across the back, behind the spines, and use pliers.',
    },
  },
  {
    id: 'ladyfish',
    name: 'Ladyfish',
    images: [
      {
        url: '/assets/media/elops_saurus_-fda_057-.webp',
        alt: 'Ladyfish reference photograph in left profile: slender silver body in fine scales, large eye, mouth at the very tip of the head, a single small dorsal fin set well back and a deeply forked tail. A red specimen tag is clipped through the jaw',
        source_url: 'https://commons.wikimedia.org/wiki/File:Elops_saurus_(FDA_057).jpg',
        license: 'Public domain (U.S. Food and Drug Administration, via Wikimedia Commons)',
      },
      {
        url: '/assets/media/ladyfish_tampa_bay_2016.webp',
        alt: 'Hooked ladyfish being led through clear green shallows at Fort De Soto, Tampa Bay, with the fishing line running up out of frame',
        source_url: 'https://commons.wikimedia.org/wiki/File:Ladyfish_Tampa_Bay_2016.jpg',
        license: 'CC BY-SA 4.0 — Mike Cline, via Wikimedia Commons',
      },
    ],
    habitat: 'Passes, bridge and pier lights, beach troughs, bay channels, bait schools',
    gear: "6'6–7 ML • 2500–3000 • 10–15 lb braid",
    leader: '20–25 lb fluoro — for the teeth and the thrashing, not for shyness',
    hook: '1/0–2/0 inline circle for bait, or a 1/8–1/4 oz single-hook jig',
    bait: 'Live or cut shrimp, small cut baitfish; white jig, small silver spoon, small jerkbait',
    landing_tool: LADYFISH_NOTE,
    handling: {
      dos: [
        'Fish a single hook and crush the barb — this is a fish you will unhook a lot',
        'Wet your hand before you take hold of it',
        'Unhook it in the water when the hook is showing',
        'Expect it to jump and go slack — keep the rod loaded',
      ],
      donts: [
        'Do not swing it aboard or onto a dock on the line',
        'Do not squeeze it to stop it thrashing',
        'Do not put fingers in the mouth — the teeth are fine and they scrape',
      ],
      angler:
        'Bands of fine, sharp teeth that graze skin, and a fish that does not stop moving — the loose hook in a thrashing fish is the real hazard here. Long pliers, not fingers, and expect to get slimed.',
    },
  },
  {
    id: 'black-drum',
    name: 'Black Drum',
    images: [
      {
        url: '/assets/media/pogonias_cromis_-fda_122-.webp',
        alt: 'Black drum reference photograph in left profile: high arched grey back, blunt down-turned snout, a pale fringe of barbels under the chin and a clean tail base with no black spot',
        source_url: 'https://commons.wikimedia.org/wiki/File:Pogonias_cromis_(FDA_122).jpg',
        license: 'Public domain (U.S. Food and Drug Administration, via Wikimedia Commons)',
      },
      {
        url: '/assets/media/black_drumnab_3.17.webp',
        alt: 'Black drum nosing down onto the bottom with its chin barbels touching the substrate, showing the head-down feeding posture',
        source_url: 'https://commons.wikimedia.org/wiki/File:Black_drumNAB_3.17.jpg',
        license: 'CC BY 2.0 — lwolfartist, via Wikimedia Commons',
      },
    ],
    habitat: 'Oyster bars, bridge and dock pilings, passes, deep holes and channel edges',
    gear: "7–7'6 MH • 4000–5000 • 20–30 lb braid",
    leader: '25–40 lb fluoro',
    hook: '2/0–5/0 inline circle',
    bait: 'Fresh dead shrimp, cut blue crab, sand flea, clam; jig tipped with shrimp',
    landing_tool: DRUM_NOTE,
    handling: {
      dos: [
        'Fish it on the bottom and let the circle hook find the corner of the jaw',
        'Wet hands and a rubber net',
        'Support belly and tail horizontally, with two hands on a big one',
        'Leave the biggest fish in the water for the whole release',
      ],
      donts: [
        'Do not hang a heavy drum vertically by the jaw',
        'Do not reach into the throat — the crushing plates are back there',
        'Do not scrape it across oyster shell, barnacle or dry concrete',
      ],
      angler:
        'No cutting teeth in the jaws, but shell-crushing plates in the throat and stiff dorsal spines. The real hazard is weight: a big drum is heavy and awkward, and dropping one hurts you both.',
    },
  },
  {
    id: 'pompano',
    name: 'Florida Pompano',
    images: [
      {
        url: '/assets/media/trachinotus_carolinus_-fda_236-.webp',
        alt: 'Florida pompano reference photograph in left profile: deep compressed silver body, gently sloping forehead, small mouth, yellow wash on the belly and throat and a deeply forked tail',
        source_url: 'https://commons.wikimedia.org/wiki/File:Trachinotus_carolinus_(FDA_236).jpg',
        license: 'Public domain (U.S. Food and Drug Administration, via Wikimedia Commons)',
      },
      {
        url: '/assets/media/trachinotus_carolinus_325760204.webp',
        alt: 'Florida pompano held flat in an open hand on a sand beach, showing the pan-shaped silver body and yellow underside of a surf-caught fish',
        source_url: 'https://commons.wikimedia.org/wiki/File:Trachinotus_carolinus_325760204.jpg',
        license: 'CC BY 4.0 — geosesarma, via Wikimedia Commons',
      },
    ],
    habitat: 'Surf trough and beach cuts, sandbar edges, pass mouths, sand potholes on grass flats',
    gear: "9–12 ft surf or 7' M • 4000–5000 • 15–20 lb braid",
    leader: '20–30 lb fluoro dropper loops',
    hook: '#1–2/0 on a two-hook dropper rig, or a 1/4–3/8 oz pompano jig',
    bait: 'Sand flea (mole crab), fresh shrimp, clam strip; pink or chartreuse pompano jig',
    landing_tool: SURF_NOTE,
    handling: {
      dos: [
        'Fish the trough and the cuts through the bar, not the flat sand between them',
        'Wet your hands and keep the fish on wet sand',
        'Unhook it low, over water or wet sand, so a dropped fish is not a dry one',
        'Put it back through the back of a wave, head first',
      ],
      donts: [
        'Do not lay it in dry sand — sand strips the slime coat',
        'Do not leave a baited surf rig unattended with the rod flat on the beach',
        'Do not lift it by the tail alone',
      ],
      angler:
        'The mildest of these six in the hand: a small mouth, no cutting teeth. The hazards are the rig rather than the fish — two or three hooks and a heavy pyramid lead swinging on a short drop — plus small stiff spines in the dorsal and anal fins.',
    },
  },
  {
    id: 'spanish-mackerel',
    name: 'Spanish Mackerel',
    images: [
      {
        url: '/assets/media/scomberomorus_maculatus_-fda_088-.webp',
        alt: 'Spanish mackerel reference photograph in left profile: slim silver body scattered with round golden-yellow spots, triangular teeth showing in the open jaw, a dark first dorsal fin and a lateral line that slopes gently to the tail',
        source_url:
          'https://commons.wikimedia.org/wiki/File:Scomberomorus_maculatus_(FDA_088).jpg',
        license: 'Public domain (U.S. Food and Drug Administration, via Wikimedia Commons)',
      },
      {
        url: '/assets/media/scomberomorus_maculatus_florida.webp',
        alt: 'Spanish mackerel held horizontally by the tail in Florida with an orange dehooking tool at the jaw, showing the sharp triangular teeth and the gold spots scattered along a silver flank',
        source_url: 'https://commons.wikimedia.org/wiki/File:Scomberomorus_maculatus_Florida.jpg',
        license: 'CC BY-SA 4.0 — naokitakebayashi, via Wikimedia Commons',
      },
    ],
    habitat: 'Passes, pier and jetty fronts, nearshore bars, edges of grass flats',
    gear: "7–7'6 M • 3000–4000 • 15–20 lb braid",
    leader: '30–60 lb mono bite leader — FWC recommends that range for the teeth alone',
    hook: 'Single hook on the spoon or jig; 1/0–3/0 long shank for live bait',
    bait: 'Live pilchard, threadfin, cut sardine; silver casting spoon, white jig, small plug',
    landing_tool: PIER_NET_NOTE,
    handling: {
      dos: [
        'Control the fish in the net or on a wet surface before the hook comes out',
        'Use long pliers or a dehooker and keep both hands behind the gill covers',
        'Cast at the edge of a bait shower rather than into the middle of it',
        'Get it back in the water fast — this is a soft-scaled, easily damaged fish',
      ],
      donts: [
        'Do not put a hand near the mouth, and never lip one',
        'Do not hold a treble-hooked fish still with your other hand',
        'Do not let it beat itself against a dry deck while you find the pliers',
      ],
      angler:
        'Razor-sharp triangular teeth in a single row — FWC recommends a 30–60 lb leader on account of them. Treat the head as off limits, unhook with a tool, and watch the trailing treble when the fish shakes.',
    },
  },
  {
    id: 'jack-crevalle',
    name: 'Jack Crevalle',
    images: [
      {
        url: '/assets/media/caranx_hippos_-fda_129-.webp',
        alt: 'Crevalle jack reference photograph in left profile: deep body with a steep blunt forehead, black spot on the gill cover, black spot at the base of the pectoral fin and a yellow deeply forked tail',
        source_url: 'https://commons.wikimedia.org/wiki/File:Caranx_hippos_(FDA_129).jpg',
        license: 'Public domain (U.S. Food and Drug Administration, via Wikimedia Commons)',
      },
      {
        url: '/assets/media/atlantic_crevalle_jack-_indian_river-_hutchinson_island-_fl-_us_imported_from_inaturalist_photo_184824501.webp',
        alt: 'Large crevalle jack held up in two hands by an angler standing on a Florida inlet seawall at dusk, showing the blunt steep forehead, deep silver body and yellow forked tail of a shore-caught fish',
        source_url:
          'https://commons.wikimedia.org/wiki/File:Atlantic_Crevalle_Jack,_Indian_River,_Hutchinson_Island,_FL,_US_imported_from_iNaturalist_photo_184824501.jpg',
        license: 'CC BY-SA 4.0 — Curtis Meyers, via Wikimedia Commons',
      },
    ],
    habitat: 'Passes, bridge and pier lights, harbour mouths, seawalls, open bay over bait',
    gear: "7–7'6 MH • 4000–6000 • 30–40 lb braid",
    leader: '40–60 lb fluoro or mono — for abrasion, not for teeth',
    hook: '3/0–5/0 inline circle for bait; swap plug trebles for single inline hooks',
    bait: 'Live pilchard, threadfin, mullet; topwater plug, heavy spoon, bucktail jig',
    landing_tool: JACK_NOTE,
    handling: {
      dos: [
        'Use tackle heavy enough to end the fight — a jack will fight until it cannot swim',
        'Hold it horizontally with a wet hand under the belly',
        'Revive it head into the current until it pulls away on its own',
        'Unhook with pliers while the head is still',
      ],
      donts: [
        'Do not grab it by the tail wrist — the scutes there are sharp bony plates',
        'Do not lip it like a bass; the jaw edges and gill covers cut',
        'Do not release an exhausted fish before it can hold itself upright',
      ],
      angler:
        'Barely any teeth, but hard bony scutes along the tail wrist that will open a finger, sharp gill-cover edges, and enough power to bury a hook in your hand. Keep the head still, use pliers, and pick it up across the body.',
    },
  },
];

export const fishById = (id: string): Fish | undefined =>
  FISH.find((f) => f.id === id);
