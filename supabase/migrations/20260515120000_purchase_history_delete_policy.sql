-- ============================================================
-- Allow household members to delete purchase_history rows
--
-- The original policies only granted SELECT + INSERT, so the new
-- "Rensa historik" / per-row delete in the UI would otherwise fail
-- silently against RLS.
-- ============================================================

DROP POLICY IF EXISTS "Household members can delete purchase history" ON purchase_history;
CREATE POLICY "Household members can delete purchase history"
  ON purchase_history FOR DELETE TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'accepted'
    )
  );
