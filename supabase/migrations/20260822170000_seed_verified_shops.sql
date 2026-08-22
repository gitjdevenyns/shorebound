-- Switch on the shops whose details were confirmed first-party.
--
-- Listing a shop is an editorial decision and the owner console owns it. This
-- only sets a starting point, so the directory is useful the day it ships
-- rather than empty until twenty boxes are ticked.
--
-- Only `verification: 'verified'` shops are included. The eleven marked
-- needs_check — a real business whose hours, stock or coordinate could not be
-- confirmed — stay off until somebody makes the call. Publishing an address
-- nobody checked is the failure this whole data set exists to prevent.
--
-- `on conflict do nothing` so re-running can never overturn a decision the
-- owner has since made.

insert into public.shop_listings (shop_slug, included, tier) values
  ('bridge-street-bait-shop', true, 'basic'),
  ('palmetto-bait-and-tackle', true, 'basic'),
  ('fishermens-headquarters', true, 'basic'),
  ('gator-jims-pier-shop', true, 'basic'),
  ('oneills-marina', true, 'basic'),
  ('gandy-bait-and-tackle', true, 'basic'),
  ('new-pass-grill-and-bait-shop', true, 'basic'),
  ('economy-tackle', true, 'basic'),
  ('safe-harbor-regatta-pointe', true, 'basic')
on conflict (shop_slug) do nothing;
