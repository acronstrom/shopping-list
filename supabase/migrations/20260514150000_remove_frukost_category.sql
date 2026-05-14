-- ============================================================
-- Remove the "Frukost" category
--
-- Frukost was part of the original Swedish 17-category seed but
-- overlaps with Skafferi/Bröd/Mejeri and adds noise. Drop it from
-- household_categories and store_category_orders. Existing
-- grocery_items entries get re-categorized; historical
-- purchase_history rows get nulled (the category column there is
-- already nullable).
-- ============================================================

-- Re-categorize any live grocery items to 'Skafferi' so we don't
-- orphan them when Frukost goes away.
UPDATE grocery_items
   SET category = 'Skafferi'
 WHERE category = 'Frukost';

-- History rows can lose the label entirely.
UPDATE purchase_history
   SET category = NULL
 WHERE category = 'Frukost';

DELETE FROM store_category_orders
 WHERE category_name = 'Frukost';

DELETE FROM household_categories
 WHERE name = 'Frukost';
