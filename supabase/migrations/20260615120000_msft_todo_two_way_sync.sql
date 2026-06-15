-- ============================================================
-- Microsoft To Do two-way sync.
--
-- Adds the columns the bidirectional sync needs:
--   household_msft_todo_connections.can_write — true once the household has
--     re-consented with the Tasks.ReadWrite scope. Existing read-only
--     connections stay false until they reconnect; Microsoft never upgrades
--     an existing refresh token's scope.
--   msft_todo_task_links.app_completed_at — set when the app pushes a
--     completion to To Do (user ticked the item). The reverse pass skips
--     these so un-ticking keeps working and a completion is not recorded
--     twice.
-- ============================================================

ALTER TABLE msft_todo_task_links
  ADD COLUMN IF NOT EXISTS app_completed_at timestamptz;

ALTER TABLE household_msft_todo_connections
  ADD COLUMN IF NOT EXISTS can_write boolean NOT NULL DEFAULT false;
