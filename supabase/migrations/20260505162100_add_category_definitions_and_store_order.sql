-- ============================================================
-- CATEGORIES (household-defined) + store-specific ordering
-- ============================================================

CREATE TABLE IF NOT EXISTS household_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          text NOT NULL,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(household_id, name)
);

CREATE INDEX IF NOT EXISTS idx_household_categories_household
  ON household_categories(household_id, sort_order, name);

CREATE TABLE IF NOT EXISTS store_category_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_name  text NOT NULL,
  position       integer NOT NULL DEFAULT 0,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, category_name)
);

CREATE INDEX IF NOT EXISTS idx_store_category_orders_store
  ON store_category_orders(store_id, position, category_name);

-- updated_at trigger for store_category_orders
DROP TRIGGER IF EXISTS store_category_orders_updated_at ON store_category_orders;
CREATE TRIGGER store_category_orders_updated_at
  BEFORE UPDATE ON store_category_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE household_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_category_orders  ENABLE ROW LEVEL SECURITY;

-- household_categories: household members can CRUD
DROP POLICY IF EXISTS "Household members can CRUD household categories" ON household_categories;
CREATE POLICY "Household members can CRUD household categories"
  ON household_categories FOR ALL TO authenticated
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

-- store_category_orders: household members can CRUD
DROP POLICY IF EXISTS "Household members can CRUD store category orders" ON store_category_orders;
CREATE POLICY "Household members can CRUD store category orders"
  ON store_category_orders FOR ALL TO authenticated
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

-- Seed defaults for existing households (idempotent)
WITH default_categories(name, sort_order) AS (
  VALUES
    ('Produce', 10),
    ('Dairy & Eggs', 20),
    ('Meat & Seafood', 30),
    ('Bakery', 40),
    ('Frozen', 50),
    ('Pantry', 60),
    ('Snacks', 70),
    ('Beverages', 80),
    ('Household', 90),
    ('Personal Care', 100),
    ('Baby', 110),
    ('Pet', 120),
    ('Other', 999)
)
INSERT INTO household_categories (household_id, name, sort_order)
SELECT h.id, dc.name, dc.sort_order
FROM households h
CROSS JOIN default_categories dc
ON CONFLICT (household_id, name) DO NOTHING;

-- Seed per-store ordering from household category order if missing (idempotent)
INSERT INTO store_category_orders (store_id, category_name, position)
SELECT s.id, hc.name, hc.sort_order
FROM stores s
JOIN household_categories hc ON hc.household_id = s.household_id
ON CONFLICT (store_id, category_name) DO NOTHING;

