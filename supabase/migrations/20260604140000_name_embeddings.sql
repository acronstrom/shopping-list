-- ============================================================
-- Name embedding cache.
--
-- Used by the match-offers edge function to correlate store offers with
-- the household's frequently-bought items by meaning. Keyed by a
-- normalized product name (lowercased, size/unit tokens stripped), so
-- identical names across stores and households share a cache entry.
--
-- Generic, non-sensitive product-name vectors. Read/written only by the
-- service-role edge function: RLS is on with NO authenticated policies.
-- ============================================================

CREATE TABLE IF NOT EXISTS name_embeddings (
  text_key    text PRIMARY KEY,
  embedding   jsonb NOT NULL,
  model       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE name_embeddings ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (which bypasses RLS) touches this table.
