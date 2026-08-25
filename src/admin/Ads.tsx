import { useCallback, useEffect, useState } from 'react';
import { AD_SLOTS, SPONSOR_LABEL } from '../lib/listings';
import type { AdCampaign } from '../lib/listings';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

/**
 * Advertising — kept entirely separate from the bait & tackle directory.
 *
 * These advertisers have no editorial standing in the guide: a charter
 * captain, a restaurant, a tourism board. Nothing here can put a business into
 * the shop directory or change how one appears there, and the directory
 * manager cannot create an ad. That separation is the whole reason the
 * directory stays worth reading, and it is enforced in the schema, not just
 * in this screen.
 *
 * `advertiser` is required on every campaign because it is the disclosure. An
 * ad that cannot say whose it is does not render.
 */

type Draft = Omit<AdCampaign, 'id'> & { id?: string; admin_notes?: string | null };

const BLANK: Draft = {
  advertiser: '', headline: '', body: null, image_url: null, href: null,
  slots: [], starts_at: null, ends_at: null, active: false, admin_notes: null,
};

export default function Ads() {
  const [items, setItems] = useState<Draft[]>([]);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) { setMsg('Supabase is not configured — nothing can be saved.'); return; }
    const cp = getSupabaseClient(); if (!cp) return;
    const supabase = await cp;
    // Reads through the security definer function rather than the table: the
    // column grants on ad_campaigns exclude admin_notes from anon and
    // authenticated, so `select('*')` is refused. Ordering is inside the
    // function.
    const { data, error } = await supabase.rpc('admin_list_ad_campaigns');
    if (error) setMsg(error.message);
    else { setItems((data ?? []) as Draft[]); setMsg(null); }
  }, []);

  useEffect(() => { load().catch(() => setMsg('Could not load campaigns.')); }, [load]);

  const persist = async (row: Draft) => {
    const cp = getSupabaseClient(); if (!cp) return;
    const supabase = await cp;
    const { error } = await supabase.from('ad_campaigns').upsert(row);
    if (error) setMsg(`Not saved: ${error.message}`);
    else { setMsg(null); setDraft(BLANK); await load(); }
  };

  const toggleSlot = (row: Draft, slot: string, set: (d: Draft) => void) =>
    set({ ...row, slots: row.slots.includes(slot) ? row.slots.filter((s) => s !== slot) : [...row.slots, slot] });

  const canSave = draft.advertiser.trim() !== '' && draft.headline.trim() !== '';

  return (
    <div className="rv-page">
      <h1 className="d2">Advertising</h1>
      {msg && <p className="callout callout--warn">{msg}</p>}

      <p className="mut">
        Open advertising, separate from the bait &amp; tackle directory. Nothing
        here can add a business to that directory or change how one appears in
        it. Every ad renders with a “{SPONSOR_LABEL}” label — there is no way to
        turn that off, and an ad with no advertiser name will not render at all.
      </p>

      <section className="mt3">
        <h2 className="rv-h2">Slots you can sell</h2>
        <div className="rv-list">
          {AD_SLOTS.map((s) => (
            <div key={s.id} className="sh">
              <div className="sh-hd">
                <div className="sh-name">
                  <b>{s.label}</b>
                  <div className="mut xs">{s.note}</div>
                </div>
                <code className="adm-key">{s.id}</code>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt3">
        <h2 className="rv-h2">New campaign</h2>
        <div className="sh sh-form">
          <label className="fld"><span>Advertiser <em>(shown in the disclosure — required)</em></span>
            <input value={draft.advertiser} onChange={(e) => setDraft({ ...draft, advertiser: e.target.value })} /></label>
          <label className="fld"><span>Headline <em>(required)</em></span>
            <input value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} /></label>
          <label className="fld"><span>Body</span>
            <textarea rows={2} value={draft.body ?? ''} onChange={(e) => setDraft({ ...draft, body: e.target.value || null })} /></label>
          <label className="fld"><span>Image URL</span>
            <input value={draft.image_url ?? ''} onChange={(e) => setDraft({ ...draft, image_url: e.target.value || null })} /></label>
          <label className="fld"><span>Links to</span>
            <input value={draft.href ?? ''} onChange={(e) => setDraft({ ...draft, href: e.target.value || null })} /></label>
          <fieldset className="sh-plc">
            <legend>Slots</legend>
            {AD_SLOTS.map((s) => (
              <label key={s.id} className="adm-toggle">
                <input type="checkbox" checked={draft.slots.includes(s.id)}
                  onChange={() => toggleSlot(draft, s.id, setDraft)} />
                <span>{s.label}</span>
              </label>
            ))}
          </fieldset>
          <label className="fld"><span>Ends</span>
            <input type="date" value={draft.ends_at?.slice(0, 10) ?? ''}
              onChange={(e) => setDraft({ ...draft, ends_at: e.target.value || null })} /></label>
          <label className="adm-toggle">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            <span>Live</span>
          </label>
          <button type="button" className="btn btn-lime" disabled={!canSave} onClick={() => persist(draft)}>
            Save campaign
          </button>
          {!canSave && <p className="mut xs">Advertiser and headline are required.</p>}
        </div>
      </section>

      <section className="mt3">
        <h2 className="rv-h2">Campaigns ({items.length})</h2>
        {items.length === 0 && <p className="mut">Nothing sold yet.</p>}
        <div className="rv-list">
          {items.map((c) => (
            <div key={c.id} className={`sh ${c.active ? 'sh--paid' : ''}`}>
              <div className="sh-hd">
                <div className="sh-name">
                  <b>{c.headline}</b>
                  <div className="mut xs">{c.advertiser} · {c.slots.join(', ') || 'no slot'}</div>
                </div>
                <span className={`chip ${c.active ? 'chip-lime' : ''}`}>{c.active ? 'Live' : 'Paused'}</span>
              </div>
              <div className="sh-tier">
                <button type="button" className="btn btn-ghost" onClick={() => persist({ ...c, active: !c.active })}>
                  {c.active ? 'Pause' : 'Go live'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
