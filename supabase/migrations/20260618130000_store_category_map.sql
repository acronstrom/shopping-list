-- ============================================================
-- STORE CATEGORY MAP — per-store "lens" over generic categories
-- ============================================================
-- Each store keeps its own ordered sections in store_category_orders. This table
-- maps a household (generic) category to the store section it belongs to, so the
-- shopping list can group/sort by the selected store's layout without ever
-- re-categorizing items. Name-based, like store_category_orders.

CREATE TABLE IF NOT EXISTS store_category_map (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id           uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  household_category text NOT NULL,
  store_section      text NOT NULL,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, household_category)
);

CREATE INDEX IF NOT EXISTS idx_store_category_map_store
  ON store_category_map(store_id);

DROP TRIGGER IF EXISTS store_category_map_updated_at ON store_category_map;
CREATE TRIGGER store_category_map_updated_at
  BEFORE UPDATE ON store_category_map
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE store_category_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members can CRUD store category map" ON store_category_map;
CREATE POLICY "Household members can CRUD store category map"
  ON store_category_map FOR ALL TO authenticated
  USING (
    store_id IN (
      SELECT s.id FROM stores s
      JOIN household_members hm ON hm.household_id = s.household_id
      WHERE hm.user_id = (SELECT auth.uid()) AND hm.status = 'accepted'
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT s.id FROM stores s
      JOIN household_members hm ON hm.household_id = s.household_id
      WHERE hm.user_id = (SELECT auth.uid()) AND hm.status = 'accepted'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_category_map TO authenticated;
