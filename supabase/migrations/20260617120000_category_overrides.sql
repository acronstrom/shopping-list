-- ============================================================
-- CATEGORY OVERRIDES — learned item-name -> category mappings
-- ============================================================
-- When a user manually sets a grocery's category, we remember the choice here
-- so future items with the same (normalized) name are categorized the same way
-- without asking the model. item_name is stored normalized: trimmed and
-- lowercased with Swedish locale, matching normalizeItemName() in the app.

CREATE TABLE IF NOT EXISTS category_overrides (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_name     text NOT NULL,
  category      text NOT NULL,
  updated_by    uuid REFERENCES auth.users(id),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(household_id, item_name)
);

CREATE INDEX IF NOT EXISTS idx_category_overrides_household
  ON category_overrides(household_id, item_name);

-- keep updated_at fresh on upsert-as-update
DROP TRIGGER IF EXISTS category_overrides_updated_at ON category_overrides;
CREATE TRIGGER category_overrides_updated_at
  BEFORE UPDATE ON category_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE category_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members can CRUD category overrides" ON category_overrides;
CREATE POLICY "Household members can CRUD category overrides"
  ON category_overrides FOR ALL TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'accepted'
    )
  )
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'accepted'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.category_overrides TO authenticated;
