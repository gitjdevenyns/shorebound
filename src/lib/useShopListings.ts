import { useEffect, useState } from 'react';
import { SHOPS } from '../data/shops';
import type { Shop } from '../data/shops';
import { EMPTY_ENHANCED, FREE_PLACEMENTS, parseShopListings } from './listings';
import type { ShopListing } from './listings';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

/**
 * The shop directory as a reader sees it: bundled facts, live listing state.
 *
 * Facts (name, address, phone, what they carry) are bundled and work offline,
 * because someone standing on a beach with one bar is exactly who needs to
 * know where to buy shrimp. Whether a shop is shown, and whether it is
 * enhanced, comes from Supabase so the owner can change it without a deploy.
 *
 * OFFLINE. The resolved listing state is cached in localStorage, so a reader
 * who has opened the app once keeps the directory with the network cut. With
 * no cache and no network the directory is empty rather than wrong — showing
 * every researched business including the unconfirmed ones would put addresses
 * nobody verified in front of people, which is the failure this whole data set
 * was built to avoid.
 */

const CACHE_KEY = 'shorebound.shopListings.v1';

export interface ListedShop {
  shop: Shop;
  listing: ShopListing;
}

const basic = (slug: string): ShopListing => ({
  shop_slug: slug, included: true, tier: 'basic',
  starts_at: null, ends_at: null,
  enhanced: EMPTY_ENHANCED, placements: FREE_PLACEMENTS,
});

function readCache(): unknown {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useShopListings(): { shops: ListedShop[]; loading: boolean } {
  const [listings, setListings] = useState<ShopListing[] | null>(
    () => {
      const cached = readCache();
      return cached ? parseShopListings(cached) : null;
    },
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured()) { setLoading(false); return; }
    (async () => {
      const cp = getSupabaseClient();
      if (!cp) { setLoading(false); return; }
      const supabase = await cp;
      const { data, error } = await supabase.from('shop_listing_public').select('*');
      if (cancelled) return;
      if (!error && data) {
        setListings(parseShopListings(data));
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* private mode */ }
      }
      setLoading(false);
    })().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const byslug = new Map((listings ?? []).map((l) => [l.shop_slug, l]));

  const shops: ListedShop[] = SHOPS
    .filter((s) => byslug.get(s.slug)?.included)
    .map((s) => ({ shop: s, listing: byslug.get(s.slug) ?? basic(s.slug) }))
    // Paid rank first, then editorial order. A shop that has not paid is never
    // pushed below one that has by more than its rank — there is no hidden
    // penalty for a basic listing, only an advantage bought for an enhanced one.
    .sort((a, b) => b.listing.placements.directory_rank - a.listing.placements.directory_rank);

  return { shops, loading };
}

/** Listed shops that name `locationSlug` in `serves`. */
export function useShopsFor(locationSlug: string): { shops: ListedShop[]; loading: boolean } {
  const { shops, loading } = useShopListings();
  return { shops: shops.filter((s) => s.shop.serves.includes(locationSlug)), loading };
}
