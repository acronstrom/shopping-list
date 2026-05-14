-- ============================================================
-- Store offers: scraped offers per store
--
-- Populated by the fetch-offers edge function: fetches the store's
-- offers_url, asks GPT-4o to extract structured offers, and replaces
-- the previous rows for that store. Read-only from the client.
-- ============================================================

CREATE TABLE IF NOT EXISTS store_offers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name              text NOT NULL,
  brand             text,
  price             text,
  unit              text,
  comparison_price  text,
  valid_period      text,
  position          integer NOT NULL DEFAULT 0,
  scraped_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_offers_store
  ON store_offers(store_id, position);

-- Track the last scrape attempt on the store itself
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS offers_scraped_at timestamptz;

ALTER TABLE store_offers ENABLE ROW LEVEL SECURITY;

-- Household members can read offers for their household's stores
DROP POLICY IF EXISTS "Household members can read store offers" ON store_offers;
CREATE POLICY "Household members can read store offers"
  ON store_offers FOR SELECT TO authenticated
  USING (
    store_id IN (
      SELECT s.id FROM stores s
      JOIN household_members hm ON hm.household_id = s.household_id
      WHERE hm.user_id = (SELECT auth.uid()) AND hm.status = 'accepted'
    )
  );

-- Writes go through the edge function (service role bypasses RLS); no
-- INSERT/UPDATE/DELETE policy for authenticated users.
