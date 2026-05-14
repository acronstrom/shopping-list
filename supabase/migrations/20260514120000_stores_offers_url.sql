-- ============================================================
-- Add offers_url to stores
--
-- Per-store URL pointing at the chain's current offers page
-- (e.g. https://www.ica.se/handla/butiker/maxi/...). The app opens
-- the URL in the system browser; no scraping/parsing yet.
-- ============================================================

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS offers_url text;
