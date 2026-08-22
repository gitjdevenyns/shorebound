import { useMemo, useState } from 'react';
import { useShopListings } from '../lib/useShopListings';
import { useGeolocation, milesBetween } from '../lib/geo';
import { SHOP_KINDS, SHOP_KIND_LABEL } from '../data/shops';
import type { ShopKind } from '../data/shops';
import ShopCard from '../components/ShopCard';
import { SectionTitle, Skeleton } from '../components/ui';

/**
 * Where to buy bait.
 *
 * Small local shops, researched the same way the fishing spots were — sourced,
 * with anything unconfirmed left out rather than guessed. The whole point is
 * that it lists everyone worth listing, not only whoever paid, so it is worth
 * opening; which is also the only reason a listing in it is worth buying.
 */
export default function Shops() {
  const { shops, loading } = useShopListings();
  const geo = useGeolocation();
  const [kind, setKind] = useState<ShopKind | 'all'>('all');

  const shown = useMemo(() => {
    const list = kind === 'all' ? shops : shops.filter((s) => s.shop.kind.includes(kind));
    if (!geo.coords) return list.map((entry) => ({ entry, miles: undefined as number | undefined }));
    // With a position, distance beats editorial order — but a paid rank still
    // sorts first, so what was bought is not silently undone by standing
    // somewhere else.
    return list
      .map((entry) => ({ entry, miles: milesBetween(geo.coords!, entry.shop) }))
      .sort((a, b) =>
        b.entry.listing.placements.directory_rank - a.entry.listing.placements.directory_rank
        || (a.miles ?? 0) - (b.miles ?? 0));
  }, [shops, kind, geo.coords]);

  const kinds = SHOP_KINDS.filter((k) => shops.some((s) => s.shop.kind.includes(k)));

  return (
    <div className="sect">
      <SectionTitle as="h2" id="shops">Bait &amp; tackle</SectionTitle>
      <p className="mut lede">
        Where to buy bait near the spots in this guide. Local shops, researched
        the same way everything else here was — and listed whether or not they
        pay us.
      </p>

      {loading && (
        <div className="stack g3" style={{ marginTop: 'var(--s4)' }}>
          <Skeleton block /><Skeleton block />
        </div>
      )}

      {!loading && shops.length === 0 && (
        <p className="callout callout--info">
          The directory is not switched on yet. Every shop in it is researched
          before it appears, and nothing is listed until it has been checked.
        </p>
      )}

      {!loading && shops.length > 0 && (
        <>
          {geo.status === 'idle' && (
            <div className="card card-pad mt3">
              <p className="mut" style={{ marginTop: 0 }}>
                Use your location to sort by how far away each shop is. Your
                position stays on your device.
              </p>
              <button type="button" className="btn btn-lime" onClick={geo.request}>
                Sort by distance
              </button>
            </div>
          )}

          {kinds.length > 1 && (
            <div className="row g2 wrap mt3">
              <button
                type="button" className={`btn ${kind === 'all' ? 'btn-lime' : 'btn-ghost'}`}
                onClick={() => setKind('all')}
              >
                All ({shops.length})
              </button>
              {kinds.map((k) => (
                <button
                  key={k} type="button"
                  className={`btn ${kind === k ? 'btn-lime' : 'btn-ghost'}`}
                  onClick={() => setKind(k)}
                >
                  {SHOP_KIND_LABEL[k]}
                </button>
              ))}
            </div>
          )}

          <div className="shoplist">
            {shown.map(({ entry, miles }) => (
              <ShopCard key={entry.shop.slug} entry={entry} miles={miles} />
            ))}
          </div>

          <p className="mut xs mt3">
            Hours and stock change, especially since the 2024 storms. Call
            before you drive. If something here is wrong, we want to know.
          </p>
        </>
      )}
    </div>
  );
}
