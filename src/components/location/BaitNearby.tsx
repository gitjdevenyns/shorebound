import { Link } from 'react-router-dom';
import { useShopsFor } from '../../lib/useShopListings';
import { milesBetween } from '../../lib/geo';
import ShopCard from '../ShopCard';
import { SectionTitle } from '../ui';
import type { Location } from '../../data';

/**
 * "Where to get bait" for one spot.
 *
 * Renders nothing when there is nothing researched to say. An empty section
 * headed "Bait nearby" reads as "there is none", which is a different and
 * wrong claim — several of these spots genuinely have no bait stop within
 * twenty minutes, and where that is true the location's own access notes say
 * so in words.
 */
export default function BaitNearby({ location }: { location: Location }) {
  const { shops, loading } = useShopsFor(location.slug);
  if (loading || shops.length === 0) return null;

  return (
    <section className="sect" aria-labelledby="bait">
      <SectionTitle id="bait" to="/shops" linkLabel="All shops">
        Where to get bait
      </SectionTitle>
      <div className="shoplist">
        {shops.slice(0, 3).map((entry) => (
          <ShopCard
            key={entry.shop.slug}
            entry={entry}
            miles={milesBetween(location, entry.shop)}
          />
        ))}
      </div>
      <p className="mut xs">
        Nearest researched bait to this spot. <Link to="/shops">See them all</Link>.
      </p>
    </section>
  );
}
