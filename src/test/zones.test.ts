import { describe, expect, it } from 'vitest';
import { LOCATIONS } from '../data';
import { zonesFor, zoneForTarget } from '../components/location/zones';
import type { TargetRecipe } from '../data';

/**
 * The content rule, applied to the one place it was broken.
 *
 * `zoneForTarget` used to infer which structure each species works at each
 * spot, from an uncited preference table with an array-index fallback, and the
 * location page rendered the result as an instruction. That is spot advice from
 * general knowledge, which CLAUDE.md forbids outright.
 *
 * These tests assert the honest version: a cast zone appears only when the
 * researched recipe names one. They are written to fail if the inference comes
 * back — including the subtle way it would come back, as a "reasonable default"
 * for a recipe that never researched the field.
 *
 * Modelled on `nearby.test.ts`'s season guard, which protects the same rule on
 * a different surface.
 */

const recipes: Array<{ slug: string; target: TargetRecipe }> = LOCATIONS.flatMap((loc) =>
  (loc.targets ?? []).map((target) => ({ slug: loc.slug, target })),
);

describe('cast zones are researched, never inferred', () => {
  it('finds the recipes to check', () => {
    // Guards the guard: if the data shape moves and this goes empty, the
    // suite below would pass by vacuum.
    expect(recipes.length).toBeGreaterThan(50);
  });

  it('returns no zone for any recipe that does not name one', () => {
    const invented = recipes
      .filter(({ target }) => !target.cast_zone?.trim())
      .filter(({ slug, target }) => zoneForTarget(zonesFor(LOCATIONS.find((l) => l.slug === slug)!), target) !== null)
      .map(({ slug, target }) => `${slug} / ${target.species_label}`);

    expect(
      invented,
      'zoneForTarget returned a zone for a recipe with no researched cast_zone — ' +
        'that is spot advice from general knowledge, which the content rule forbids',
    ).toEqual([]);
  });

  it('resolves a zone when the recipe does name one', () => {
    // Proves the null results above are the rule doing its job, not the
    // function being broken. Uses a real location so the zone kinds are real.
    const loc = LOCATIONS.find((l) => zonesFor(l).length > 0);
    expect(loc, 'no location produced any zone').toBeDefined();

    const zones = zonesFor(loc!);
    const target = { ...loc!.targets[0], cast_zone: zones[0].kind } as TargetRecipe;

    expect(zoneForTarget(zones, target)?.n).toBe(zones[0].n);
  });

  it('does not fall back to the first zone for an unrecognised cast_zone', () => {
    const loc = LOCATIONS.find((l) => zonesFor(l).length > 0)!;
    const zones = zonesFor(loc);
    const target = { ...loc.targets[0], cast_zone: 'somewhere nobody researched' } as TargetRecipe;

    expect(
      zoneForTarget(zones, target),
      'an unmatched cast_zone resolved to a zone — the array-index fallback is back',
    ).toBeNull();
  });
});
