import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { getFishList, getLocations } from '../lib/api';
import { useGeolocation, milesBetween } from '../lib/geo';
import { rankNearby } from '../lib/nearby';
import { useShopListings } from '../lib/useShopListings';
import ShopCard from '../components/ShopCard';
import { Callout, SectionTitle } from '../components/ui';

/**
 * Getting started — the one path through the guide for somebody who has
 * fished for twenty years and never fished salt.
 *
 * It answers the questions in the order they actually get asked, standing in
 * a car park: am I allowed to fish here, what do I buy, what do I ask the
 * shop for, where do I get it, and where do I go. Everything on it is drawn
 * from the guide's own researched data rather than written fresh — the rod
 * and leader specs are the species pages' own `gear` and `leader` strings,
 * and the bait list is a tally of what the 25 spots actually name.
 *
 * The location half is deliberately below the fold and optional. Somebody
 * planning at their kitchen table three states away still gets the whole
 * checklist; somebody already on the coast gets the shop and the spot too.
 */

/** The setup that covers most of this coast, taken from the species data. */
const STARTER = [
  ['Rod', "7 to 7'6\", medium or medium-heavy", 'Covers snook, redfish, trout and snapper. Only tarpon asks for heavier.'],
  ['Reel', '3000–4000 size', 'Same range across most of the guide. Go 4000–5000 if snook is the target.'],
  ['Line', '15–20 lb braid', '20–30 lb if you are fishing pilings or bridges.'],
  ['Leader', '20–30 lb fluorocarbon', "Not optional here. 30–40 for snook, and a 30–60 lb bite leader for anything with teeth."],
] as const;

export default function Start() {
  const locations = getLocations();
  const fish = getFishList();
  const geo = useGeolocation();
  const { shops } = useShopListings();

  const nearby = useMemo(
    () => (geo.coords ? rankNearby(locations, geo.coords, { stage: null, limit: 3 }) : []),
    [geo.coords, locations],
  );
  const nearShops = useMemo(() => {
    if (!geo.coords) return [];
    return shops
      .map((entry) => ({ entry, miles: milesBetween(geo.coords!, entry.shop) }))
      .sort((a, b) => a.miles - b.miles)
      .slice(0, 2);
  }, [shops, geo.coords]);

  return (
    <div className="sect">
      <h1 className="d2">Start here</h1>
      <p className="lede mut">
        You already know how to fish. This is the part that is different in salt water —
        what you are allowed to do, what to buy, and where to go first.
      </p>

      {/* 1 ---------------------------------------------------------------- */}
      <SectionTitle id="s-licence">1 · Get a licence</SectionTitle>
      <Callout tone="warn" title="Coming from out of state?">
        Florida residents fish from shore on a free licence. <strong>Non-residents do
        not</strong> — you need a 3-day, 7-day or annual saltwater licence before you cast.
      </Callout>
      <div className="card card-pad mt3">
        <p style={{ marginTop: 0 }}>
          Buy it in about five minutes on{' '}
          <a href="https://gooutdoorsflorida.com/" target="_blank" rel="noreferrer">
            GoOutdoorsFlorida<span aria-hidden="true"> ↗</span>
          </a>, or on FWC&rsquo;s own{' '}
          <a href="https://myfwc.com/license/recreational/fish-hunt-fl-app/" target="_blank" rel="noreferrer">
            Fish&nbsp;|&nbsp;Hunt FL app<span aria-hidden="true"> ↗</span>
          </a>, which also carries it on your phone as proof.
        </p>
        <p className="mut">
          Add the <strong>$10 snook permit</strong> if you might catch one — and on this
          coast you might. Add the <strong>free shore-based shark permit</strong> if you are
          fishing a pier or a pass at night.
        </p>
        <Link className="xs" to="/care">Full licence and permit detail →</Link>
      </div>

      {/* 2 ---------------------------------------------------------------- */}
      <SectionTitle id="s-gear">2 · One setup covers most of it</SectionTitle>
      <p className="mut">
        You probably own something close already. These are the specs the {fish.length}{' '}
        species pages actually call for, not a shopping list.
      </p>
      <div className="startgrid">
        {STARTER.map(([label, spec, note]) => (
          <div key={label} className="startrow">
            <span className="lab">{label}</span>
            <b>{spec}</b>
            <span className="mut xs">{note}</span>
          </div>
        ))}
      </div>
      <p className="mut xs">
        The one thing freshwater tackle usually lacks is <strong>fluorocarbon leader</strong>.
        Salt water is clearer, the fish are warier, and several of these have teeth or gill
        plates that will cut straight through braid.
      </p>

      {/* 3 ---------------------------------------------------------------- */}
      <SectionTitle id="s-tackle">3 · What to ask for at the counter</SectionTitle>
      <div className="card card-pad">
        <p style={{ marginTop: 0 }}>
          <span className="lab">Hooks</span> 1/0–2/0 circle hooks for bait, 3/0–4/0 if you
          are chasing snook. A few 1/0 short shanks for sheepshead.
        </p>
        <p>
          <span className="lab">Weights</span> Split shot and ¼–½&nbsp;oz sliders. Passes and
          bridges run hard and you will want more than you think.
        </p>
        <p>
          <span className="lab">Lures</span> Paddletails, a white jig head, and one silver
          spoon. Between them they cover most of what this guide names.
        </p>
        <p className="mut">
          <span className="lab">Bait</span> Ask for <strong>live shrimp</strong> first — it is
          named at more spots in this guide than anything else. <strong>Pilchards</strong> if
          you are after snook. Fiddler crabs for sheepshead, sand fleas off the beach.
        </p>
      </div>

      {/* 4 ---------------------------------------------------------------- */}
      <SectionTitle id="s-where">4 · Where to get it, and where to go</SectionTitle>

      {geo.status === 'idle' && (
        <div className="card card-pad">
          <p className="mut" style={{ marginTop: 0 }}>
            Share your location and this last step fills itself in — the nearest bait shop
            and the closest spots to start on. Your position stays on your device.
          </p>
          <button type="button" className="btn btn-lime" onClick={geo.request}>
            Use my location
          </button>
        </div>
      )}

      {geo.status === 'denied' && (
        <p className="mut">
          No problem. <Link to="/shops">Browse the bait shops</Link> or{' '}
          <Link to="/locations">all {locations.length} spots</Link> by area instead.
        </p>
      )}

      {geo.coords && (
        <>
          {nearShops.length > 0 && (
            <>
              <h3 className="starth3">Closest bait to you</h3>
              <div className="shoplist">
                {nearShops.map(({ entry, miles }) => (
                  <ShopCard key={entry.shop.slug} entry={entry} miles={miles} />
                ))}
              </div>
            </>
          )}
          {nearby.length > 0 ? (
            <>
              <h3 className="starth3">Start on one of these</h3>
              <ul className="startspots">
                {nearby.map(({ location, miles, reasons }) => (
                  <li key={location.slug}>
                    <Link to={`/locations/${location.slug}`}>
                      <b>{location.name}</b>
                      <span className="mono">{miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi</span>
                    </Link>
                    <span className="mut xs">{reasons.slice(1)[0] ?? location.access.join(' · ')}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mut">
              You are outside the stretch this guide covers — it runs St. Petersburg to Boca
              Grande Pass. <Link to="/locations">See the whole map</Link>.
            </p>
          )}
        </>
      )}

      {/* 5 ---------------------------------------------------------------- */}
      <SectionTitle id="s-catch">5 · Before you catch one</SectionTitle>
      <Callout tone="danger" title="Six of these will hurt you">
        A hardhead catfish has a venomous serrated spine. A snook&rsquo;s gill plate is a
        razor. Stingrays are under the sand you are wading on. Read this before you land
        something, not after.
      </Callout>
      <Link className="btn btn-lime btn-block mt3" to="/care">
        How to handle what you catch
      </Link>
    </div>
  );
}
