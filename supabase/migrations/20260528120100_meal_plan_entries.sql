-- ============================================================
-- Meal plan entries: one recipe scheduled per (household, date).
-- The UNIQUE constraint enforces the one-slot-per-day product
-- decision at the DB layer so upserts can target it directly.
-- grocery_items gains a back-reference so a generated shopping
-- list can be traced to the planned meal it came from.
-- ============================================================

CREATE TABLE IF NOT EXISTS meal_plan_entries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id      uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  recipe_id         uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  planned_date      date NOT NULL,
  servings_override integer,
  status            text NOT NULL DEFAULT 'planned',
  notes             text,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, planned_date)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meal_plan_entries_status_check'
  ) THEN
    ALTER TABLE meal_plan_entries
      ADD CONSTRAINT meal_plan_entries_status_check
      CHECK (status IN ('planned', 'cooked', 'skipped'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meal_plan_entries_servings_check'
  ) THEN
    ALTER TABLE meal_plan_entries
      ADD CONSTRAINT meal_plan_entries_servings_check
      CHECK (servings_override IS NULL OR servings_override > 0);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_meal_plan_entries_household_date
  ON meal_plan_entries(household_id, planned_date);

DROP TRIGGER IF EXISTS meal_plan_entries_updated_at ON meal_plan_entries;
CREATE TRIGGER meal_plan_entries_updated_at
  BEFORE UPDATE ON meal_plan_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE meal_plan_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members can CRUD meal plan entries"
  ON meal_plan_entries;
CREATE POLICY "Household members can CRUD meal plan entries"
  ON meal_plan_entries FOR ALL TO authenticated
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

-- Grocery items can be linked back to the planned meal that produced
-- them. Deleting the plan entry leaves the items on the list but
-- unlinked (ON DELETE SET NULL).
ALTER TABLE grocery_items
  ADD COLUMN IF NOT EXISTS meal_plan_entry_id uuid
    REFERENCES meal_plan_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_grocery_items_meal_plan_entry
  ON grocery_items(meal_plan_entry_id)
  WHERE meal_plan_entry_id IS NOT NULL;

-- Realtime: the meal plan is shared live across the household, just
-- like grocery_items. Wrap in DO block so re-running is safe.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'meal_plan_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE meal_plan_entries;
  END IF;
END$$;
