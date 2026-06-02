-- ============================================================
-- recipe-images storage bucket.
-- Private bucket, household-scoped via path prefix.
-- Layout: <household_id>/<recipe_id>/<uuid>.<ext>
-- Reads use signed URLs minted by the client.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', false)
ON CONFLICT (id) DO NOTHING;

-- Helper: extract the first path segment as a uuid. Used by every
-- policy below to compare against household_members.household_id.
-- storage.foldername(name) returns an array of path segments.

DROP POLICY IF EXISTS "Household members can read recipe images"
  ON storage.objects;
CREATE POLICY "Household members can read recipe images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Household members can upload recipe images"
  ON storage.objects;
CREATE POLICY "Household members can upload recipe images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Household members can update recipe images"
  ON storage.objects;
CREATE POLICY "Household members can update recipe images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'accepted'
    )
  )
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Household members can delete recipe images"
  ON storage.objects;
CREATE POLICY "Household members can delete recipe images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'recipe-images'
    AND (storage.foldername(name))[1]::uuid IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'accepted'
    )
  );
