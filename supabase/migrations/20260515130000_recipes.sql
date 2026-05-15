-- ============================================================
-- Recipes: saved recipes per household with an ordered list of
-- ingredients. Adding a recipe to the shopping list goes through
-- the existing grocery_items table — recipes themselves are just
-- a reusable template.
-- ============================================================

CREATE TABLE IF NOT EXISTS recipes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          text NOT NULL,
  notes         text,
  created_by    uuid NOT NULL REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipes_household
  ON recipes(household_id, name);

DROP TRIGGER IF EXISTS recipes_updated_at ON recipes;
CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name        text NOT NULL,
  quantity    text,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe
  ON recipe_ingredients(recipe_id, position);

ALTER TABLE recipes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients   ENABLE ROW LEVEL SECURITY;

-- Recipes: household members can do everything.
DROP POLICY IF EXISTS "Household members can CRUD recipes" ON recipes;
CREATE POLICY "Household members can CRUD recipes"
  ON recipes FOR ALL TO authenticated
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

-- Recipe ingredients: gated through the recipe's household membership.
DROP POLICY IF EXISTS "Household members can CRUD recipe ingredients" ON recipe_ingredients;
CREATE POLICY "Household members can CRUD recipe ingredients"
  ON recipe_ingredients FOR ALL TO authenticated
  USING (
    recipe_id IN (
      SELECT r.id FROM recipes r
      JOIN household_members hm ON hm.household_id = r.household_id
      WHERE hm.user_id = (SELECT auth.uid()) AND hm.status = 'accepted'
    )
  )
  WITH CHECK (
    recipe_id IN (
      SELECT r.id FROM recipes r
      JOIN household_members hm ON hm.household_id = r.household_id
      WHERE hm.user_id = (SELECT auth.uid()) AND hm.status = 'accepted'
    )
  );
