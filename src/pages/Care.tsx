import { Link } from 'react-router-dom';
import { getHazards } from '../lib/api';
import { sourceById } from '../data';
import { Callout, SectionTitle } from '../components/ui';
import { ExternalRow } from '../components/ui/LinkRow';
import HazardCard from '../components/care/HazardCard';
import { SAFE_HANDLING_RULES } from '../components/care/hazardContent';

/**
 * Handle With Care — ported from design board 05.
 *
 * Safety without sensationalism (PRODUCT_SPEC §5): identification and safe
 * handling are the content; fear is not. The documented injury cases in the
 * data are real clinical/published material, so they sit behind an explicit
 * disclosure with a content warning and are surfaced as attributed links, never
 * as inline images — a wound photograph teaches neither identification nor
 * handling.
 */
export default function Care() {
  const hazards = getHazards();
  const cases = hazards.flatMap((h) =>
    h.injury_media.map((m) => ({ hazard: h.name, media: m })),
  );

  const fwc = sourceById('fwc-saltwater');
  const museum = sourceById('florida-museum');

  return (
    <>
      <div className="lochero" style={{ minHeight: 190 }}>
        <div className="inner">
          <div className="row g2 wrap" style={{ marginBottom: 8 }}>
            <span className="chip chip-lime">Know it, then don&rsquo;t grab it</span>
            <span className="chip chip-on-dark">{hazards.length} species</span>
          </div>
          <h1 className="d2">Handle with care</h1>
        </div>
      </div>

      <div className="sect">
        <p className="lede">
          Nothing on this page is hunting you. Every animal here hurts anglers for exactly one
          reason — a hand went somewhere it did not need to go. Learn the {hazards.length} faces,
          keep your fingers out of the sharp end, and this is a non-event.
        </p>
      </div>

      {/* ------------------------------------------------------------ habits */}
      {/* Licences sit on this page rather than a settings screen because the
          reader this guide is for is usually from out of state, and the free
          shoreline licence Floridians rely on does not cover him. Finding that
          out from an officer is the wrong way to find it out.

          Everything quoted here is FWC's own wording, sourced in
          docs/research. Fees and rules change, so every figure is dated and
          every path ends at FWC rather than at us. */}
      <section className="sect" aria-labelledby="licence-h">
        <SectionTitle id="licence-h">Get a licence first</SectionTitle>

        <Callout tone="warn" title="Visiting from out of state?">
          Florida residents can fish from shore on a free licence. <strong>Non-residents
          cannot.</strong> FWC is explicit: non-residents “must purchase a 3-day, 7-day or
          annual non-resident saltwater fishing license when saltwater fishing in Florida,
          unless covered by a charter or pier license.”
        </Callout>

        <div className="card card-pad mt3">
          <p style={{ marginTop: 0 }}>
            You need a <strong>saltwater fishing licence</strong> for almost everything in
            this guide, including standing on a beach. Two extra permits catch people out,
            and both apply <em>on top of</em> the licence:
          </p>
          <ul className="bullets">
            <li>
              <strong>Snook permit</strong> — required “including shoreline fishing, when
              taking or attempting to take snook.” Snook is the headline fish here, so this
              is the one most people need and fewest people have.
            </li>
            <li>
              <strong>Shore-based shark permit</strong> — free, but required for anglers 16
              and older when fishing for sharks from shore, jetties, bridges or piers. FWC
              notes there are “no permit exemptions, even if exempt from fishing license
              requirements.”
            </li>
          </ul>
          <p className="mut xs">
            Some piers hold a licence covering everyone fishing from them. Do not assume it —
            FWC’s own records list both Green Bridge and the Palma Sola Causeway as
            <strong> not</strong> providing one.
          </p>
        </div>

        <div className="card card-pad mt3">
          <span className="lab">Where to get one</span>
          <p style={{ marginTop: 6 }}>
            <a href="https://gooutdoorsflorida.com/" target="_blank" rel="noreferrer">
              GoOutdoorsFlorida.com<span aria-hidden="true"> ↗</span>
            </a>{' '}
            sells every licence and permit online in a few minutes.
          </p>
          <p>
            Easier on the water: FWC’s own{' '}
            <a
              href="https://myfwc.com/license/recreational/fish-hunt-fl-app/"
              target="_blank" rel="noreferrer"
            >
              Fish&nbsp;|&nbsp;Hunt FL app<span aria-hidden="true"> ↗</span>
            </a>{' '}
            buys licences, carries them on your phone as proof, and holds your permits in one
            place. Worth installing before you drive down.
          </p>
          <p className="mut xs">
            Fees and rules change. Current prices and the full exemption list are on{' '}
            <a
              href="https://myfwc.com/license/recreational/saltwater-fishing/"
              target="_blank" rel="noreferrer"
            >
              FWC’s saltwater licence page<span aria-hidden="true"> ↗</span>
            </a>{' '}
            — checked August 2026. We do not restate prices here, because a stale figure is
            worse than none.
          </p>
        </div>
      </section>

      <section className="sect" aria-labelledby="habits-h">
        <SectionTitle id="habits-h">Three habits cover almost all of it</SectionTitle>
        <div className="rule3">
          {SAFE_HANDLING_RULES.map((r) => (
            <div key={r.n}>
              <span className="n" aria-hidden="true">
                {r.n}
              </span>
              <span>
                <b>{r.title}</b> {r.body}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- species */}
      <section className="sect" aria-labelledby="species-h">
        <SectionTitle id="species-h">Know them on sight</SectionTitle>
        <p className="mut" style={{ marginBottom: 'var(--s3)' }}>
          Each card runs identification, then the risk, then how to handle it. The chip says how the
          animal hurts you — in words, not only in colour.
        </p>
        <div className="row wrap g2" style={{ marginBottom: 'var(--s4)' }}>
          <span className="hazkind spine">Spines</span>
          <span className="hazkind bite">Teeth</span>
          <span className="hazkind toxin">Toxin if eaten</span>
        </div>

        <div className="stack g4 cols-2 hazgrid">
          {hazards.map((h) => (
            <HazardCard key={h.id} hazard={h} />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ wading */}
      <section className="sect" aria-labelledby="wading-h">
        <SectionTitle id="wading-h">Wading</SectionTitle>
        <Callout tone="warn" title="Shuffle, don't step">
          Rays sit buried on the sand in potholes and along the edges of a flat. Slide your feet
          along the bottom so the ray feels you coming and leaves. A shuffled foot moves a ray; a
          planted foot gets stung.
        </Callout>
        <Callout tone="warn" title="Shell cuts before anything bites" className="mt3">
          The most common injury on a Gulf flat is not on this page at all — it is a bare foot on
          live oyster. Hard-soled wading boots, every time.
        </Callout>
      </section>

      {/* ------------------------------------------------------------ injury */}
      <section className="sect" aria-labelledby="injury-h">
        <SectionTitle id="injury-h">If something does get you</SectionTitle>
        <div className="card card-pad">
          <p style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.5, marginBottom: 'var(--s3)' }}>
            Marine punctures get infected easily, and a spine can leave material in the wound. This
            is a medical matter, not a fishing one — clean it, then get it looked at properly.
            Don&rsquo;t tough it out and don&rsquo;t fish on.
          </p>
          <Callout tone="danger" title="Go straight to emergency care">
            For any sting or puncture to the torso, bleeding you cannot control, trouble breathing, a
            spreading reaction, or any sting in a child.
          </Callout>
        </div>
        <p className="mut xs mt3">
          This guide is not a clinician and gives no treatment protocol. For treatment, see one.
        </p>
      </section>

      {/* --------------------------------------------------- documented cases */}
      {cases.length > 0 && (
        <section className="sect" aria-labelledby="cases-h">
          <SectionTitle id="cases-h">Documented cases</SectionTitle>
          <details className="disclose">
            <summary>
              <span>Published injury case reports ({cases.length})</span>
              <span className="mut xs">
                Contains clinical photographs of wounds on the linked pages
              </span>
            </summary>
            <div className="disclose-b">
              <p className="mut xs" style={{ marginBottom: 'var(--s3)' }}>
                These are links to the original published sources, not images shown here. Open them
                only if you want the clinical detail — the identification and handling guidance above
                is what keeps you out of them.
              </p>
              <div className="card">
                {cases.map((c) => (
                  <ExternalRow
                    key={c.media.source_url ?? c.media.url}
                    href={c.media.source_url ?? c.media.url}
                    title={`${c.hazard} — documented case`}
                    note={c.media.alt}
                  />
                ))}
              </div>
            </div>
          </details>
        </section>
      )}

      {/* ---------------------------------------------------------- closing  */}
      <section className="sect" aria-labelledby="last-h">
        <SectionTitle id="last-h">One last thing</SectionTitle>
        <Callout title="None of these animals is the problem">
          Catfish and rays are the working machinery of a Gulf flat. Barracuda and sharks are the
          reason there is anything worth catching on it.{' '}
          {hazards.some((h) => h.id === 'lionfish') && (
            <>
              The only one we ask you to remove is the lionfish, and only because it does not belong
              here.{' '}
            </>
          )}
          Everything else goes back in the water.
        </Callout>
        <p className="mt3">
          <Link className="btn btn-ghost" to="/fish">
            Release guidance for the target species
          </Link>
        </p>
      </section>

      {/* ----------------------------------------------------------- sources */}
      <section className="sect" aria-labelledby="src-h" style={{ paddingBottom: 'var(--s7)' }}>
        <SectionTitle id="src-h">Sources</SectionTitle>
        <p className="srcs">
          Species rules, prohibited sharks and lionfish guidance:{' '}
          {fwc ? (
            <a href={fwc.url} target="_blank" rel="noreferrer">
              {fwc.label}
              <span aria-hidden="true"> ↗</span>
            </a>
          ) : (
            'FWC'
          )}
          . Identification:{' '}
          {museum ? (
            <a href={museum.url} target="_blank" rel="noreferrer">
              {museum.label}
              <span aria-hidden="true"> ↗</span>
            </a>
          ) : (
            'Florida Museum'
          )}
          , plus the per-photograph credits on each card. Nothing here is medical advice — for
          treatment, see a clinician. External links open in a new tab.
        </p>
      </section>
    </>
  );
}
