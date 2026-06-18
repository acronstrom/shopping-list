-- ============================================================
-- SUBCATEGORIES (two-level categories) — pilot on "Skafferi"
-- ============================================================
-- A department (household_categories.name, e.g. "Skafferi") can have shelf-level
-- subcategories (Pasta, Ris, Mjöl …) that drive finer in-store sorting and give
-- the AI a more specific target. Name-based like the rest of the app.

CREATE TABLE IF NOT EXISTS household_subcategories (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id     uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  parent_category  text NOT NULL,
  name             text NOT NULL,
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, name)
);

CREATE INDEX IF NOT EXISTS idx_household_subcategories_household
  ON household_subcategories(household_id, parent_category, sort_order);

-- The chosen subcategory on an item / learned override. Department (category)
-- is kept as before; subcategory is the finer bucket within it.
ALTER TABLE grocery_items      ADD COLUMN IF NOT EXISTS subcategory text;
ALTER TABLE category_overrides ADD COLUMN IF NOT EXISTS subcategory text;

ALTER TABLE household_subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members can CRUD subcategories" ON household_subcategories;
CREATE POLICY "Household members can CRUD subcategories"
  ON household_subcategories FOR ALL TO authenticated
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

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.household_subcategories TO authenticated;

-- Seed Skafferi's subcategories in ICA Maxi aisle order (2 -> 3 -> 4) for every
-- household, idempotent. Deliberately excludes "Förvaring" (non-food) and
-- "Glutenfritt" (an attribute, not a shelf). "Müsli/Flingor" and "Torkad frukt"
-- are left out because they overlap the "Frukost" department — add them in the
-- app if you'd rather keep them under Skafferi.
WITH skafferi_subs(name, sort_order) AS (
  VALUES
    ('Sylt',          10),
    ('Socker',        20),
    ('Baktillbehör',  30),
    ('Fruktkonserv',  40),
    ('Mjöl',          50),
    ('Gryner',        60),
    ('Kryddor/Salt',  70),
    ('Taco',          80),
    ('Buljong',       90),
    ('Soja',         100),
    ('Asiatiskt',    110),
    ('Nudlar',       120),
    ('Pasta',        130),
    ('Ris',          140),
    ('Olja/Vinäger', 150),
    ('Ketchup/Senap',160),
    ('Sås/Majonäs',  170),
    ('Dressing',     180),
    ('Soppa',        190),
    ('Konserver',    200)
)
INSERT INTO household_subcategories (household_id, parent_category, name, sort_order)
SELECT h.id, 'Skafferi', s.name, s.sort_order
FROM households h
CROSS JOIN skafferi_subs s
ON CONFLICT (household_id, name) DO NOTHING;
