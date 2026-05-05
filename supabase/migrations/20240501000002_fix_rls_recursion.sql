-- Fix: replace self-referencing RLS policies with a SECURITY DEFINER function.
-- The old policies queried household_members inside a policy ON household_members,
-- causing infinite recursion. The function bypasses RLS when called.

CREATE OR REPLACE FUNCTION public.get_my_household_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT household_id
  FROM public.household_members
  WHERE user_id = auth.uid() AND status = 'accepted'
  LIMIT 1
$$;

-- Drop all old policies
DROP POLICY IF EXISTS "Members can view own household"           ON households;
DROP POLICY IF EXISTS "Authenticated users can create household" ON households;
DROP POLICY IF EXISTS "Creator can update household"            ON households;
DROP POLICY IF EXISTS "Members can view household membership"   ON household_members;
DROP POLICY IF EXISTS "Members can invite others"               ON household_members;
DROP POLICY IF EXISTS "User can accept their invite"            ON household_members;
DROP POLICY IF EXISTS "Household members can CRUD stores"       ON stores;
DROP POLICY IF EXISTS "Household members can CRUD grocery items" ON grocery_items;
DROP POLICY IF EXISTS "Household members can CRUD aisle orders" ON aisle_orders;
DROP POLICY IF EXISTS "Household members can view purchase history"   ON purchase_history;
DROP POLICY IF EXISTS "Household members can insert purchase history" ON purchase_history;

-- households
CREATE POLICY "Members can view own household"
  ON households FOR SELECT TO authenticated
  USING (id = public.get_my_household_id());

CREATE POLICY "Authenticated users can create household"
  ON households FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Creator can update household"
  ON households FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- household_members
-- SECURITY DEFINER function breaks the recursion: it queries the table directly, bypassing RLS
CREATE POLICY "Members can view household membership"
  ON household_members FOR SELECT TO authenticated
  USING (household_id = public.get_my_household_id());

CREATE POLICY "Members can invite others"
  ON household_members FOR INSERT TO authenticated
  WITH CHECK (
    -- Existing member inviting someone
    (household_id = public.get_my_household_id() AND invited_by = (SELECT auth.uid()))
    OR
    -- Creator inserting their own accepted row when creating a household
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
  USING (household_id = public.get_my_household_id())
  WITH CHECK (household_id = public.get_my_household_id());

-- grocery_items
CREATE POLICY "Household members can CRUD grocery items"
  ON grocery_items FOR ALL TO authenticated
  USING (household_id = public.get_my_household_id())
  WITH CHECK (household_id = public.get_my_household_id());

-- aisle_orders (no direct household_id, resolve via stores)
CREATE POLICY "Household members can CRUD aisle orders"
  ON aisle_orders FOR ALL TO authenticated
  USING (
    store_id IN (
      SELECT id FROM stores WHERE household_id = public.get_my_household_id()
    )
  )
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE household_id = public.get_my_household_id()
    )
  );

-- purchase_history
CREATE POLICY "Household members can view purchase history"
  ON purchase_history FOR SELECT TO authenticated
  USING (household_id = public.get_my_household_id());

CREATE POLICY "Household members can insert purchase history"
  ON purchase_history FOR INSERT TO authenticated
  WITH CHECK (
    household_id = public.get_my_household_id()
    AND purchased_by = (SELECT auth.uid())
  );
