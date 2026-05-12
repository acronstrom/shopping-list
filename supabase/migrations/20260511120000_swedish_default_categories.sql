-- ============================================================
-- Swap default categories from English to a Swedish 17-set
-- aligned with how Swedish grocery stores (e.g. ICA Maxi) are
-- organized. Remaps grocery_items.category, purchase_history.category,
-- household_categories rows, and store_category_orders entries.
--
-- Idempotent: safe to re-run. Manually-created (non-default)
-- categories are preserved.
-- ============================================================

-- ------------------------------------------------------------
-- Step A: Seed 17 new Swedish categories for every household.
-- ------------------------------------------------------------
WITH new_categories(name, sort_order) AS (
  VALUES
    ('Frukt & Grönt',       10),
    ('Mejeri & Ägg',        20),
    ('Kött & Chark',        30),
    ('Fisk & Skaldjur',     40),
    ('Bröd',                50),
    ('Bageri & Fikabröd',   60),
    ('Fryst',               70),
    ('Skafferi',            80),
    ('Frukost',             90),
    ('Snacks & Godis',     100),
    ('Dryck',              110),
    ('Hygien',             120),
    ('Tvätt & Städ',       130),
    ('Papper & Hushåll',   140),
    ('Djurmat',            150),
    ('Barn & Familj',      160),
    ('Övrigt',             999)
)
INSERT INTO household_categories (household_id, name, sort_order)
SELECT h.id, nc.name, nc.sort_order
FROM households h
CROSS JOIN new_categories nc
ON CONFLICT (household_id, name) DO NOTHING;

-- ------------------------------------------------------------
-- Step B: Remap grocery_items.category from old English to new Swedish.
-- ------------------------------------------------------------
WITH mapping(old_name, new_name) AS (
  VALUES
    ('Produce',         'Frukt & Grönt'),
    ('Dairy & Eggs',    'Mejeri & Ägg'),
    ('Meat & Seafood',  'Kött & Chark'),
    ('Bakery',          'Bröd'),
    ('Frozen',          'Fryst'),
    ('Pantry',          'Skafferi'),
    ('Snacks',          'Snacks & Godis'),
    ('Beverages',       'Dryck'),
    ('Household',       'Tvätt & Städ'),
    ('Personal Care',   'Hygien'),
    ('Baby',            'Barn & Familj'),
    ('Pet',             'Djurmat'),
    ('Other',           'Övrigt')
)
UPDATE grocery_items gi
SET category = m.new_name
FROM mapping m
WHERE gi.category = m.old_name;

-- ------------------------------------------------------------
-- Step C: Remap purchase_history.category similarly.
-- ------------------------------------------------------------
WITH mapping(old_name, new_name) AS (
  VALUES
    ('Produce',         'Frukt & Grönt'),
    ('Dairy & Eggs',    'Mejeri & Ägg'),
    ('Meat & Seafood',  'Kött & Chark'),
    ('Bakery',          'Bröd'),
    ('Frozen',          'Fryst'),
    ('Pantry',          'Skafferi'),
    ('Snacks',          'Snacks & Godis'),
    ('Beverages',       'Dryck'),
    ('Household',       'Tvätt & Städ'),
    ('Personal Care',   'Hygien'),
    ('Baby',            'Barn & Familj'),
    ('Pet',             'Djurmat'),
    ('Other',           'Övrigt')
)
UPDATE purchase_history ph
SET category = m.new_name
FROM mapping m
WHERE ph.category = m.old_name;

-- ------------------------------------------------------------
-- Step D: Remap store_category_orders.category_name, handling the
-- UNIQUE(store_id, category_name) constraint when both old and new
-- already exist for the same store.
-- ------------------------------------------------------------
WITH mapping(old_name, new_name) AS (
  VALUES
    ('Produce',         'Frukt & Grönt'),
    ('Dairy & Eggs',    'Mejeri & Ägg'),
    ('Meat & Seafood',  'Kött & Chark'),
    ('Bakery',          'Bröd'),
    ('Frozen',          'Fryst'),
    ('Pantry',          'Skafferi'),
    ('Snacks',          'Snacks & Godis'),
    ('Beverages',       'Dryck'),
    ('Household',       'Tvätt & Städ'),
    ('Personal Care',   'Hygien'),
    ('Baby',            'Barn & Familj'),
    ('Pet',             'Djurmat'),
    ('Other',           'Övrigt')
),
dropped AS (
  DELETE FROM store_category_orders sco
  USING mapping m
  WHERE sco.category_name = m.old_name
    AND EXISTS (
      SELECT 1 FROM store_category_orders sco2
      WHERE sco2.store_id = sco.store_id
        AND sco2.category_name = m.new_name
    )
  RETURNING 1
)
UPDATE store_category_orders sco
SET category_name = m.new_name
FROM mapping m
WHERE sco.category_name = m.old_name;

-- ------------------------------------------------------------
-- Step E: Remove old English defaults from household_categories,
-- guarded so we never drop a definition still referenced by an item.
-- ------------------------------------------------------------
DELETE FROM household_categories hc
WHERE hc.name IN (
        'Produce','Dairy & Eggs','Meat & Seafood','Bakery','Frozen',
        'Pantry','Snacks','Beverages','Household','Personal Care',
        'Baby','Pet','Other'
      )
  AND NOT EXISTS (
    SELECT 1 FROM grocery_items gi
    WHERE gi.household_id = hc.household_id
      AND gi.category = hc.name
  );

-- ------------------------------------------------------------
-- Step F: Change the default for new grocery_items rows.
-- ------------------------------------------------------------
ALTER TABLE grocery_items
  ALTER COLUMN category SET DEFAULT 'Övrigt';
