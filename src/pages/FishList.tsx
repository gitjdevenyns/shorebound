import { Link } from 'react-router-dom';
import { getFishList, getLocations } from '../lib/api';
import { sourceById } from '../data';
import { Callout, Plate, SectionTitle } from '../components/ui';
import {
  habitatChips,
  habitatModuleFor,
  parseGear,
  speciesContent,
} from '../components/species/speciesContent';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Species index. Not a bare list: each row is a decision aid — what it looks
 * like, where it lives, what you need on the rod, and how many guide locations
 * name it as a target — so the angler can pick a species before opening a page.
 */
export default function FishList() {
  const fish = getFishList();
  const locations = getLocations();
  const fwc = sourceById('fwc-saltwater');

  const spotCount = (id: string) =>
    locations.filter((l) => l.targets.some((t) => t.species_id === id)).length;

  return (
    <>
      <div className="sect">
        <div className="lab lab-blue">Most-targeted species</div>
        <h1 style={{ margin: '4px 0 8px' }}>Know it, rig for it, put it back</h1>
        <p className="mut">
          The species inshore anglers on this coast actually fish for — the ones everybody comes
          for and the ones you will most likely catch first. It is not the whole list. This water
          holds far more than this, and you will hook things that are on no page here. Every page
          opens on identification, then habitat, then the tackle, then how to release it in shape to
          swim away.
        </p>
      </div>

      {/* Same entry point as Home's "Not sure what you caught?" card, offered
          here too since this is the other natural place someone lands while
          trying to work out what they're holding. */}
      <section className="sect" aria-labelledby="photoid">
        <h2 className="vh" id="photoid">
          Not sure what you caught?
        </h2>
        <div className="card card-pad">
          <p className="mut" style={{ color: 'var(--t)' }}>
            Not sure which of these you caught? Take a photo and get a best guess at the species,
            plus a warning if it is one to keep your hands off. It is an estimate from a machine,
            not an identification — a starting point for you to confirm.
          </p>
          <Link className="btn btn-lime btn-block" to="/id" style={{ marginTop: 'var(--s3)' }}>
            Identify a fish from a photo
          </Link>
        </div>
      </section>

      <section className="sect" aria-labelledby="species-h">
        <SectionTitle id="species-h">Most commonly caught</SectionTitle>
        {/* stack+g4 gives the mobile rhythm; .cols-2 takes over as a grid at 900px. */}
        <div className="stack g4 cols-2">
          {fish.map((f) => {
            const gear = parseGear(f.gear);
            const chips = habitatChips(f.habitat);
            const spots = spotCount(f.id);
            const content = speciesContent(f.id);

            return (
              <article className="card speciescard" key={f.id}>
                <Link to={`/fish/${f.id}`} className="speciescard-link">
                  <Plate media={f.images[0] ?? null} className="plate-tall" />
                  <div className="card-pad">
                    <h3>{f.name}</h3>
                    {content && (
                      <p className="mut xs" style={{ marginTop: 4 }}>
                        {content.idLede}
                      </p>
                    )}
                  </div>
                </Link>

                <div className="card-pad" style={{ paddingTop: 0 }}>
                  <div className="row wrap g2" style={{ marginBottom: 'var(--s3)' }}>
                    {chips.map((c) => (
                      <span
                        key={c}
                        className={habitatModuleFor(c) ? 'chip chip-ghost-blue' : 'chip'}
                      >
                        {cap(c)}
                      </span>
                    ))}
                  </div>

                  <dl className="spec">
                    <dt>Gear</dt>
                    <dd>{gear.raw ?? `${gear.rod} · ${gear.reel} · ${gear.line}`}</dd>
                    <dt>Leader</dt>
                    <dd>{f.leader}</dd>
                    <dt>Hook</dt>
                    <dd>{f.hook}</dd>
                  </dl>

                  <p className="mut xs" style={{ marginTop: 'var(--s3)' }}>
                    {spots > 0
                      ? `Named as a target at ${spots} guide ${spots === 1 ? 'location' : 'locations'}.`
                      : 'No guide location names this species as a target yet.'}
                  </p>

                  <p style={{ marginTop: 'var(--s3)' }}>
                    <Link className="btn btn-blue btn-block" to={`/fish/${f.id}`}>
                      Open {f.name}
                    </Link>
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="sect" aria-labelledby="next-h" style={{ paddingBottom: 'var(--s7)' }}>
        <SectionTitle id="next-h">Before you go</SectionTitle>
        <Callout tone="info" title="Tactics, not regulation">
          Everything in this section is a starting point for how to catch a fish, not a statement of
          what you may keep. Seasons, size and bag limits and permits are set by{' '}
          {fwc ? (
            <a href={fwc.url} target="_blank" rel="noreferrer">
              FWC<span aria-hidden="true"> ↗</span>
              <span className="vh">(opens in a new tab)</span>
            </a>
          ) : (
            'FWC'
          )}{' '}
          and change — check there before you keep anything.
        </Callout>
        <div className="row wrap g2 mt3">
          <Link className="btn btn-ghost" to="/id">
            Identify one from a photo
          </Link>
          <Link className="btn btn-ghost" to="/water">
            Read the water
          </Link>
          <Link className="btn btn-ghost" to="/rigs">
            Rigs + knots
          </Link>
          <Link className="btn btn-ghost" to="/care">
            Handle With Care
          </Link>
        </div>
      </section>
    </>
  );
}
