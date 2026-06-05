-- ============================================================
-- Offer match feedback: per-household "this suggestion is wrong"
--
-- When a user dismisses an offer that was suggested because it matched
-- something they buy often (e.g. "Kaffekapslar" surfaced from "Kaffe"),
-- we record the pairing here. Both matchers — the client-side per-store
-- substring matcher and the match-offers edge function — read this and
-- suppress the pairing (and, in the edge function, semantically similar
-- offers for the same frequent item).
--
-- frequent_name is stored lowercased (both matchers produce it that way).
-- offer_name is stored raw; each matcher re-normalizes it at compare time.
-- ============================================================

CREATE TABLE IF NOT EXISTS offer_match_feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  frequent_name text NOT NULL,
  offer_name    text NOT NULL,
  created_by    uuid NOT NULL REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(household_id, frequent_name, offer_name)
);

CREATE INDEX IF NOT EXISTS idx_offer_match_feedback_household
  ON offer_match_feedback(household_id);

ALTER TABLE offer_match_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Household members can CRUD offer_match_feedback" ON offer_match_feedback;
CREATE POLICY "Household members can CRUD offer_match_feedback"
  ON offer_match_feedback FOR ALL TO authenticated
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
