-- ============================================================
-- Store offers: add category and valid_to columns
--
-- ICA's offers page exposes these directly in its hydration JSON
-- (articleGroupName + validTo), so populating them is free.
-- ============================================================

ALTER TABLE store_offers
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS valid_to timestamptz;
