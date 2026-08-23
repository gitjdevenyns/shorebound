import { useEffect, useState } from 'react';
import {
  DEFAULT_MATRIX,
  can as canDo,
  capList as capListFn,
  limitOf as limitOfFn,
  mergeMatrix,
} from './entitlements';
import type { EntitlementMatrix, Tier } from './entitlements';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

/**
 * The live free/paid matrix, and this reader's tier.
 *
 * Follows the same additive contract as live conditions: the shipped defaults
 * in `entitlements.ts` are correct on their own, so the app never waits on a
 * network read to know what to render, and it behaves identically offline.
 * Remote config only ever *replaces* values it successfully parses.
 *
 * ON TIER. There is no billing system yet, so `useTier()` reports 'free' for
 * everyone unless overridden locally. That override exists to make the paid
 * experience testable — it is not a paywall bypass, because there is nothing
 * to bypass: everything is in the bundle already (see entitlements.ts). When
 * real billing lands, this is the one function that changes, and it should
 * then read an entitlement the server vouches for, never a local flag.
 */

const TIER_KEY = 'shorebound.tier';

export function useTier(): [Tier, (t: Tier) => void] {
  const [tier, setTier] = useState<Tier>(() => {
    try {
      return localStorage.getItem(TIER_KEY) === 'paid' ? 'paid' : 'free';
    } catch {
      return 'free';
    }
  });
  const set = (t: Tier) => {
    try {
      localStorage.setItem(TIER_KEY, t);
    } catch {
      /* private mode — the in-memory value still applies for this session */
    }
    setTier(t);
  };
  return [tier, set];
}

export interface Entitlements {
  tier: Tier;
  matrix: EntitlementMatrix;
  /** True once remote config has been merged (or definitively could not be). */
  settled: boolean;
  can: (id: string) => boolean;
  limitOf: (id: string) => number | null;
  capList: <T>(items: T[], id: string) => T[];
}

/** Module-level so every consumer shares one read per session. */
let configPromise: Promise<unknown> | null = null;

async function readEntitlementConfig(): Promise<unknown> {
  if (!isSupabaseConfigured()) return null;
  const clientPromise = getSupabaseClient();
  if (!clientPromise) return null;
  const supabase = await clientPromise;
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'entitlements')
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

export function useEntitlements(): Entitlements {
  const [tier] = useTier();
  const [matrix, setMatrix] = useState<EntitlementMatrix>(DEFAULT_MATRIX);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!configPromise) configPromise = readEntitlementConfig();
    configPromise
      .then((remote) => {
        if (!cancelled) setMatrix(mergeMatrix(remote));
      })
      .catch(() => {
        // Offline, unconfigured, or a bad row. The shipped matrix stands, and
        // that is a correct product, not a degraded one.
      })
      .finally(() => {
        if (!cancelled) setSettled(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    tier,
    matrix,
    settled,
    can: (id) => canDo(matrix, id, tier),
    limitOf: (id) => limitOfFn(matrix, id, tier),
    capList: (items, id) => capListFn(items, matrix, id, tier),
  };
}
