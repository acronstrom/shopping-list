-- ============================================================
-- Microsoft To Do → Inköpslista sync.
--
-- Tables:
--   household_msft_todo_connections — one OAuth connection per household
--   msft_todo_task_links — idempotency map between MS task ids and the
--     grocery_items rows they produced
--
-- Realtime is NOT enabled for these tables — the frontend re-reads after
-- mutations and the cron sync runs server-side.
--
-- The pg_cron job at the bottom needs the project ref and the
-- MSFT_CRON_SECRET value patched in BEFORE applying this migration.
-- Search for <FILL_IN_…> below. Keep a .local copy with real values;
-- push the placeholder version.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS household_msft_todo_connections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid NOT NULL UNIQUE REFERENCES households(id) ON DELETE CASCADE,
  connected_by    uuid NOT NULL REFERENCES auth.users(id),
  connected_email text NOT NULL,
  access_token    text NOT NULL,
  refresh_token   text NOT NULL,
  expires_at      timestamptz NOT NULL,
  list_id         text,
  list_name       text,
  last_synced_at  timestamptz,
  last_sync_error text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS household_msft_todo_connections_updated_at
  ON household_msft_todo_connections;
CREATE TRIGGER household_msft_todo_connections_updated_at
  BEFORE UPDATE ON household_msft_todo_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS msft_todo_task_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  msft_task_id    text NOT NULL,
  grocery_item_id uuid REFERENCES grocery_items(id) ON DELETE SET NULL,
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, msft_task_id)
);

CREATE INDEX IF NOT EXISTS idx_msft_todo_task_links_household
  ON msft_todo_task_links(household_id);

ALTER TABLE household_msft_todo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE msft_todo_task_links            ENABLE ROW LEVEL SECURITY;

-- Read-only for household members. The client must only SELECT
-- non-token columns. All writes happen through edge functions running
-- with the service role key, which bypasses RLS.
DROP POLICY IF EXISTS "Household members can read msft connection summary"
  ON household_msft_todo_connections;
CREATE POLICY "Household members can read msft connection summary"
  ON household_msft_todo_connections FOR SELECT TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Household members can read task links"
  ON msft_todo_task_links;
CREATE POLICY "Household members can read task links"
  ON msft_todo_task_links FOR SELECT TO authenticated
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = (SELECT auth.uid()) AND status = 'accepted'
    )
  );

-- pg_cron job — pokes the cron-sync edge function every 15 min.
-- The function verifies x-cron-secret matches MSFT_CRON_SECRET before
-- doing anything. Patch the URL and secret below before applying.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'msft-todo-sync') THEN
    PERFORM cron.unschedule('msft-todo-sync');
  END IF;
END$$;

SELECT cron.schedule(
  'msft-todo-sync',
  '*/15 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://<FILL_IN_PROJECT_REF>.supabase.co/functions/v1/msft-todo-cron-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<FILL_IN_MSFT_CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $cron$
);
