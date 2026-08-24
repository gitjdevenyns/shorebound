/**
 * Inline art for the Getting Started screen.
 *
 * Five drawings, one per step of the page: the paperwork, the outfit, the
 * counter list, the bait, and what happens when something eats it.
 *
 * These sit in the ICON register rather than the PLACE register that
 * components/location/art.tsx documents. A licence, a rod and a shrimp are
 * objects on a bench, not water over ground, so they are stroke-based line art
 * that takes its ink from `currentColor` and re-colours with the theme — the
 * same construction as components/ui/icons.tsx, drawn on a bigger grid because
 * these carry detail an icon cannot.
 *
 * Colour rules, and they are narrow on purpose:
 *
 *   currentColor  the object itself. The page owns it.
 *   var(--m)      secondary structure that must recede — segment lines, ribs,
 *                 creases, antennae. Never the only thing describing a shape.
 *   var(--l)      hairlines: tray dividers, security print.
 *   var(--c)      knock-out fill. Anything filled with the card surface is
 *                 there to occlude what is behind it, which is how a hand gets
 *                 in front of a fish without a single extra line.
 *   var(--c2)     solid mass — lead, cork, EVA. "This part is not hollow."
 *   var(--accent) monofilament. One meaning, everywhere it appears: this is
 *                 the line, and it is the only thing that is not tackle.
 *   var(--lime)   reserved for the one thing on the page you must not skip —
 *                 here, that the licence is valid.
 *
 * Every drawing is decorative: the page writes the labels, so nothing in here
 * is the sole carrier of any meaning, and no drawing contains words.
 */
type ArtProps = { className?: string };

/* ------------------------------------------------------------- 1 · licence */

/** The card outline, reused as its own clip so the security print stays inside. */
const LICENCE_CARD =
  'M12 8 H120 A6 6 0 0 1 126 14 V70 A6 6 0 0 1 120 76 H12 A6 6 0 0 1 6 70 V14 A6 6 0 0 1 12 8 Z';

/**
 * A saltwater licence as the thing you actually end up holding.
 *
 * Deliberately not a document: no seal, no agency mark, no number, no words at
 * all. What says "this is paperwork" instead is how the object is made — a
 * header band, ruled fields, a signature line, and a guilloche wash across the
 * body, which is the wavy security print every issued card carries and nothing
 * else does.
 *
 * The observed detail is the right-hand edge. A licence bought at a counter
 * comes off a receipt printer with a perforated stub and a punched hole,
 * because it is meant to be torn down and threaded onto a holder — which is
 * exactly why the page tells you the phone app is easier.
 */
export function LicencePlate({ className }: ArtProps) {
  return (
    <svg
      viewBox="0 0 132 84"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="sl-card-clip">
          <path d={LICENCE_CARD} />
        </clipPath>
      </defs>

      {/* card body */}
      <path d={LICENCE_CARD} fill="var(--c)" />

      {/* Guilloche: three interfering waves at different amplitudes and phases.
          Drawn under the fields and clipped to the card, so it reads as printed
          into the stock rather than laid on top of it. */}
      <g clipPath="url(#sl-card-clip)" stroke="var(--l)" strokeWidth="0.9">
        <path d="M0 40 q 9 -7 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0 t 18 0" />
        <path d="M-6 52 q 11 -9 22 0 t 22 0 t 22 0 t 22 0 t 22 0 t 22 0 t 22 0" />
        <path d="M-2 64 q 8 -5 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0 t 16 0" />
      </g>

      {/* header band, and the two type bars that stand in for the words */}
      <path
        d="M12 8 H120 A6 6 0 0 1 126 14 V26 H6 V14 A6 6 0 0 1 12 8 Z"
        fill="var(--c2)"
        stroke="none"
      />
      <path d="M6 26 H126" strokeWidth="1.4" />
      <path d="M14 15.5 H58" strokeWidth="2.8" />
      <path d="M14 21.5 H42" stroke="var(--m)" strokeWidth="1.8" />

      {/* holder fields */}
      <path d="M14 36 H60" stroke="var(--m)" strokeWidth="2.2" />
      <path d="M14 44 H48" stroke="var(--l)" strokeWidth="2" />

      {/* Signature: the rule, and a hand over it. A document that has been
          issued to somebody, without naming anybody. */}
      <path d="M14 64 H60" stroke="var(--l)" strokeWidth="1.4" />
      <path d="M18 61 C 22 54, 25 65, 29 58 C 32 53, 34 63, 38 58 C 41 54.5, 44 60, 48 57" strokeWidth="1.3" />

      {/* Validity block. The one thing on the card that decides whether you can
          legally cast, so it is the one thing wearing the page's accent. */}
      <path
        d="M69 33 H92 A3 3 0 0 1 95 36 V56 A3 3 0 0 1 92 59 H69 A3 3 0 0 1 66 56 V36 A3 3 0 0 1 69 33 Z"
        fill="var(--c2)"
        strokeWidth="1.4"
      />
      <path d="M71.5 46.5 L77.5 52.5 L90 39" stroke="var(--lime)" strokeWidth="2.8" />

      {/* Perforated stub with its punch hole: torn off the counter printer and
          threaded onto a licence holder. */}
      <path d="M101 9 V75" stroke="var(--l)" strokeWidth="1.3" strokeDasharray="2 2.8" />
      <circle cx="113" cy="52" r="4.2" strokeWidth="1.5" />
      <path d="M108 36 H118" stroke="var(--l)" strokeWidth="1.4" />
      <path d="M108 68 H118" stroke="var(--l)" strokeWidth="1.4" />

      {/* card edge, last, so it closes over everything */}
      <path d={LICENCE_CARD} />
    </svg>
  );
}

/* ------------------------------------------------------------ 2 · the rod */

/**
 * One spinning outfit, side-on, whole — the "you probably own something close
 * already" drawing.
 *
 * Two things here are what a rod actually is rather than what a rod symbol
 * usually is. The guides hang UNDER the blank, because that is which way up a
 * spinning rod is fished, and they step down in size from a big stripper guide
 * by the reel to a small tip-top, which is what funnels the cone of line coming
 * off a fixed spool. Follow the accent line and it leaves the spool, wraps the
 * line roller at the tip of the rotor arm where the bail wire lands on it, and
 * only then runs forward into the stripper — the one place on a spinning reel
 * that line ever touches on its way out.
 */
export function RodRig({ className }: ArtProps) {
  return (
    <svg
      viewBox="0 0 216 80"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* Blank, butt left, tip right, with the slight rise a rod has when it is
          not loaded. Drawn heavier at the butt and lighter past the foregrip. */}
      <path d="M14 32 C 40 31.6, 58 31, 74 30" strokeWidth="2.6" />
      <path d="M74 30 C 118 27.4, 160 23.6, 202 20" strokeWidth="1.5" />

      {/* rear grip, reel seat, foregrip */}
      <path d="M17 27.5 H35 A4.5 4.5 0 0 1 35 36.5 H17 A4.5 4.5 0 0 1 17 27.5 Z" fill="var(--c2)" />
      <path d="M15 28.5 V35.5" strokeWidth="1.4" />
      <path d="M38 27.6 H56 V36.4 H38 Z" fill="var(--c)" strokeWidth="1.5" />
      <path d="M52 27.6 V36.4" stroke="var(--m)" strokeWidth="1.2" />
      <path d="M54.4 27.6 V36.4" stroke="var(--m)" strokeWidth="1.2" />
      <path d="M58.5 26 H70 A4 4 0 0 1 70 34 H58.5 A4 4 0 0 1 58.5 26 Z" fill="var(--c2)" />

      {/* Reel foot and stem. A spinning reel hangs below the blank; everything
          from here down is on the underside. */}
      <path d="M42 36.4 L44 41 H50 L52 36.4" fill="var(--c)" strokeWidth="1.5" />
      <path d="M47 41 C 46 44, 45 46, 43.5 48" strokeWidth="2.4" />

      {/* gearbox, crank arm, knob */}
      <ellipse cx="38" cy="52" rx="8.5" ry="8" fill="var(--c)" />
      <path d="M32 55.4 C 28 57.8, 25 59.2, 23 60" strokeWidth="2" />
      <circle cx="20" cy="61.6" r="3.4" fill="var(--c2)" strokeWidth="1.5" />

      {/* Spool: rear skirt, front lip, and the line pack wound to just under
          the lip — a spool filled any lower is where casts start dying. */}
      <path d="M52 39.5 V58" strokeWidth="1.6" />
      <path d="M68 40.5 V57" strokeWidth="1.6" />
      <path d="M52 39.5 C 58 40.5, 63 40.5, 68 40.5" strokeWidth="1.4" />
      <path d="M52 58 C 58 57.2, 63 57.2, 68 57" strokeWidth="1.4" />
      <path d="M52.8 43 C 58 43.8, 63 43.8, 67.4 43" stroke="var(--m)" strokeWidth="1.2" />

      {/* Rotor: the cup behind the skirt, one visible arm sweeping forward, and
          the bail wire arcing over the spool onto the line roller. */}
      <path d="M50 40 C 45.5 44, 45.5 55, 50 58.6" strokeWidth="1.6" />
      <path d="M50.5 57.5 C 57 62.5, 68.5 59.5, 73 49.4" strokeWidth="1.6" />
      <circle cx="73.6" cy="46.6" r="2.6" strokeWidth="1.5" />
      <path d="M74.2 44.2 C 76.5 33.5, 62 30, 50.5 37.6" strokeWidth="1.5" />

      {/* Guides, under the blank, stepping down toward the tip. Each is a ring
          on two legs; the stripper carries its insert ring, which is the part
          that is actually smooth. */}
      <g strokeWidth="1.5">
        <path d="M83.5 29.2 L86.4 32.6" />
        <path d="M92.5 28.8 L89.6 32.6" />
        <circle cx="88" cy="38.8" r="6.4" />
        <circle cx="88" cy="38.8" r="4.5" stroke="var(--m)" strokeWidth="1.1" />

        <path d="M113 27.2 L115.6 29.9" />
        <path d="M121 26.5 L118.4 29.9" />
        <circle cx="117" cy="34.6" r="4.8" />

        <path d="M138.5 25.3 L140.6 27.6" />
        <path d="M145.5 24.6 L143.4 27.6" />
        <circle cx="142" cy="31.4" r="3.8" />

        <path d="M159.8 23.5 L161.6 25.5" />
        <path d="M166.2 22.9 L164.4 25.5" />
        <circle cx="163" cy="28.6" r="3.1" />

        <path d="M179 21.8 L180.7 23.4" />
        <path d="M185 21.3 L183.3 23.4" />
        <circle cx="182" cy="25.9" r="2.5" />

        <path d="M199.4 20.3 L200.6 21.5" />
        <circle cx="201" cy="23.4" r="2.1" />
      </g>

      {/* The line. Off the pack, down onto the roller, then up through every
          ring — the little cusp at the roller is the whole point of a bail. */}
      <path
        d="M62 43.3 C 68.5 43.4, 72.6 44, 74.4 45.6
           C 77.5 42.6, 82 40.4, 88 38.8
           C 98 37.2, 108 35.8, 117 34.6
           C 126 33.4, 134 32.3, 142 31.4
           C 149 30.5, 157 29.4, 163 28.6
           C 170 27.7, 176 26.7, 182 25.9
           C 189 25, 196 24, 201 23.4
           L 213 22.2"
        stroke="var(--accent)"
        strokeWidth="1.3"
      />
    </svg>
  );
}

/* ------------------------------------------------- 3 · terminal tackle tray */

/**
 * The counter list as a tray: circle hook, split shot, egg sinker, jig head,
 * paddletail. Laid out the way a tray gets loaded rather than the way a
 * catalogue lists things — hardware in the small compartments across the top,
 * the one long slot along the bottom for soft plastics.
 *
 * The tray is drawn in hairline so the objects read first, and it carries the
 * moulded rib slots along its edges that the movable dividers snap into.
 *
 * Each object is the specific object, not its category:
 *
 *   circle hook   the point turns back and aims at the shank. That is the
 *                 whole definition — it is why the hook finds the corner of
 *                 the jaw on its own and why you do not strike at it.
 *   split shot    the pair of ears opposite the slot, for prising it open
 *                 again, and the line sitting in the slot.
 *   egg sinker    the bore is countersunk at both ends and the line runs
 *                 straight through it, which is what makes it slide.
 *   jig head      the line tie comes out of the TOP of the head at an angle,
 *                 and the collar behind it is barbed to hold the plastic on.
 *   paddletail    a ribbed body, and a cupped paddle hung off a thin peduncle
 *                 at right angles to it, which is what makes the thump.
 */
export function TerminalTackle({ className }: ArtProps) {
  return (
    <svg
      viewBox="0 0 180 112"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* tray shell */}
      <path
        d="M12 8 H168 A7 7 0 0 1 175 15 V97 A7 7 0 0 1 168 104 H12 A7 7 0 0 1 5 97 V15 A7 7 0 0 1 12 8 Z"
        fill="var(--c)"
        stroke="var(--m)"
        strokeWidth="1.5"
      />
      {/* dividers, and the rib slots the spare ones would drop into */}
      <g stroke="var(--l)" strokeWidth="1.3">
        <path d="M5 70 H175" />
        <path d="M47.5 8 V70" />
        <path d="M90 8 V70" />
        <path d="M132.5 8 V70" />
        <g strokeWidth="1">
          <path d="M26.5 8 V12" />
          <path d="M69 8 V12" />
          <path d="M111 8 V12" />
          <path d="M153.5 8 V12" />
          <path d="M26.5 66 V70" />
          <path d="M69 66 V70" />
          <path d="M111 66 V70" />
          <path d="M153.5 66 V70" />
        </g>
      </g>

      {/* Circle hook. Eye, straight shank, then a bend that keeps turning past
          the bottom and brings the point round to face the shank. */}
      <circle cx="26" cy="20" r="2.6" strokeWidth="1.5" />
      <path d="M26 22.6 V42" />
      <path d="M26 42 C 26 52, 37 54.5, 37.5 45 C 37.8 39, 32 36.4, 28.6 40.6" />
      <path d="M30.4 39 L 32.4 41.2" strokeWidth="1.3" />

      {/* Split shot, pinched on the line, ears down. */}
      <circle cx="69" cy="37" r="8" fill="var(--c2)" />
      <path d="M65.6 44 L 62.4 51 L 69 46.6 Z" fill="var(--c2)" strokeWidth="1.4" />
      <path d="M72.4 44 L 75.6 51 L 69 46.6 Z" fill="var(--c2)" strokeWidth="1.4" />
      <path d="M50 37 H88" stroke="var(--accent)" strokeWidth="1.3" />

      {/* Egg sinker. The line passes clean through, so it is drawn entering and
          leaving, and the bore mouths are flared where it does. */}
      <ellipse cx="111" cy="37" rx="12" ry="8" fill="var(--c2)" />
      <path d="M102 31.4 C 106 30.4, 116 30.4, 120 31.4" stroke="var(--m)" strokeWidth="1" />
      <path d="M100.6 34.6 C 99.2 35.6, 99.2 38.4, 100.6 39.4" strokeWidth="1.3" />
      <path d="M121.4 34.6 C 122.8 35.6, 122.8 38.4, 121.4 39.4" strokeWidth="1.3" />
      <path d="M92 37 H100" stroke="var(--accent)" strokeWidth="1.3" />
      <path d="M122 37 H132" stroke="var(--accent)" strokeWidth="1.3" />

      {/* Jig head: lead moulded round a hook, eye out of the top, barbed collar
          behind it, point riding up. */}
      <path
        d="M140.5 34 C 138.6 28.5, 142 24.4, 146.6 24.6 C 151 24.8, 153.4 28.6, 152.6 32.6 C 152 35.8, 148 37.6, 144.6 37 C 142.4 36.6, 141 35.6, 140.5 34 Z"
        fill="var(--c2)"
      />
      <path d="M149.4 25.6 L 151.4 21.8" strokeWidth="1.6" />
      <circle cx="152.6" cy="19.8" r="2.4" strokeWidth="1.5" />
      <path d="M152.6 33.6 C 158 34.8, 162.4 36.6, 165.2 39.6" />
      <path d="M165.2 39.6 C 168.6 44.4, 166.6 51, 161 51 C 156.6 51, 154 47, 155.6 43.4" />
      <path d="M157.6 44.8 L 155.4 42.4" strokeWidth="1.3" />
      <path d="M154 34.4 L 151.8 32.6" strokeWidth="1.3" />
      <path d="M158 36 L 155.8 34.2" strokeWidth="1.3" />

      {/* Paddletail. Body ribbed, tail section thin, paddle cupped and hung at
          right angles so it kicks rather than trails. */}
      <path d="M24 87 C 26 80.4, 34 78, 46 78.6 C 66 79.6, 96 82.4, 122 84.6" />
      <path d="M24 87 C 26 93.6, 34 96, 46 95.4 C 66 94.4, 96 91.6, 122 89.4" />
      <g stroke="var(--m)" strokeWidth="1.1">
        <path d="M54 79 C 52.6 84, 52.6 90, 54 95.1" />
        <path d="M66 79.6 C 64.8 84.2, 64.8 89.8, 66 94.5" />
        <path d="M78 80.6 C 77 84.6, 77 89.4, 78 93.5" />
        <path d="M90 81.8 C 89.2 85.2, 89.2 88.8, 90 92.3" />
        <path d="M102 83 C 101.4 85.8, 101.4 88.2, 102 91.1" />
      </g>
      <path
        d="M120.6 86.8 C 126 78, 136 72.4, 144 74.6 C 151 76.5, 152.6 85, 149 91.6 C 145.6 98, 136 99, 130 94.8 C 126 92, 122.6 89.6, 120.6 86.8 Z"
      />
      <path d="M131.4 79.6 C 137.6 82, 141.6 88, 140.6 94.4" stroke="var(--m)" strokeWidth="1.2" />
    </svg>
  );
}

/* ------------------------------------------------------------ 4 · the bait */

/**
 * A live shrimp, head right, in the slightly arched posture one holds in the
 * water rather than the ring shape a dead one curls into. Head right because
 * that is the orientation every other animal in this guide is drawn in.
 *
 * The bits that make it a shrimp and not a prawn-shaped blob, front to back:
 *
 *   rostrum      the toothed spike over the eyes, seven dorsal teeth and a
 *                smooth tip. It is the "horn" the whole bait-shop instruction
 *                about where to hook one is about.
 *   eyestalk     the eye is on a stalk under the rostrum, not painted on the
 *                side of the head.
 *   pleura       the six abdominal plates overlap like roof tiles, so the
 *                belly line is scalloped instead of smooth. That overlap is
 *                what lets the tail flex.
 *   swimmerets   five pairs of forked pleopods under the abdomen, raked back.
 *                A shrimp swims with these; the tail is only for the escape.
 *   tail fan     pointed telson in the middle, uropod blades either side of
 *                it, fringed with setae along the trailing edge.
 */
export function BaitShrimp({ className }: ArtProps) {
  return (
    <svg
      viewBox="0 0 224 128"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* Antennae, longer than the animal, trailing back. Drawn first and thin
          so they sit behind everything and never compete with the body. */}
      <g stroke="var(--m)" strokeWidth="1">
        <path d="M170 47 C 186 50, 194 62, 186 74 C 174 92, 128 106, 62 102" />
        <path d="M172 58 C 188 64, 190 80, 172 90 C 148 103, 96 108, 44 98" />
      </g>

      {/* Tail fan. Four blades off the last segment: the telson runs down the
          middle, a uropod blade above and two below. */}
      <g strokeWidth="1.5">
        <path d="M54 74 C 42 66, 28 61, 17 63 C 26 70, 40 75, 53 77.5 Z" fill="var(--c)" />
        <path d="M54 75.6 C 42 74, 26 71, 12 71.6 C 26 77, 40 79, 53 79.4 Z" fill="var(--c)" />
        <path d="M54 78 C 42 80, 28 84, 18 88 C 28 88, 42 84, 53 80.6 Z" fill="var(--c)" />
        <path d="M54 79 C 42 84, 30 90, 22 96 C 32 94, 44 87, 53 82 Z" fill="var(--c)" />
      </g>
      <g stroke="var(--m)" strokeWidth="1">
        <path d="M52 76 C 42 71, 30 67, 20 65" />
        <path d="M52 77.6 C 40 75.6, 26 73.6, 14 72.6" />
        <path d="M52 79.2 C 42 82, 30 85, 20 88" />
        <path d="M52 80.4 C 42 85, 32 90, 24 94" />
        {/* setae along the trailing margin of the top blade */}
        <g strokeWidth="0.9">
          <path d="M22 63.4 L 19.4 61.6" />
          <path d="M28 64.4 L 25.8 62.4" />
          <path d="M34 66.4 L 32 64.2" />
        </g>
      </g>

      {/* Walking legs under the carapace, the front three tipped with the small
          chelae a shrimp actually picks food up with. */}
      <g strokeWidth="1.3">
        <path d="M160 63 C 160 72, 162 79, 166 84" />
        <path d="M166 84 l2.4 3.2 M166 84 l-1.6 3.6" strokeWidth="1.1" />
        <path d="M152 61.5 C 151 71, 152 78, 155 83" />
        <path d="M155 83 l2.4 3.2 M155 83 l-1.8 3.4" strokeWidth="1.1" />
        <path d="M144 60.8 C 142 70, 142 77, 144 82" />
        <path d="M144 82 l2.4 3.2 M144 82 l-1.8 3.4" strokeWidth="1.1" />
        <path d="M137 60.8 C 134 69, 133 76, 134 81" />
        <path d="M130 62 C 127 70, 125 76, 125 80" />
      </g>

      {/* Swimmerets: five pairs, each forked into two rami, raked toward the
          tail the way they sit on a shrimp holding station. */}
      <g strokeWidth="1.3">
        <path d="M124 69 C 121 76, 117 81, 112 84" />
        <path d="M124 69 C 122.5 77, 120 83, 116 87" />
        <path d="M110 74.5 C 107 81, 103 86, 98 89" />
        <path d="M110 74.5 C 108.5 82, 106 88, 102 91" />
        <path d="M96 77 C 93 83.5, 89 88, 85 91" />
        <path d="M96 77 C 94.5 84, 92 90, 89 93" />
        <path d="M83 78.5 C 80.5 84.5, 77 89, 73 92" />
        <path d="M83 78.5 C 82 85, 80 90, 77 93" />
        <path d="M70 79.5 C 68 85, 65 89, 62 91.5" />
        <path d="M70 79.5 C 69 85, 67 89.5, 65 92.5" />
      </g>

      {/* Body. Filled with the card surface so every leg, swimmeret and antenna
          above disappears cleanly under it. The belly is scalloped: each
          abdominal plate hangs a little below the start of the one behind it. */}
      <path
        d="M166 37
           C 150 32, 132 32.5, 118 36.5
           C 104 40.5, 88 48, 76 55
           C 66 61, 58 68, 52 72.5
           L 56 79.5
           C 62 81, 68 80.5, 72 78.5
           C 76 80.5, 82 80, 87 77
           C 91 79, 97 78, 102 74.5
           C 106 76.5, 112 75, 117 71
           C 121 72.5, 126 71, 130 67.5
           C 140 62, 152 60, 166 65
           C 174 58, 175 44, 166 37 Z"
        fill="var(--c)"
      />

      {/* Carapace groove, then the five segment boundaries. Each leans back as
          it drops, which is the direction the plates overlap in. */}
      <g stroke="var(--m)" strokeWidth="1.2">
        <path d="M150 33.6 C 144 42, 143 54, 147 63" />
        <path d="M133 33 C 129 45, 127 58, 126 68.6" />
        <path d="M118 36.6 C 114 47, 112 62, 112 73.4" />
        <path d="M104 42 C 100 52, 98 66, 98 76.2" />
        <path d="M91 49 C 88 57, 86 69, 86 77.6" />
        <path d="M79 57 C 76 63, 74 72, 74 79" />
      </g>

      {/* Rostrum. The upper edge is a run of seven teeth that stops short of a
          smooth tip, with one tooth under the point. */}
      <path d="M168 44.5 C 180 38, 194 29, 205.5 22" strokeWidth="1.6" />
      <path
        d="M164 38.4 l2.2 -3.6 l2.6 1.7 l2.2 -3.6 l2.6 1.7 l2.2 -3.6 l2.6 1.7 l2.2 -3.6 l2.6 1.7
           l2.2 -3.6 l2.6 1.7 l2.2 -3.6 l2.6 1.7 l2.2 -3.6 l2.6 1.7 L205.5 22"
        strokeWidth="1.6"
      />
      <path d="M193.4 30.4 L 195.8 33" strokeWidth="1.3" />

      {/* Eye on its stalk, tucked under the rostrum where it belongs. */}
      <path d="M167 49 C 172 47.4, 176 46.4, 179 46" strokeWidth="2.2" />
      <circle cx="181.6" cy="45.2" r="3.4" fill="currentColor" stroke="none" />
      <circle cx="180.6" cy="44.1" r="1" fill="var(--c)" stroke="none" />

      {/* Antennules — the short paired flagella that fan out ahead of the eyes
          and are the first thing to move when a shrimp is still alive. */}
      <g stroke="var(--m)" strokeWidth="1.2">
        <path d="M174 53 C 188 52, 200 49, 212 44" />
        <path d="M174 56.5 C 188 58, 198 60, 210 62" />
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------- 5 · the holding */

/**
 * How to hold what you catch: fish level, weight in two hands, nothing
 * squeezed.
 *
 * The whole instruction is in where the hands are. The front hand sits well
 * behind the gill plate — you can see both the operculum and the pectoral fin
 * clear of it — cradling the fish under the pectoral girdle where the body is
 * strong enough to take its own weight. The back hand supports the caudal
 * peduncle rather than gripping the tail. Both are palm-up underneath: what
 * shows on this side is a thumb lying flat along the flank, and what shows
 * over the back is fingertips, which is what a supporting hand looks like and
 * a clamping one does not.
 *
 * Drawn calm on purpose: the fish is straight and horizontal, mouth closed,
 * fins relaxed, no line, no hook, no blood. This is the picture of the thing
 * going right.
 */
export function HandsOn({ className }: ArtProps) {
  return (
    <svg
      viewBox="0 0 216 136"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* Fingertips of the far hands, coming over the back. Drawn first: the
          filled body below crops them to just the tips, which is exactly how
          much of them you see. */}
      <g fill="var(--c)" strokeWidth="1.6">
        <path d="M70 44 C 69.4 28, 82 27.6, 82.6 44" />
        <path d="M84 44 C 83.4 26.6, 96 26.2, 96.6 44" />
        <path d="M98 44 C 97.4 28, 108 28, 108.6 44" />
        <path d="M140 54 C 139.4 38, 151 37.6, 151.6 54" />
        <path d="M153 54 C 152.4 40, 163 39.6, 163.6 54" />
      </g>

      {/* Forearms and the heel of each hand, behind the fish. Both come up from
          below — nobody is holding this fish by hanging it. */}
      <g strokeWidth="1.7">
        <path d="M64 74 C 56 84, 52 96, 46 110 C 42 120, 40 128, 39 136" />
        <path d="M74 136 C 76 124, 80 114, 88 106 C 96 99, 104 90, 106 74" />
        <path d="M146 68 C 142 78, 144 90, 152 98 C 158 104, 164 110, 170 122 C 172 128, 174 132, 175 136" />
        <path d="M199 136 C 196 126, 190 114, 184 104 C 180 96, 176 84, 174 66" />
      </g>

      {/* Fish. Filled with the card surface, so the hands sort themselves out:
          anything drawn before it is behind, anything after is in front. */}
      <path
        d="M28 58
           C 34 48, 46 40, 66 36
           C 92 31, 124 34, 148 43
           C 160 47.5, 168 52, 174 56
           C 168 60, 160 66.5, 148 71
           C 124 80, 92 83, 66 78
           C 46 74, 34 66, 28 60
           C 26.4 59.4, 26.4 58.6, 28 58 Z"
        fill="var(--c)"
      />
      {/* forked tail */}
      <path d="M174 56 L 200 40 C 192 48, 192 64, 200 72 Z" fill="var(--c)" />
      <path d="M170 50 C 172 53, 172 59, 170 62" stroke="var(--m)" strokeWidth="1.2" />

      {/* gill cover and preopercle — the landmark the front hand stays behind */}
      <path d="M52 41 C 45 50, 45 68, 51 76" strokeWidth="1.5" />
      <path d="M44 44 C 40 51, 40 66, 43 72" stroke="var(--m)" strokeWidth="1.2" />

      {/* eye, mouth, lateral line */}
      <circle cx="41" cy="52" r="3.4" strokeWidth="1.5" />
      <circle cx="41" cy="52" r="1.2" fill="currentColor" stroke="none" />
      <path d="M28.5 60.5 C 34 63, 40 64, 45 64" strokeWidth="1.5" />
      <path
        d="M56 55 C 88 57, 122 59, 156 56"
        stroke="var(--m)"
        strokeWidth="1.2"
        strokeDasharray="5 4"
      />

      {/* fins, relaxed */}
      <path d="M90 33.6 C 98 23.5, 116 22, 130 28.4" strokeWidth="1.6" />
      <g stroke="var(--m)" strokeWidth="1.1">
        <path d="M100 30 L 102 25" />
        <path d="M110 28.6 L 112 24.2" />
        <path d="M120 28.6 L 122 25" />
      </g>
      <path d="M58 68 C 62 78, 70 83, 78 83 C 73 76, 66 70, 62 66" strokeWidth="1.5" />
      <path d="M124 80 C 128 88, 136 90, 142 88" strokeWidth="1.5" />

      {/* Near thumbs, lying flat along the flank. Flat, not dug in — a thumb
          that is doing the work is a thumb in the gills. */}
      <path
        d="M68 88 C 70 79, 78 71, 88 66 C 94 63, 99 62, 101 64 C 103 66, 101 69, 96 71
           C 88 75, 81 81, 77 88 C 75 91, 71 92, 68 88 Z"
        fill="var(--c)"
        strokeWidth="1.6"
      />
      <path d="M95.4 65.6 C 97.6 64.2, 99.6 64, 100.8 64.8" stroke="var(--m)" strokeWidth="1.1" />
      <path
        d="M158 86 C 154 78, 148 70, 142 64 C 138 60, 134 59, 132 61 C 130 63, 132 66, 136 69
           C 142 74, 148 80, 150 86 C 152 90, 156 91, 158 86 Z"
        fill="var(--c)"
        strokeWidth="1.6"
      />
      <path d="M136.4 62.6 C 134.2 61, 132.4 60.8, 131.4 61.8" stroke="var(--m)" strokeWidth="1.1" />

      {/* wrist creases, which is what stops the forearms reading as sticks */}
      <g stroke="var(--m)" strokeWidth="1.2">
        <path d="M50 100 C 56 104, 64 106, 71 105" />
        <path d="M148 96 C 154 100, 162 102, 169 101" />
      </g>
    </svg>
  );
}
