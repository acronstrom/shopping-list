-- ============================================================
-- Microsoft To Do history import.
--
-- Lets a household pull every *completed* To Do task into
-- purchase_history (one row per completion). Idempotency reuses the
-- existing msft_todo_task_links UNIQUE (household_id, msft_task_id):
-- history_imported_at marks tasks already turned into purchase history,
-- so re-running the import is a no-op for them.
-- ============================================================

ALTER TABLE msft_todo_task_links
  ADD COLUMN IF NOT EXISTS history_imported_at timestamptz;
