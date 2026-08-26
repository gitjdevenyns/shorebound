import { useCallback, useEffect, useMemo, useState } from 'react';
import { SHOPS, SHOP_KIND_LABEL } from '../data/shops';
import type { Shop } from '../data/shops';
import {
  EMPTY_ENHANCED, FREE_PLACEMENTS, MAX_PHOTOS,
  parseEnhanced, parsePlacements,
} from '../lib/listings';
import type { EnhancedContent, ListingPlacements, ListingTier } from '../lib/listings';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

/**
 * Shop directory manager.
 *
 * Two decisions per shop, kept visibly separate because they answer to
 * different rules and merging them is how a directory turns into a pile of
 * adverts:
 *
 *  - **Included** is editorial. It means "readers should see this business".
 *    An unpaid shop is still included; a researched-but-unconfirmed one can be
 *    excluded until someone has made the call.
 *  - **Tier** is commercial. It means "this shop is paying for extras".
 *
 * Nothing here edits a researched fact. Address, phone and stock come from
 * `src/data/shops.ts` and change only through the review queue.
 */

interface Row {
  included: boolean;
  tier: ListingTier;
  ends_at: string | null;
  enhanced: EnhancedContent;
  placements: ListingPlacements;
  admin_notes: string | null;
}

const BLANK: Row = {
  included: false, tier: 'basic', ends_at: null,
  enhanced: EMPTY_ENHANCED, placements: FREE_PLACEMENTS, admin_notes: null,
};

function ShopCard({ shop, row, save }: {
  shop: Shop; row: Row; save: (slug: string, patch: Partial<Row>) => void;
}) {
  const [open, setOpen] = useState(false);
  const e = row.enhanced;
  const p = row.placements;
  const setE = (patch: Partial<EnhancedContent>) => save(shop.slug, { enhanced: { ...e, ...patch } });
  const setP = (patch: Partial<ListingPlacements>) => save(shop.slug, { placements: { ...p, ...patch } });

  return (
    <article className={`sh ${row.included ? 'sh--in' : ''} ${row.tier === 'enhanced' ? 'sh--paid' : ''}`}>
      <div className="sh-hd">
        <label className="adm-toggle sh-inc">
          <input
            type="checkbox" checked={row.included}
            onChange={(ev) => save(shop.slug, { included: ev.target.checked })}
          />
          <span>List</span>
        </label>
        <div className="sh-name">
          <b>{shop.name}</b>
          <div className="mut xs">{shop.address}</div>
        </div>
        <div className="sh-tags">
          {shop.kind.map((k) => <span key={k} className="chip">{SHOP_KIND_LABEL[k]}</span>)}
          {!shop.independent && <span className="chip chip-warn">chain</span>}
          {shop.verification === 'needs_check' && (
            <span className="chip chip-danger">unconfirmed</span>
          )}
        </div>
      </div>

      <div className="sh-facts">
        <span>{shop.phone ?? 'no phone'}</span>
        <span>{shop.hours ?? 'hours unknown'}</span>
        <span>{shop.serves.length} spot{shop.serves.length === 1 ? '' : 's'}</span>
        {shop.carries.length > 0 && <span>{shop.carries.length} stock items</span>}
      </div>
      {shop.notes.map((n) => <p key={n} className="sh-note">{n}</p>)}

      <div className="sh-tier">
        {(['basic', 'enhanced'] as ListingTier[]).map((t) => (
          <button
            key={t} type="button"
            className={`btn ${row.tier === t ? 'btn-lime' : 'btn-ghost'}`}
            onClick={() => save(shop.slug, { tier: t })}
            disabled={!row.included}
          >
            {t === 'basic' ? 'Basic (free)' : 'Enhanced (paid)'}
          </button>
        ))}
        {row.tier === 'enhanced' && (
          <button type="button" className="iconbtn" onClick={() => setOpen((o) => !o)}>
            {open ? 'Hide' : 'Edit'} paid content
          </button>
        )}
      </div>

      {row.tier === 'enhanced' && open && (
        <div className="sh-paid">
          <p className="mut xs">
            Everything below is the shop's own material, shown as theirs. The guide
            never writes an owner's statement or invents an offer.
          </p>

          <label className="fld"><span>Tagline</span>
            <input value={e.tagline ?? ''} placeholder="Live shrimp since 1989"
              onChange={(ev) => setE({ tagline: ev.target.value || null })} /></label>

          <label className="fld"><span>Logo URL</span>
            <input value={e.logo_url ?? ''} placeholder="https://…/logo.png"
              onChange={(ev) => setE({ logo_url: ev.target.value || null })} /></label>

          <label className="fld"><span>Photos <em>(one URL per line, max {MAX_PHOTOS})</em></span>
            <textarea rows={3} value={e.photos.join('\n')}
              onChange={(ev) => setE({ photos: ev.target.value.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, MAX_PHOTOS) })} /></label>

          <label className="fld"><span>Statement from the shop</span>
            <textarea rows={2} value={e.statement ?? ''}
              placeholder="We net our own pilchards every morning."
              onChange={(ev) => setE({ statement: ev.target.value || null })} /></label>

          <label className="fld"><span>Attributed to</span>
            <input value={e.statement_by ?? ''} placeholder="Bruce, owner since 1998"
              onChange={(ev) => setE({ statement_by: ev.target.value || null })} /></label>

          <label className="fld"><span>Special offer</span>
            <input value={e.offer_text ?? ''} placeholder="$2 off a dozen shrimp before 7am"
              onChange={(ev) => setE({ offer_text: ev.target.value || null })} /></label>

          <label className="fld"><span>Offer expires <em>(stops showing on its own)</em></span>
            <input type="date" value={e.offer_expires?.slice(0, 10) ?? ''}
              onChange={(ev) => setE({ offer_expires: ev.target.value || null })} /></label>

          <fieldset className="sh-plc">
            <legend>What the deal includes</legend>
            {([
              ['map_pin', 'Highlighted map pin'],
              ['website_link', 'Outbound link to their site'],
              ['call_button', 'Tap-to-call button'],
            ] as const).map(([k, label]) => (
              <label key={k} className="adm-toggle">
                <input type="checkbox" checked={p[k]} onChange={(ev) => setP({ [k]: ev.target.checked })} />
                <span>{label}</span>
              </label>
            ))}
            <label className="adm-toggle">
              <span>Directory rank</span>
              <input type="number" min={0} className="adm-num" value={p.directory_rank}
                onChange={(ev) => setP({ directory_rank: Math.max(0, Number(ev.target.value) || 0) })} />
            </label>
          </fieldset>

          <label className="fld"><span>Sponsor card on these spots <em>(slugs, comma separated)</em></span>
            <input value={p.location_slugs.join(', ')}
              placeholder={shop.serves.slice(0, 3).join(', ')}
              onChange={(ev) => setP({ location_slugs: ev.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} /></label>

          <label className="fld"><span>Deal ends</span>
            <input type="date" value={row.ends_at?.slice(0, 10) ?? ''}
              onChange={(ev) => save(shop.slug, { ends_at: ev.target.value || null })} /></label>

          <label className="fld"><span>Private notes <em>(rate, contact — never shown)</em></span>
            <input value={row.admin_notes ?? ''}
              onChange={(ev) => save(shop.slug, { admin_notes: ev.target.value || null })} /></label>
        </div>
      )}
    </article>
  );
}

export default function Shops() {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [onlyLocal, setOnlyLocal] = useState(true);
  const [hideUnconfirmed, setHideUnconfirmed] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) { setMsg('Supabase is not configured — nothing can be saved.'); return; }
    (async () => {
      const cp = getSupabaseClient(); if (!cp) return;
      const supabase = await cp;
      // Not `.from('shop_listings').select('*')`. anon and authenticated hold
      // column grants that exclude admin_notes, so a direct select of every
      // column is refused — which is the point. This function is security
      // definer and checks is_admin() itself.
      const { data, error } = await supabase.rpc('admin_list_shop_listings');
      if (error) { setMsg(error.message); return; }
      const map: Record<string, Row> = {};
      for (const d of data ?? []) {
        map[d.shop_slug] = {
          included: d.included, tier: d.tier === 'enhanced' ? 'enhanced' : 'basic',
          ends_at: d.ends_at, enhanced: parseEnhanced(d.enhanced),
          placements: parsePlacements(d.placements), admin_notes: d.admin_notes,
        };
      }
      setRows(map);
    })().catch((e: unknown) => setMsg(e instanceof Error ? e.message : 'Could not load listings.'));
  }, []);

  const save = useCallback((slug: string, patch: Partial<Row>) => {
    setRows((r) => {
      const next = { ...(r[slug] ?? BLANK), ...patch };
      const cp = getSupabaseClient();
      if (cp) {
        cp.then((supabase) =>
          supabase.from('shop_listings').upsert({ shop_slug: slug, ...next }, { onConflict: 'shop_slug' }),
        ).then(({ error }) => setMsg(error ? `Not saved: ${error.message}` : null))
         .catch(() => setMsg('Not saved.'));
      }
      return { ...r, [slug]: next };
    });
  }, []);

  const shown = useMemo(
    () => SHOPS
      .filter((s) => (!onlyLocal || s.independent))
      .filter((s) => (!hideUnconfirmed || s.verification === 'verified')),
    [onlyLocal, hideUnconfirmed],
  );

  const listed = SHOPS.filter((s) => rows[s.slug]?.included).length;
  const paid = SHOPS.filter((s) => rows[s.slug]?.tier === 'enhanced' && rows[s.slug]?.included).length;

  return (
    <div className="rv-page">
      <h1 className="d2">Bait &amp; tackle directory</h1>
      {msg && <p className="callout callout--warn">{msg}</p>}

      <p className="mut">
        <b>{listed}</b> of {SHOPS.length} listed to readers · <b>{paid}</b> paying for an
        enhanced listing. Listing a shop is editorial and free; the tier is what
        is sold. Researched facts are not editable here — they change through
        the review queue.
      </p>

      <div className="rv-filters">
        <label className="adm-toggle">
          <input type="checkbox" checked={onlyLocal} onChange={(e) => setOnlyLocal(e.target.checked)} />
          <span>Small local shops only (hide chains)</span>
        </label>
        <label className="adm-toggle">
          <input type="checkbox" checked={hideUnconfirmed} onChange={(e) => setHideUnconfirmed(e.target.checked)} />
          <span>Hide unconfirmed</span>
        </label>
      </div>

      <div className="rv-list">
        {shown.map((s) => (
          <ShopCard key={s.slug} shop={s} row={rows[s.slug] ?? BLANK} save={save} />
        ))}
      </div>
    </div>
  );
}
