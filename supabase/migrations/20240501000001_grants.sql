-- Explicit grants for authenticated role on all app tables.
-- Needed on newer Supabase projects where default privileges differ.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.households         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.household_members  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stores             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.grocery_items      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.aisle_orders       TO authenticated;
GRANT SELECT, INSERT              ON TABLE public.purchase_history   TO authenticated;
