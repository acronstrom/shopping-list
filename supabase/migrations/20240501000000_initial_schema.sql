-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE invite_status AS ENUM ('pending', 'accepted');

-- ============================================================
-- CREATE ALL TABLES FIRST (no cross-referencing policies yet)
-- ============================================================

CREATE TABLE households (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  created_by  uuid NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE household_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id),
  email         text NOT NULL,
  status        invite_status NOT NULL DEFAULT 'pending',
  invited_by    uuid NOT NULL REFERENCES auth.users(id),
  joined_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(household_id, email)
);

CREATE TABLE stores (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          text NOT NULL,
  created_by    uuid NOT NULL REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(household_id, name)
);

CREATE TABLE grocery_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name          text NOT NULL,
  category      text NOT NULL DEFAULT 'Other',
  quantity      text,
  note          text,
  is_checked    boolean NOT NULL DEFAULT false,
  added_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_grocery_items_household ON grocery_items(household_id);

CREATE TABLE aisle_orders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  item_name   text NOT NULL,
  aisle       integer NOT NULL DEFAULT 99,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, item_name)
);

CREATE INDEX idx_aisle_orders_store ON aisle_orders(store_id);

CREATE TABLE purchase_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  item_name     text NOT NULL,
  category      text,
  purchased_by  uuid NOT NULL REFERENCES auth.users(id),
  purchased_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_history_household_name
  ON purchase_history(household_id, item_name);
CREATE INDEX idx_purchase_history_purchased_at
  ON purchase_history(purchased_at);


-- ============================================================
-- TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER grocery_items_updated_at
  BEFORE UPDATE ON grocery_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE households         ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores             ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE aisle_orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history   ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- RLS POLICIES (all tables exist now, cross-references are safe)
-- ============================================================

-- households
CREATE POLICY "Members can view own household"
  ON households FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Authenticated users can create household"
  ON households FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Creator can update household"
  ON households FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- household_members
CREATE POLICY "Members can view household membership"
  ON household_members FOR SELECT TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members hm2
      WHERE hm2.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Members can invite others"
  ON household_members FOR INSERT TO authenticated
  WITH CHECK (
    (
      household_id IN (
        SELECT household_id FROM household_members hm2
        WHERE hm2.user_id = (SELECT auth.uid()) AND hm2.status = 'accepted'
      )
      AND invited_by = (SELECT auth.uid())
    )
    OR
    (invited_by = (SELECT auth.uid()) AND status = 'accepted')
  );

CREATE POLICY "User can accept their invite"
  ON household_members FOR UPDATE TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
    OR user_id = (SELECT auth.uid())
  );

-- stores
CREATE POLICY "Household members can CRUD stores"
  ON stores FOR ALL TO authenticated
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

-- grocery_items
CREATE POLICY "Household members can CRUD grocery items"
  ON grocery_items FOR ALL TO authenticated
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

-- aisle_orders
CREATE POLICY "Household members can CRUD aisle orders"
  ON aisle_orders FOR ALL TO authenticated
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

-- purchase_history
CREATE POLICY "Household members can view purchase history"
  ON purchase_history FOR SELECT TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'accepted'
    )
  );

CREATE POLICY "Household members can insert purchase history"
  ON purchase_history FOR INSERT TO authenticated
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'accepted'
    )
    AND purchased_by = (SELECT auth.uid())
  );


-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE grocery_items;
ALTER PUBLICATION supabase_realtime ADD TABLE household_members;
