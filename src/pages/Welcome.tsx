import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { getFishList, getHabitats, getHazards, getLocations } from '../lib/api';
import { ISSUES_URL, SUPPORT_EMAIL } from '../data/contact';
import type { Location } from '../data';

/**
 * /welcome — the landing page.
 *
 * Written to the reader in marketing/NARRATIVE.md: an angler with twenty years
 * on him standing on a beach where none of it transfers. Not a beginner —
 * displaced. So every line is written to a competent equal who is missing local
 * knowledge, and nothing here explains what a leader is.
 *
 * Two rules shape the code as much as the copy:
 *
 * 1. Every number on this page is counted from the shipped data at render time
 *    rather than typed into the copy. A landing page that says "25 spots" while
 *    the guide holds 24 is exactly the failure marketing/CONTENT_POLICY.md
 *    exists to prevent, and hardcoding is how that happens.
 * 2. Every fishing claim is a verbatim string out of src/data. The policy
 *    forbids paraphrasing researched content, because paraphrasing researched
 *    fishing content is writing new fishing content.
 *
 * The sign-up form has no backend and does not pretend to. See SignupForm.
 */

/** Access types you can reach without a boat. `kayak` and `boat` are not. */
const ON_FOOT = ['shore', 'wade', 'pier', 'bridge'];

/* --------------------------------------------------------------- tideline */

const CURVE_W = 1200;
const CURVE_H = 132;
/** Quarter-cycle offset so the four stage marks land inside the frame. */
const PHASE = 0.125;
const STAGES = ['Low', 'Incoming', 'High', 'Outgoing'];

function tideY(t: number): number {
  const mid = CURVE_H / 2;
  const amp = CURVE_H / 2 - 12;
  return mid + amp * Math.cos((t - PHASE) * Math.PI * 2);
}

function tidePath(): string {
  const steps = 120;
  let d = '';
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    d += `${i === 0 ? 'M' : 'L'}${((t * CURVE_W).toFixed(1))} ${tideY(t).toFixed(2)} `;
  }
  return d.trim();
}

/**
 * One tide cycle with its four stages named.
 *
 * The drawing is decorative and hidden from the a11y tree; the stage names
 * underneath it are real text and carry the meaning. It is a schematic, not a
 * prediction, and the caption says so — the real curve on a spot page is drawn
 * from that spot's own NOAA station.
 */
function Tideline() {
  const marks = STAGES.map((_, i) => {
    const t = PHASE + i * 0.25;
    return { x: t * CURVE_W, y: tideY(t) };
  });

  return (
    <div className="wl-tideline">
      <svg
        viewBox={`0 0 ${CURVE_W} ${CURVE_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <line className="mean" x1="0" y1={CURVE_H / 2} x2={CURVE_W} y2={CURVE_H / 2} />
        <path className="line" d={tidePath()} pathLength={1} />
        {marks.map((m) => (
          <circle key={m.x} className="dot" cx={m.x} cy={m.y} r="7" />
        ))}
      </svg>
      <ol className="wl-stages">
        {STAGES.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <p className="wl-note">
        Schematic. Every spot draws its own curve from its own NOAA station.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------- sign-up */

/**
 * There is no list.
 *
 * The honest version of an email capture with nothing behind it is to say so
 * before the reader types and again after they submit — not to fake a success
 * state, and not to invent an endpoint. Nothing is sent and nothing is kept:
 * the address never leaves this component's state.
 */
function SignupForm() {
  const [email, setEmail] = useState('');
  const [asked, setAsked] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAsked(true);
  }

  return (
    <>
      <form className="wl-form" onSubmit={onSubmit} noValidate>
        <div className="wl-field">
          <label htmlFor="wl-email">Email address</label>
          <input
            id="wl-email"
            className="wl-input"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setAsked(false);
            }}
          />
        </div>
        <button type="submit" className="btn btn-blue">
          Ask for early access
        </button>
      </form>

      <div className="wl-said" aria-live="polite">
        {asked ? (
          <>
            <p>
              <strong>Not open yet, and nothing was sent.</strong> There is no
              server behind this form and no list to add you to. Your address
              stayed in this page and goes nowhere when you close it.
            </p>
            <p>
              Putting it in a fake queue would have been the first dishonest
              thing on this page. When early access opens it will open here.
              {SUPPORT_EMAIL ? (
                <>
                  {' '}
                  If you want to say something in the meantime,{' '}
                  <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> is a
                  mailbox that is read.
                </>
              ) : null}
            </p>
          </>
        ) : (
          <p className="wl-note">
            This form has no backend yet. Submitting it tells you that, and
            nothing else happens.
          </p>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------- questions */

/**
 * One question in the run.
 *
 * A genuine sequence — this is the order the questions get asked in, standing
 * in a car park before it is light — so it is an ordered list with a run line
 * down the margin rather than six cards with numbers stuck on them. `care`
 * marks the last one, which is the hand-off to the section below it.
 */
function Q({
  n,
  title,
  care = false,
  children,
}: {
  n: number;
  title: string;
  care?: boolean;
  children: ReactNode;
}) {
  return (
    <li className={care ? 'wl-q wl-q--care' : 'wl-q'}>
      <span className="wl-qn" aria-hidden="true">
        {n}
      </span>
      <div className="wl-qbody">
        <h3>{title}</h3>
        {children}
      </div>
    </li>
  );
}

/* ---------------------------------------------------------------- screens */

const SCREENS = [
  {
    file: 'home.png',
    title: 'Home',
    alt: 'Shorebound home screen: a live conditions card naming its NOAA station above a suggested spot for the tide that is running',
    caption: 'Where to go now, on the tide that is running, and the researched note saying why.',
  },
  {
    file: 'location.png',
    title: 'A spot',
    alt: 'A Shorebound location page showing the tide playbook for low, incoming, high and outgoing water',
    caption: 'What it fishes on each of the four stages, what you are standing over, and the rig per species.',
  },
  {
    file: 'nearby.png',
    title: 'Near you',
    alt: 'Shorebound near-you list, ranking nearby spots by distance',
    caption: 'Ranked by distance. The arithmetic runs on the device; no request carries a coordinate.',
  },
  {
    file: 'care.png',
    title: 'Handle with care',
    alt: 'Shorebound Handle With Care screen listing the species that injure anglers and how to hold them',
    caption: 'The six that hurt people, how to hold them, and how to put them back. Free, permanently.',
  },
  {
    file: 'shops.png',
    title: 'Bait and tackle',
    alt: 'Shorebound bait and tackle directory showing shop hours and the source each listing was checked against',
    caption: 'Hours we could confirm first-hand, and the listings where we could not, said plainly.',
  },
];

/* -------------------------------------------------------------------- page */

/** Pull a researched line out of the shipped data, or nothing. Never invent. */
function noteContaining(loc: Location | undefined, needle: string): string | null {
  return loc?.access_notes.find((n) => n.includes(needle)) ?? null;
}

export default function Welcome() {
  const locations = getLocations();
  const fish = getFishList();
  const hazards = getHazards();
  const habitats = getHabitats();

  const onFoot = locations.filter((l) => l.access.some((a) => ON_FOOT.includes(a)));

  // The tackle exhibit: one target, quoted field for field off a spot page.
  const specSpot = locations.find((l) => l.slug === 'stump-pass') ?? locations[0];
  const spec = specSpot.targets.find((t) => t.priority === 1) ?? specSpot.targets[0];

  // The maintenance exhibits. Both are access notes on live spot pages, both
  // carry sources there, and both exist because somebody drove out and looked.
  const bridgeStreet = locations.find((l) => l.slug === 'bridge-street-pier');
  const fortDeSoto = locations.find((l) => l.slug === 'fort-de-soto-gulf-pier');
  const exhibits = [
    { loc: bridgeStreet, text: noteContaining(bridgeStreet, 'Annie') },
    { loc: fortDeSoto, text: noteContaining(fortDeSoto, 'Helene') },
  ].filter((e): e is { loc: Location; text: string } => Boolean(e.loc && e.text));

  return (
    <div className="wl">
      {/* ---------------------------------------------------------- hero */}
      <section className="wl-hero" aria-labelledby="wl-title">
        <p className="wl-eyebrow">Shore fishing · St. Petersburg → Boca Grande Pass</p>

        <h1 id="wl-title">
          You already know how to fish. You just don&rsquo;t know <em>this water</em>.
        </h1>

        <p className="wl-hero-sub">
          {locations.length} researched spots on Florida&rsquo;s Gulf coast, {onFoot.length}{' '}
          of them reachable on foot. The tide stage each one actually fishes,
          what you are standing over, and the rig for the fish that is there.
        </p>

        <div className="wl-cta">
          <Link to="/" className="btn btn-lime">
            Open the guide
          </Link>
          <Link to="/locations" className="btn btn-ghost">
            See all {locations.length} spots
          </Link>
        </div>

        <ul className="wl-facts">
          <li>
            <b>{locations.length}</b>&nbsp;spots
          </li>
          <li>
            <b>{onFoot.length}</b>&nbsp;on foot
          </li>
          <li>
            <b>{fish.length}</b>&nbsp;species pages
          </li>
          <li>
            <b>{hazards.length}</b>&nbsp;handle with care
          </li>
          <li>Works offline</li>
        </ul>

        <Tideline />
      </section>

      {/* ----------------------------------------------- the six questions */}
      <section className="wl-band" aria-labelledby="wl-questions">
        <p className="wl-eyebrow">The spine of it</p>
        <h2 className="wl-h2" id="wl-questions">
          Six questions, in the order you actually ask them
        </h2>
        <p className="wl-lede">
          Half five in the morning, in a car park, with the coffee going cold.
          This is the order they come in — and it is the order the guide is
          built in.
        </p>

        <ol className="wl-qs">
          <Q n={1} title="Where do I go?">
            <p>
              <strong>
                {locations.length} researched spots, St. Petersburg to Boca Grande Pass.
              </strong>{' '}
              {onFoot.length} reachable on foot — beach, pier, bridge, flat — so
              you do not need a boat to start.
            </p>
          </Q>

          <Q n={2} title="When?">
            <p>
              <strong>Tide stage is the answer</strong>, and it is the thing
              freshwater never taught you. Every spot says the stage it actually
              fishes, against a live NOAA prediction for its own station. A
              prediction, labelled as one, never a measurement.
            </p>
          </Q>

          <Q n={3} title="What am I standing over?">
            <p>
              Grass, oyster bar, mangrove point, bridge piling, a pass.{' '}
              <strong>{habitats.length} kinds of structure</strong> — what each
              one is, and why fish sit on it.
            </p>
          </Q>

          <Q n={4} title="What will I catch?">
            <p>
              The species that spot actually holds, not a regional list.{' '}
              <strong>{fish.length} with a full page</strong> — snook, redfish,
              trout, tarpon, sheepshead, mackerel and the rest.
            </p>
          </Q>

          <Q n={5} title="What do I throw at it?">
            <p>
              Rig, hook, leader, weight and bait — per species, per spot. Not
              &ldquo;use live bait&rdquo;.
            </p>
            <dl className="wl-spec">
              <div>
                <dt>Rig</dt>
                <dd>{spec.rig}</dd>
              </div>
              <div>
                <dt>Hook</dt>
                <dd>{spec.hook}</dd>
              </div>
              <div>
                <dt>Leader</dt>
                <dd>{spec.leader}</dd>
              </div>
              <div>
                <dt>Weight</dt>
                <dd>{spec.weight}</dd>
              </div>
              <div>
                <dt>Bait</dt>
                <dd>{spec.bait}</dd>
              </div>
            </dl>
            <p className="wl-note">
              {spec.species_label} at{' '}
              <Link to={`/locations/${specSpot.slug}`}>{specSpot.name}</Link>,
              copied off its page. Every spot carries this for every species it
              holds.
            </p>
          </Q>

          <Q n={6} title="What do I do when it is on the sand?" care>
            <p>
              And this is the one nobody prepares you for. It is the next
              section, because it is the only part of this that can put you in
              a clinic.
            </p>
          </Q>
        </ol>
      </section>

      {/* ------------------------------------------------------- the safety */}
      <section className="wl-band wl-care" aria-labelledby="wl-care-title">
        <p className="wl-eyebrow">Free forever · never behind a paywall</p>
        <h2 className="wl-h2" id="wl-care-title">
          {hazards.length} of these fish will hurt you
        </h2>
        <p className="wl-lede">
          A hardhead catfish has a serrated spine with venom on it, and people
          pick them up bare-handed every single day. A snook&rsquo;s gill plate
          is a razor and it will open your hand while you are being careful.
          Stingrays are under the sand you are standing on.
        </p>
        <p className="wl-p">
          None of that is scaremongering. It is Tuesday, and it is the single
          most useful thing a visiting angler can be told before it happens
          rather than after. So handling comes first here, not last: how to hold
          it, where not to put your fingers, and how to put it back alive.
        </p>

        <ul className="wl-hazards">
          {hazards.map((h) => (
            <li className="wl-haz" key={h.id}>
              <h3>{h.name}</h3>
              {h.risk_short && <span className="chip chip-warn">{h.risk_short}</span>}
              <p>{h.handle}</p>
            </li>
          ))}
        </ul>
        <p className="wl-note">
          Quoted from the guide, word for word. Read them all on the{' '}
          <Link to="/care">Handle With Care</Link> page.
        </p>

        <div className="wl-proof">
          <div>
            <h3>It is free because the build says so</h3>
            <p className="wl-p">
              Somebody grabs a hardhead or shuffles into a ray whether or not
              they paid, so the handling guidance is free for everyone,
              permanently. That is not a promise made on a landing page. It is a
              test in the repository, and it fails the build if anyone changes
              it.
            </p>
          </div>
          <pre className="wl-code">
            <code>
              <i>{'// src/test/entitlements.test.ts'}</i>
              {'\n'}
              {'it('}
              <b>{"'keeps Handle With Care free'"}</b>
              {', () => {\n'}
              {"  const care = CAPABILITIES.find((c) => c.id === "}
              <b>{"'care.full'"}</b>
              {');\n'}
              {'  expect(care?.free).toBe(true);\n'}
              {'});'}
            </code>
          </pre>
        </div>
      </section>

      {/* ------------------------------------------------------- screenshots */}
      <section className="wl-band" aria-labelledby="wl-screens">
        <p className="wl-eyebrow">On the phone</p>
        <h2 className="wl-h2" id="wl-screens">
          Five screens, no dashboard
        </h2>
        <p className="wl-lede">
          There is no bite score anywhere in here, and no dial that turns green.
          Every screen either shows you a researched line or admits it does not
          have one.
        </p>

        <div className="wl-shots">
          {SCREENS.map((s) => (
            <figure className="wl-shot" key={s.file}>
              <img
                src={`${import.meta.env.BASE_URL}screens/${s.file}`}
                alt={s.alt}
                loading="lazy"
                decoding="async"
              />
              <figcaption>
                <b>{s.title}</b>
                {s.caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------- why not another app */}
      <section className="wl-band wl-alt" aria-labelledby="wl-why">
        <p className="wl-eyebrow">The argument</p>
        <h2 className="wl-h2" id="wl-why">
          Why not just another fishing app
        </h2>

        <div className="wl-why">
          <div>
            <h3>Every competitor gives you a score. This one shows its work.</h3>
            <p className="wl-p">
              An app covering every water in the country has no room for what
              matters on one three-mile stretch: which bank goes slack first,
              which pass turns into a washing machine on the outgoing, which
              bridge fishes at night and which is a wasted evening. Local
              knowledge does not scale to fifty states, so it gets replaced by a
              model output.
            </p>
            <p className="wl-p">
              There is no catch prediction in here and there never will be.
              There is no catch data behind this app, which would make a
              likelihood number unfalsifiable — so instead you get which spot
              matches the water right now and exactly why: this tide stage, this
              hour, this month, and the researched note saying why it fishes
              then.
            </p>
            <p className="wl-p">
              Where nobody has researched a field, it is empty. Empty means
              &ldquo;not done yet&rdquo;, never &ldquo;nothing to say&rdquo;, and
              we would rather show you the gap than fill it with something
              plausible.
            </p>
          </div>

          <div>
            <h3>And the local part is a maintenance job, not a feature</h3>
            <p className="wl-p">
              In 2024, Helene and Milton took this coast apart. Piers lost
              walkways, a pass got a new cut through it, and businesses that no
              longer exist still have websites publishing opening hours. A
              national database does not know any of that, because nobody drove
              out to look.
            </p>
            <p className="wl-p">
              Two lines from spot pages in the guide, as they ship today:
            </p>
            <ul className="wl-exhibits">
              {exhibits.map((e) => (
                <li key={e.loc.slug}>
                  <figure className="wl-exhibit">
                    <blockquote>{e.text}</blockquote>
                    <figcaption>
                      Access note ·{' '}
                      <Link to={`/locations/${e.loc.slug}`}>{e.loc.name}</Link> ·{' '}
                      {e.loc.sources.length} sources on the page
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- sign-up */}
      <section className="wl-band" aria-labelledby="wl-early">
        <div className="wl-signup">
          <p className="wl-eyebrow">Early access</p>
          <h2 className="wl-h2" id="wl-early">
            There is nothing to join yet
          </h2>
          <p className="wl-lede">
            The guide is being finished in public. When there is a real list,
            this is where it will be — and until then this form does exactly
            what it looks like it does, which is nothing.
          </p>
          <SignupForm />
        </div>
      </section>

      {/* --------------------------------------------------------- download */}
      <section className="wl-band wl-alt" aria-labelledby="wl-download">
        <p className="wl-eyebrow">Download</p>
        <h2 className="wl-h2" id="wl-download">
          Not published yet
        </h2>
        <p className="wl-lede">
          Neither store listing exists. The two buttons below are placeholders
          and they go nowhere — they will stay placeholders until there is
          something real behind them.
        </p>
        <p className="wl-p">
          What does work today is the guide itself, in this browser. Load it
          once and the whole thing — every spot, species, rig and the handling
          guidance — is on your device and keeps working with no signal at all.
        </p>

        <ul className="wl-stores">
          <li>
            <a
              className="wl-store"
              href="#"
              aria-disabled="true"
              onClick={(e) => e.preventDefault()}
            >
              App Store
              <span className="tag">Placeholder</span>
            </a>
          </li>
          <li>
            <a
              className="wl-store"
              href="#"
              aria-disabled="true"
              onClick={(e) => e.preventDefault()}
            >
              Google Play
              <span className="tag">Placeholder</span>
            </a>
          </li>
        </ul>

        <div className="wl-cta">
          <Link to="/" className="btn btn-blue">
            Open the guide
          </Link>
          <Link to="/care" className="btn btn-ghost">
            Read Handle With Care first
          </Link>
        </div>

        <p className="wl-note">
          Found something wrong, closed or demolished? That is the most useful
          thing you can send us —{' '}
          <a href={ISSUES_URL} target="_blank" rel="noreferrer">
            open an issue ↗
          </a>
          {SUPPORT_EMAIL ? (
            <>
              {' '}
              or email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </>
          ) : null}
          .
        </p>
      </section>
    </div>
  );
}
