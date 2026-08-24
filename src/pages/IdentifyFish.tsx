import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Callout,
  EmptyState,
  ErrorState,
  Plate,
  SectionTitle,
  Skeleton,
} from '../components/ui';
import { LinkRow } from '../components/ui/LinkRow';
import { FishFramingGuide } from '../components/species/art';
import { useOnline } from '../lib/network';
import { ImageError, prepareImage } from '../lib/image';
import type { PreparedImage } from '../lib/image';
import {
  CONFIDENCE_LABEL,
  identifyFish,
  isIdentifyConfigured,
  resolveGuideMatch,
} from '../lib/identify';
import type { IdentifyOutcome } from '../lib/identify';

/**
 * Photo ID.
 *
 * The one screen in this guide that asks a machine a question, and therefore
 * the one that has to be loudest about what it is worth. The house rule (README
 * "Content rules") is that official regulation, general tactics and local
 * heuristics stay visually distinct; a vision model's species call is weaker
 * than all three, so it is framed as an estimate everywhere it appears — in the
 * standing callout above the control, in the chip on the result, and in the
 * line under it. There is no phrasing on this page that reads as a verdict.
 *
 * That framing is a safety requirement, not modesty. Two of the six
 * handle-with-care species look, to a casual eye, a lot like fish people grab
 * without thinking. So the result is deliberately allowed to say "I can't tell",
 * an unidentified animal is always flagged as potentially hazardous, and the
 * handling instructions still come from the guide's own researched pages rather
 * than from the model.
 *
 * Every network state is enumerated: unavailable (no Supabase in this build),
 * offline, working, identified, not identified, and six named failures. No
 * blank screens, no spinner that runs forever, no unhandled rejection.
 */

type Phase = 'idle' | 'preparing' | 'sending' | 'done';

const KB = (bytes: number) => `${Math.round(bytes / 1024)} kB`;

export default function IdentifyFish() {
  const configured = isIdentifyConfigured();
  const online = useOnline();

  const [phase, setPhase] = useState<Phase>('idle');
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [outcome, setOutcome] = useState<IdentifyOutcome | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  // Object URLs are a resource, not a string: without this the preview blobs
  // leak for the lifetime of the tab as the user tries photo after photo.
  const lastUrl = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    },
    [],
  );

  const send = useCallback(async (prepared: PreparedImage) => {
    setPhase('sending');
    const result = await identifyFish({
      base64: prepared.base64,
      mediaType: prepared.mediaType,
    });
    setOutcome(result);
    setPhase('done');
  }, []);

  const onPick = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Resetting the input means picking the *same* photo twice still fires a
      // change event, which is exactly what someone retrying would expect.
      event.target.value = '';
      if (!file) return;

      setOutcome(null);
      setPhase('preparing');

      let prepared: PreparedImage;
      try {
        prepared = await prepareImage(file);
      } catch (e) {
        const message =
          e instanceof ImageError
            ? e.message
            : 'That photo could not be opened on this device.';
        setImage(null);
        setOutcome({ ok: false, kind: 'bad-image', message });
        setPhase('done');
        return;
      }

      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
      lastUrl.current = prepared.previewUrl;
      setImage(prepared);
      await send(prepared);
    },
    [send],
  );

  const retry = useCallback(() => {
    if (image) void send(image);
  }, [image, send]);

  const busy = phase === 'preparing' || phase === 'sending';

  return (
    <>
      <div className="sect">
        <div className="lab lab-blue">Photo ID</div>
        <h1 style={{ margin: '4px 0 8px' }}>What did I just catch?</h1>
        <p className="mut">
          Photograph the fish and get a best guess at what it is, which of this guide&rsquo;s
          species it matches, and whether it is one to keep your hands away from. It knows the five
          target species, the six worth not grabbing, and the five more this guide names at its
          locations without documenting — sheepshead, pompano, jack, Spanish mackerel and kingfish.
        </p>
      </div>

      {/* The standing honesty rule. Above the control, not below the result —
          the reader should meet it before they use the thing, not after. */}
      <div className="sect" style={{ paddingTop: 0 }}>
        <Callout tone="warn" title="An estimate, not an identification">
          This is an AI reading a photograph. It is a starting point for you to confirm, not an
          authority — it can be wrong, and it is most likely to be wrong on exactly the blurry,
          half-in-the-net photo you are about to take. Check the marks yourself against{' '}
          <Link to="/fish">the species pages</Link> and{' '}
          <Link to="/care">Handle With Care</Link> before you touch, keep or release anything.
        </Callout>
      </div>

      {/* ------------------------------------------------------------ capture */}
      <section className="sect" aria-labelledby="shoot-h" style={{ paddingTop: 0 }}>
        <SectionTitle id="shoot-h">Take a photo</SectionTitle>

        {!configured ? (
          <EmptyState title="Photo ID is unavailable right now">
            <p>
              This copy of the guide has no identification service configured, so there is nothing
              to send a photo to. Everything else works, offline included.
            </p>
            <p className="mut xs">
              Identify it the reliable way instead: the marks that separate these species are on{' '}
              <Link to="/fish">the five species pages</Link>, and the ones worth not grabbing are on{' '}
              <Link to="/care">Handle With Care</Link>.
            </p>
          </EmptyState>
        ) : (
          <div className="card card-pad">
            {/* Hidden inputs, visible buttons: `capture` asks a phone to open
                the camera directly, and the plain one opens the library. Both
                are file inputs — no getUserMedia, no permissions dance, and it
                degrades to a normal file picker on a desktop browser. */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="vh"
              tabIndex={-1}
              aria-hidden="true"
              onChange={onPick}
            />
            <input
              ref={libraryRef}
              type="file"
              accept="image/*"
              className="vh"
              tabIndex={-1}
              aria-hidden="true"
              onChange={onPick}
            />

            {/* Shown until there is a real photo to show instead. The camera
                itself belongs to the OS once `capture` fires, so this is the
                only moment the app gets to say what a useful frame looks
                like — and composition is what most failed identifications
                actually come down to. */}
            {!image && (
              <div className="plate plate-tall plate--guide" style={{ marginBottom: 'var(--s4)' }}>
                <FishFramingGuide />
                <span className="plate-cap">line the fish up like this</span>
              </div>
            )}

            <p className="mut xs" style={{ marginTop: 0, marginBottom: 'var(--s3)' }}>
              Whole fish, side-on, filling the frame, in as much light as you can get. The marks
              that separate these species — a tail spot, a lateral line, a jaw line — all sit on the
              flank, and a three-quarter or cropped shot hides them.
            </p>

            <div className="row wrap g2">
              <button
                type="button"
                className="btn btn-lime"
                disabled={busy}
                onClick={() => cameraRef.current?.click()}
              >
                Take a photo
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => libraryRef.current?.click()}
              >
                Choose a photo
              </button>
            </div>

            <p className="mut xs mt3">
              The photo is shrunk on this device before it is sent, and it is not stored anywhere
              afterwards — not by this app and not with the result.
            </p>
            {!online && (
              <p className="mut xs" style={{ marginTop: 4 }}>
                You are offline right now, so this will not reach the service until you have signal.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- result */}
      {(image || outcome || busy) && (
        <section className="sect" aria-labelledby="result-h" style={{ paddingTop: 0 }}>
          <SectionTitle id="result-h">What it looks like</SectionTitle>

          {image && (
            <div style={{ marginBottom: 'var(--s4)' }}>
              <Plate
                key={image.previewUrl}
                media={{ url: image.previewUrl, alt: 'The photo you are identifying' }}
                caption={`your photo · ${image.width}×${image.height} · ${KB(image.bytes)}`}
                className="plate-tall"
              />
            </div>
          )}

          <div aria-live="polite">
            {busy && (
              <div className="card card-pad" aria-busy="true">
                <div className="stack g2">
                  <Skeleton width={8} />
                  <Skeleton width={12} />
                  <Skeleton block />
                </div>
                <p className="mut xs mt3">
                  {phase === 'preparing' ? 'Shrinking the photo…' : 'Reading the photo…'}
                </p>
              </div>
            )}

            {phase === 'done' && outcome && <Outcome outcome={outcome} onRetry={retry} />}
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------- close */}
      <section className="sect" aria-labelledby="next-h" style={{ paddingBottom: 'var(--s7)' }}>
        <SectionTitle id="next-h">Whatever it turned out to be</SectionTitle>
        <Callout tone="info" title="Tactics, not regulation">
          Nothing on this page tells you what you may keep. Size limits, closed seasons and licence
          rules are set by{' '}
          <a href="https://myfwc.com/fishing/saltwater/" target="_blank" rel="noreferrer">
            FWC<span aria-hidden="true"> ↗</span>
            <span className="vh">(opens in a new tab)</span>
          </a>{' '}
          and change — and a keep decision made off a machine&rsquo;s guess at the species is a bad
          idea twice over.
        </Callout>
        <div className="row wrap g2 mt3">
          <Link className="btn btn-ghost" to="/fish">
            The five species
          </Link>
          <Link className="btn btn-ghost" to="/care">
            Handle With Care
          </Link>
        </div>
      </section>
    </>
  );
}

/* -------------------------------------------------------------- result panel */

function Outcome({ outcome, onRetry }: { outcome: IdentifyOutcome; onRetry: () => void }) {
  if (!outcome.ok) return <Failure outcome={outcome} onRetry={onRetry} />;

  const { result } = outcome;
  const match = resolveGuideMatch(result.guide_species_id);

  if (!result.identified) {
    return (
      <>
        <EmptyState title="Couldn’t confidently identify this">
          <p>
            {result.field_marks ||
              'There was not enough of the fish visible to call it. A side-on photo of the whole fish, in daylight, gives the best chance.'}
          </p>
          {result.also_consider.length > 0 && (
            <p className="mut">
              Closest guesses, none of them confident: {result.also_consider.join(', ')}.
            </p>
          )}
        </EmptyState>
        <Callout tone="danger" title="Treat it as if it bites" className="mt3">
          An unidentified fish gets handled like a dangerous one: wet hands, pliers, nothing near
          the mouth, gills or spines. The six species most worth that caution are on{' '}
          <Link to="/care">Handle With Care</Link>.
        </Callout>
      </>
    );
  }

  return (
    <>
      <article className="card">
        <div className="card-pad">
          <div className="row wrap g2" style={{ marginBottom: 'var(--s2)' }}>
            <span
              className={`chip ${result.confidence === 'high' ? 'chip-lime' : result.confidence === 'moderate' ? 'chip-ghost-blue' : 'chip-warn'}`}
            >
              {CONFIDENCE_LABEL[result.confidence]}
            </span>
            <span className="chip">Best guess</span>
            {match && (
              <span className="chip chip-ghost-blue">
                {match.kind === 'named' ? 'Named in this guide' : 'In this guide'}
              </span>
            )}
          </div>

          <h3>{result.common_name}</h3>
          {result.scientific_name && (
            <p className="mono mut xs" style={{ marginTop: 2 }}>
              {result.scientific_name}
            </p>
          )}
          {result.field_marks && (
            <p style={{ marginTop: 'var(--s3)', fontSize: 'var(--fs-sm)', lineHeight: 1.5 }}>
              {result.field_marks}
            </p>
          )}
        </div>

        {result.is_potentially_hazardous && (
          <div className="card-pad" style={{ paddingTop: 0 }}>
            <Callout tone="danger" title="Handle with care">
              {result.hazard_note ||
                'This one can hurt you if it is handled carelessly. Use pliers and keep your hands away from the mouth, gills and spines.'}
            </Callout>
          </div>
        )}

        {result.also_consider.length > 0 && (
          <div className="card-pad" style={{ paddingTop: 0 }}>
            <p className="mut xs">
              Could also be: {result.also_consider.join(', ')}. Check the marks before you decide.
            </p>
          </div>
        )}

        {/* A `named` species has no page of its own — say so, rather than
            dressing a location link up as one. The location it points at does
            carry a researched rig and bait for this species, which is the
            closest thing the guide has. */}
        {match?.kind === 'named' && (
          <div className="card-pad" style={{ paddingTop: 0 }}>
            <p className="mut xs">
              This guide has no species page for {match.name.toLowerCase()} yet. It is named as a
              target at {match.spotCount} {match.spotCount === 1 ? 'spot' : 'spots'}, each with its
              own rig and bait for it.
            </p>
          </div>
        )}

        {match && (
          <LinkRow
            to={match.to}
            glyph={match.kind === 'hazard' ? '⚠' : '›'}
            title={
              match.kind === 'hazard'
                ? `${match.name} — how to handle it`
                : match.kind === 'named'
                  ? `A spot that fishes for ${match.name.toLowerCase()}`
                  : `${match.name} — identification, tackle and release`
            }
            note={
              match.kind === 'named'
                ? 'Its rig, hook, leader and bait at that location'
                : "The guide's own researched page for this species"
            }
          />
        )}

        <div className="card-pad" style={{ paddingTop: 'var(--s3)' }}>
          <p className="mut xs">
            A machine&rsquo;s reading of one photograph. Confirm it against the marks yourself
            before you act on it.
          </p>
        </div>
      </article>
    </>
  );
}

function Failure({
  outcome,
  onRetry,
}: {
  outcome: Extract<IdentifyOutcome, { ok: false }>;
  onRetry: () => void;
}) {
  const TITLES: Record<typeof outcome.kind, string> = {
    unavailable: 'Photo ID is unavailable right now',
    offline: 'No connection',
    'rate-limited': 'That is enough for now',
    'too-large': 'That photo was too large',
    'bad-image': 'Could not read that photo',
    declined: 'No answer for this photo',
    timeout: 'That took too long',
    server: 'The identification service did not answer',
  };

  // A rate limit or a bad file will not fix itself on a second identical
  // attempt, so those states get an explanation instead of a retry button.
  const retryable =
    outcome.kind === 'server' || outcome.kind === 'timeout' || outcome.kind === 'offline';

  return (
    <ErrorState title={TITLES[outcome.kind]} onRetry={retryable ? onRetry : undefined}>
      <p>{outcome.message}</p>
      {outcome.kind === 'rate-limited' && (
        <p className="mut xs">
          Each identification is a real, paid call to an AI service on the site owner&rsquo;s
          account, so it is capped. The guide itself has no limits — the marks that separate these
          species are on <Link to="/fish">the species pages</Link>.
        </p>
      )}
      {(outcome.kind === 'bad-image' || outcome.kind === 'too-large') && (
        <p className="mut xs">
          A normal JPEG or PNG taken by the camera app works best. Screenshots of screenshots, live
          photos and HEIC files from some phones can arrive in a form the browser cannot open.
        </p>
      )}
    </ErrorState>
  );
}
