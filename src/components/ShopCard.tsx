import { SHOP_KIND_LABEL } from '../data/shops';
import { SPONSOR_LABEL } from '../lib/listings';
import type { ListedShop } from '../lib/useShopListings';

/**
 * One shop, basic or enhanced.
 *
 * The two tiers share a shape on purpose. A basic listing is a real, complete,
 * useful entry — name, address, phone, what they carry, how far — because the
 * directory's value to a reader is that it lists everyone, and its value to an
 * advertiser is that readers use it. An enhanced listing adds the shop's own
 * material on top; it does not make the free ones worse.
 *
 * Everything enhanced carries the disclosure. There is no path through this
 * component that renders paid material without it.
 */
export default function ShopCard({ entry, miles }: { entry: ListedShop; miles?: number }) {
  const { shop, listing } = entry;
  const e = listing.enhanced;
  const p = listing.placements;
  const paid = listing.tier === 'enhanced';

  const offerLive =
    e.offer_text && (!e.offer_expires || Date.parse(e.offer_expires) > Date.now());

  return (
    <article className={`shopcard${paid ? ' shopcard--paid' : ''}`}>
      {paid && <span className="shopcard-tag">{SPONSOR_LABEL}</span>}

      <div className="shopcard-hd">
        {paid && e.logo_url && (
          <img className="shopcard-logo" src={e.logo_url} alt="" loading="lazy" />
        )}
        <div className="shopcard-name">
          <h3>{shop.name}</h3>
          {paid && e.tagline && <p className="shopcard-tag-line">{e.tagline}</p>}
          <p className="mut xs">{shop.address}</p>
        </div>
        {miles !== undefined && (
          <span className="shopcard-dist mono">
            {miles < 0.1 ? 'right here' : miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`}
          </span>
        )}
      </div>

      <div className="shopcard-kinds">
        {shop.kind.map((k) => <span key={k} className="chip">{SHOP_KIND_LABEL[k]}</span>)}
      </div>

      {shop.carries.length > 0 && (
        <p className="shopcard-carries">
          <span className="lab">Carries</span> {shop.carries.join(' · ')}
        </p>
      )}

      {shop.hours ? (
        <p className="shopcard-hours"><span className="lab">Hours</span> {shop.hours}</p>
      ) : (
        // Saying so beats an empty row: a reader who knows the hours are
        // unknown will phone ahead, and one shown a blank will not.
        <p className="shopcard-hours mut">Hours not published — call ahead.</p>
      )}

      {shop.notes.map((n) => <p key={n} className="shopcard-note">{n}</p>)}

      {paid && offerLive && (
        <p className="shopcard-offer"><span className="lab">Offer</span> {e.offer_text}</p>
      )}

      {paid && e.statement && (
        <blockquote className="shopcard-quote">
          {e.statement}
          {e.statement_by && <cite>— {e.statement_by}</cite>}
        </blockquote>
      )}

      {paid && e.photos.length > 0 && (
        <div className="shopcard-photos">
          {e.photos.map((src) => (
            <img key={src} src={src} alt={`${shop.name}`} loading="lazy" />
          ))}
        </div>
      )}

      <div className="shopcard-cta">
        {shop.phone && (
          <a
            className={`btn ${paid && p.call_button ? 'btn-lime' : 'btn-ghost'}`}
            href={`tel:${shop.phone.replace(/[^\d+]/g, '')}`}
          >
            {shop.phone}
          </a>
        )}
        <a
          className="btn btn-ghost"
          href={`https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lng}`}
          target="_blank" rel="noreferrer"
        >
          Directions
        </a>
        {/* An outbound link is part of what an enhanced listing buys. */}
        {paid && p.website_link && shop.website && (
          <a className="btn btn-ghost" href={shop.website} target="_blank" rel="noreferrer">
            Website ↗
          </a>
        )}
      </div>
    </article>
  );
}
